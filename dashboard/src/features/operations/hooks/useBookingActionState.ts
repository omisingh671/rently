import { useEffect, useState } from "react";
import {
  getActionDefaults,
  type PendingAction,
  type RiskAction,
} from "../bookingActionLabels";
import type {
  AdminBooking,
  PaymentMethod,
  RoomMovePreview,
  RoomMovePricingAction,
} from "../types";

type ActionRoom = {
  id: string;
  unitId: string;
  unitNumber: string;
  number: string;
  status: string;
  isActive: boolean;
};

type UseBookingActionStateParams = {
  booking?: AdminBooking;
  rooms: ActionRoom[];
};

export function useBookingActionState({
  booking,
  rooms,
}: UseBookingActionStateParams) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReferenceId, setPaymentReferenceId] = useState("");
  const [paymentPayerDetail, setPaymentPayerDetail] = useState("");
  const [paymentPaidAt, setPaymentPaidAt] = useState("");
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("CASH");
  const [actionError, setActionError] = useState("");
  const [hasInitializedRoomIds, setHasInitializedRoomIds] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [roomMovePreview, setRoomMovePreview] =
    useState<RoomMovePreview | null>(null);
  const [roomMovePricingAction, setRoomMovePricingAction] =
    useState<RoomMovePricingAction>("CHARGE_DIFFERENCE");

  useEffect(() => {
    if (
      pendingAction?.type === "assignRoom" &&
      !hasInitializedRoomIds &&
      booking &&
      rooms.length > 0
    ) {
      const timer = setTimeout(() => {
        setSelectedRoomIds(getAssignedRoomIds(booking, rooms));
        setHasInitializedRoomIds(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pendingAction?.type, booking, rooms, hasInitializedRoomIds]);

  const openAction = (type: RiskAction, paymentId?: string) => {
    setActionError("");
    const nextAction = getActionDefaults(type);
    if (type === "assignRoom" && booking?.status === "CHECKED_IN") {
      nextAction.requiresNote = true;
      nextAction.message =
        booking.targetType === "UNIT"
          ? "Changing the assigned unit after check-in is exceptional. Confirm the change and add an audit note."
          : "Changing room after check-in is exceptional. Confirm the change and add an audit note.";
    }
    if (type === "assignRoom") {
      nextAction.requiresNote = true;
      if (booking?.targetType === "UNIT") {
        nextAction.title = "Change Assigned Unit";
        nextAction.message =
          "Select any room in the destination unit. All rooms in that unit will be selected and validated together.";
        nextAction.confirmLabel = "Confirm Unit Change";
      }
    }
    if (type === "assignRoom" && booking && booking.items.length > 1) {
      nextAction.title = "Change Assigned Rooms";
      nextAction.message = `Select exactly ${booking.items.length} rooms for this booking. Current rooms are preselected.`;
      nextAction.confirmLabel = "Confirm Room Changes";
    }
    if (type === "checkIn" && booking && Number(booking.balanceAmount) > 0) {
      nextAction.requiresNote = true;
      nextAction.message =
        "This booking still has balance due. Add an override note to continue check-in.";
    }
    if (type === "checkOut" && booking && Number(booking.balanceAmount) > 0) {
      nextAction.requiresNote = true;
      nextAction.message =
        "This folio has an outstanding balance. Only an Admin can check out with an audited override.";
    }
    setPendingAction(nextAction);
    setNote("");
    setIdentityVerified(false);
    setRoomMovePreview(null);
    setRoomMovePricingAction("CHARGE_DIFFERENCE");
    if (type === "assignRoom" && booking) {
      setHasInitializedRoomIds(false);
      setSelectedRoomIds(getAssignedRoomIds(booking, rooms));
    }
    if (type === "recordPayment" && booking) {
      setPaymentAmount(booking.balanceAmount);
      setPaymentMethod("CASH");
      setPaymentReferenceId("");
      setPaymentPayerDetail("");
      setPaymentPaidAt(new Date().toISOString().slice(0, 16));
    }
    if (type === "recordRefund" && booking && paymentId) {
      const payment = booking.payments.find((item) => item.id === paymentId);
      setRefundPaymentId(paymentId);
      setRefundAmount(payment?.refundableAmount ?? "");
      setRefundMethod(
        payment?.provider === "MANUAL" ? payment.method : "ONLINE_GATEWAY",
      );
    }
  };

  const closeAction = () => {
    setPendingAction(null);
    setNote("");
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setPaymentReferenceId("");
    setPaymentPayerDetail("");
    setPaymentPaidAt("");
    setRefundPaymentId("");
    setRefundAmount("");
    setRefundMethod("CASH");
    setSelectedRoomIds([]);
    setActionError("");
    setHasInitializedRoomIds(false);
    setIdentityVerified(false);
    setRoomMovePreview(null);
    setRoomMovePricingAction("CHARGE_DIFFERENCE");
  };

  const toggleAssignedRoom = (roomId: string) => {
    if (!booking) return;

    const requiredRoomCount = booking.items.length;
    setActionError("");
    setRoomMovePreview(null);

    if (booking.targetType === "UNIT") {
      const selectedRoom = rooms.find((room) => room.id === roomId);
      if (!selectedRoom) return;

      const unitRooms = rooms.filter(
        (room) => room.unitId === selectedRoom.unitId,
      );
      const unavailableRoom = unitRooms.find(
        (room) =>
          room.unitId !== booking.unitId &&
          (room.status !== "AVAILABLE" || !room.isActive),
      );
      if (unavailableRoom) {
        setActionError(
          `Unit ${selectedRoom.unitNumber} cannot be selected because room ${unavailableRoom.number} is not available.`,
        );
        return;
      }

      setSelectedRoomIds(unitRooms.map((room) => room.id));
      return;
    }

    if (requiredRoomCount === 1) {
      setSelectedRoomIds([roomId]);
      return;
    }

    const isSelected = selectedRoomIds.includes(roomId);
    if (isSelected && selectedRoomIds.length <= requiredRoomCount) {
      setActionError(
        `This booking requires exactly ${requiredRoomCount} rooms. Keep ${requiredRoomCount} rooms selected.`,
      );
      return;
    }

    setSelectedRoomIds((current) =>
      isSelected ? current.filter((id) => id !== roomId) : [...current, roomId],
    );
  };

  return {
    pendingAction,
    note,
    selectedRoomIds,
    paymentAmount,
    paymentMethod,
    paymentReferenceId,
    paymentPayerDetail,
    paymentPaidAt,
    refundPaymentId,
    refundAmount,
    refundMethod,
    actionError,
    identityVerified,
    roomMovePreview,
    roomMovePricingAction,
    setNote,
    setPaymentAmount,
    setPaymentMethod,
    setPaymentReferenceId,
    setPaymentPayerDetail,
    setPaymentPaidAt,
    setRefundAmount,
    setRefundMethod,
    setActionError,
    setIdentityVerified,
    setRoomMovePreview,
    setRoomMovePricingAction,
    openAction,
    closeAction,
    toggleAssignedRoom,
  };
}

function getAssignedRoomIds(booking: AdminBooking, rooms: ActionRoom[]) {
  if (booking.targetType === "UNIT" && booking.unitId) {
    return rooms
      .filter((room) => room.unitId === booking.unitId)
      .map((room) => room.id);
  }

  return booking.items
    .map((item) => item.roomId)
    .filter((roomId): roomId is string => roomId !== null);
}
