import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/common/StatusBadge";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  useBillingActions,
  useBookingBillingDocuments,
} from "@/features/billing/hooks";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { getRoomBoardApi } from "../api";
import { useAdminBooking } from "../hooks/useAdminOperations";
import type {
  AdminBooking,
  BookingStatus,
  FolioChargeType,
  PaymentMethod,
  RoomMovePreview,
  RoomMovePricingAction,
} from "../types";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiCreditCard,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiSlash,
  FiUser,
} from "react-icons/fi";

type RiskAction =
  | "assignRoom"
  | "checkIn"
  | "checkOut"
  | "cancel"
  | "noShow"
  | "statusOverride"
  | "recordPayment"
  | "recordRefund"
  | "rejectRefundRequest";

type PendingAction = {
  type: RiskAction;
  title: string;
  message: string;
  confirmLabel: string;
  status?: BookingStatus;
  requiresNote?: boolean;
};

type AssignmentRoom = {
  id: string;
  unitNumber: string;
  number: string;
  name: string;
  status: string;
  isActive: boolean;
  maxOccupancy: number;
  unitId: string;
};

const getMetadataString = (metadata: unknown, key: string) => {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
};

const bookingStatuses: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
];

const paymentMethods: PaymentMethod[] = [
  "CASH",
  "UPI_MANUAL",
  "BANK_TRANSFER",
  "CARD_POS",
  "MANUAL",
];

const refundMethods: PaymentMethod[] = [
  "CASH",
  "UPI_MANUAL",
  "BANK_TRANSFER",
  "CARD_POS",
  "MANUAL",
  "ONLINE_GATEWAY",
];

const paymentMethodsRequiringReference = new Set<PaymentMethod>([
  "UPI_MANUAL",
  "BANK_TRANSFER",
  "CARD_POS",
]);

const getPaymentMethodLabel = (method: PaymentMethod) => {
  if (method === "CARD_POS") return "Card / POS";
  return formatEnumLabel(method);
};

const getPaymentReferenceLabel = (method: PaymentMethod) => {
  if (method === "UPI_MANUAL") return "UPI transaction/reference ID";
  if (method === "BANK_TRANSFER") return "Bank UTR/reference number";
  if (method === "CARD_POS") return "POS/card machine transaction ID";
  return "Reference ID";
};

const getPayerDetailLabel = (method: PaymentMethod) => {
  if (method === "UPI_MANUAL") return "Payer UPI VPA";
  if (method === "BANK_TRANSFER") return "Bank account hint";
  if (method === "CARD_POS") return "Card last 4";
  return "Payer detail";
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatMoney = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

const getStayLabel = (booking: AdminBooking) => {
  const itemCount = Math.max(booking.items.length, 1);

  if (booking.bookingType === "MULTI_ROOM" || itemCount > 1) {
    return `${itemCount}-room stay`;
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit stay" : "Room stay";
  }

  return booking.productName;
};

const getAssignedLabel = (booking: AdminBooking) =>
  booking.items.length > 0
    ? booking.items.map((item) => item.targetLabel).join(" + ")
    : booking.targetLabel;

const hasAssignedTarget = (booking: AdminBooking) =>
  booking.items.length > 0 &&
  booking.items.every((item) => item.roomId !== null || item.unitId !== null);

const getActionDefaults = (action: RiskAction): PendingAction => {
  if (action === "checkIn") {
    return {
      type: action,
      title: "Confirm Check In",
      message:
        "This will mark the guest as checked in and write an audit entry.",
      confirmLabel: "Confirm Check In",
      status: "CHECKED_IN",
    };
  }

  if (action === "checkOut") {
    return {
      type: action,
      title: "Confirm Check Out",
      message: "This will close the active stay and write an audit entry.",
      confirmLabel: "Confirm Check Out",
      status: "CHECKED_OUT",
    };
  }

  if (action === "cancel") {
    return {
      type: action,
      title: "Cancel Booking",
      message: "This will cancel the booking and write an audit entry.",
      confirmLabel: "Cancel Booking",
      status: "CANCELLED",
      requiresNote: true,
    };
  }

  if (action === "noShow") {
    return {
      type: action,
      title: "Mark No-Show",
      message:
        "This will mark the guest as no-show and close normal check-in actions.",
      confirmLabel: "Mark No-Show",
      status: "NO_SHOW",
      requiresNote: true,
    };
  }

  if (action === "statusOverride") {
    return {
      type: action,
      title: "Correct Booking Status",
      message:
        "Use this only to fix an operational mistake. The correction will be audited.",
      confirmLabel: "Apply Correction",
      requiresNote: true,
    };
  }

  if (action === "recordPayment") {
    return {
      type: action,
      title: "Record Balance Payment",
      message:
        "This will add a successful balance payment and update the booking payment status.",
      confirmLabel: "Record Payment",
    };
  }

  if (action === "recordRefund") {
    return {
      type: action,
      title: "Record Refund",
      message:
        "This records returned money against the selected original payment. Manual refunds must already be returned outside the system.",
      confirmLabel: "Record Refund",
      requiresNote: true,
    };
  }

  if (action === "rejectRefundRequest") {
    return {
      type: action,
      title: "Reject Refund Request",
      message:
        "This closes the guest refund request without recording returned money. Add a clear admin note for the guest.",
      confirmLabel: "Reject Request",
      requiresNote: true,
    };
  }

  return {
    type: action,
    title: "Change Assigned Room",
    message:
      "This will change the room used for this stay. The backend will reject unavailable rooms.",
    confirmLabel: "Confirm Room Change",
  };
};

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canOverrideCheckedInRoom = useAuthStore((state) =>
    state.hasAnyRole(["SUPER_ADMIN", "ADMIN"]),
  );
  const canUseAdminCorrection = useAuthStore((state) =>
    state.hasAnyRole(["SUPER_ADMIN", "ADMIN"]),
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] =
    useState<BookingStatus>("PENDING");
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
  const [activeSummaryTab, setActiveSummaryTab] = useState<"booking" | "payment">("booking");

  const {
    data: booking,
    isPending,
    isFetching,
    isError,
    error,
    updateBooking,
    checkInBooking,
    checkOutBooking,
    markNoShow,
    moveRooms,
    previewRoomMove,
    isPreviewingRoomMove,
    correctStatus,
    createFolioCharge,
    voidFolioCharge,
    recordBalancePayment,
    recordRefund,
    updateRefundRequest,
    isMutating,
  } = useAdminBooking(id);
  const billingDocumentsQuery = useBookingBillingDocuments(
    booking?.id,
    booking?.propertyId,
  );
  const billingActions = useBillingActions();
  const billingDocuments = billingDocumentsQuery.data ?? [];
  const invoiceDocument = billingDocuments.find(
    (document) => document.type === "INVOICE",
  );
  const receiptByPaymentId = new Map(
    billingDocuments
      .filter((document) => document.type === "RECEIPT" && document.paymentId)
      .map((document) => [document.paymentId, document]),
  );
  const isBillingMutating = billingActions.isMutating;
  const canGenerateInvoice =
    booking !== undefined && Number(booking.balanceAmount) <= 0;
  const handleBillingError = (err: unknown) => {
    setActionError(normalizeApiError(err).message);
  };

  const roomsQuery = useQuery({
    queryKey: booking
      ? ADMIN_KEYS.operations.roomBoard({
          propertyId: booking.propertyId,
          from: booking.checkIn,
          to: booking.checkOut,
        })
      : ADMIN_KEYS.operations.all(),
    queryFn: async () => {
      if (!booking) throw new Error("Booking required");
      return getRoomBoardApi(booking.propertyId, {
        from: booking.checkIn,
        to: booking.checkOut,
      });
    },
    enabled: !!booking,
  });

  const rooms = useMemo(
    () =>
      roomsQuery.data?.units.flatMap((unit) =>
        unit.rooms.map((room) => ({
          id: room.roomId,
          unitNumber: room.unitNumber,
          number: room.roomNumber,
          name: room.roomName,
          status: room.boardStatus,
          isActive: room.isActive,
          maxOccupancy: room.maxOccupancy,
          unitId: room.unitId,
        })),
      ) ?? [],
    [roomsQuery.data?.units],
  );

  useEffect(() => {
    if (pendingAction?.type === "assignRoom" && !hasInitializedRoomIds && booking && rooms.length > 0) {
      let initialSelectedRoomIds: string[] = [];
      if (booking.targetType === "UNIT" && booking.unitId) {
        initialSelectedRoomIds = rooms
          .filter((room) => room.unitId === booking.unitId)
          .map((room) => room.id);
      } else {
        initialSelectedRoomIds = booking.items
          .map((item) => item.roomId)
          .filter((roomId): roomId is string => roomId !== null);
      }
      const timer = setTimeout(() => {
        setSelectedRoomIds(initialSelectedRoomIds);
        setHasInitializedRoomIds(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pendingAction?.type, booking, rooms, hasInitializedRoomIds]);

  useEffect(() => {
    if (
      pendingAction?.type !== "assignRoom" ||
      !booking ||
      selectedRoomIds.length === 0 ||
      (booking.targetType !== "UNIT" &&
        selectedRoomIds.length !== booking.items.length)
    ) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      void previewRoomMove({
        expectedVersion: booking.version,
        roomIds: selectedRoomIds,
      })
        .then((preview) => {
          if (active) {
            setRoomMovePreview(preview);
            setActionError("");
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setRoomMovePreview(null);
            setActionError(normalizeApiError(err).message);
          }
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    pendingAction?.type,
    booking,
    selectedRoomIds,
    previewRoomMove,
  ]);

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
      let initialSelectedRoomIds: string[] = [];
      if (booking.targetType === "UNIT" && booking.unitId) {
        initialSelectedRoomIds = rooms
          .filter((room) => room.unitId === booking.unitId)
          .map((room) => room.id);
      } else {
        initialSelectedRoomIds = booking.items
          .map((item) => item.roomId)
          .filter((roomId): roomId is string => roomId !== null);
      }
      setSelectedRoomIds(initialSelectedRoomIds);
    }
    if (type === "statusOverride" && booking) {
      setSelectedStatus(booking.status);
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

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!booking || !pendingAction) return;

    try {
      setActionError("");

      if (pendingAction.type === "assignRoom") {
        const requiredRoomCount =
          booking.targetType === "UNIT"
            ? selectedRoomIds.length
            : booking.items.length;
        if (selectedRoomIds.length !== requiredRoomCount) {
          setActionError(
            `This booking requires exactly ${requiredRoomCount} rooms. Keep ${requiredRoomCount} rooms selected.`,
          );
          return;
        }

        if (pendingAction.requiresNote && !note.trim()) {
          setActionError("Note is required for this action.");
          return;
        }
        if (!roomMovePreview) {
          setActionError("Review the room move pricing before confirming.");
          return;
        }

        await moveRooms({
          expectedVersion: booking.version,
          roomIds: selectedRoomIds,
          note: note.trim(),
          pricingFingerprint: roomMovePreview.pricingFingerprint,
          expectedAdjustmentAmount: Number(roomMovePreview.totalAdjustment),
          pricingAction: roomMovePricingAction,
        });
      } else if (pendingAction.type === "recordPayment") {
        const amount = Number(paymentAmount);
        const balanceAmount = Number(booking.balanceAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          setActionError("Enter a valid payment amount.");
          return;
        }
        if (amount > balanceAmount) {
          setActionError(
            `Payment amount cannot exceed the current balance of ${formatMoney(booking.balanceAmount)}.`,
          );
          return;
        }
        const requiresPaymentReference =
          paymentMethodsRequiringReference.has(paymentMethod);
        if (requiresPaymentReference && !paymentReferenceId.trim()) {
          setActionError("Reference ID is required for this payment method.");
          return;
        }

        await recordBalancePayment({
          amount,
          method: paymentMethod,
          ...(requiresPaymentReference && paymentReferenceId.trim()
            ? { referenceId: paymentReferenceId.trim() }
            : {}),
          ...(requiresPaymentReference && paymentPayerDetail.trim()
            ? { payerDetail: paymentPayerDetail.trim() }
            : {}),
          ...(note.trim() && { note: note.trim() }),
          ...(paymentPaidAt && {
            paidAt: new Date(paymentPaidAt).toISOString(),
          }),
        });
      } else if (pendingAction.type === "recordRefund") {
        const amount = Number(refundAmount);
        if (!refundPaymentId) {
          setActionError("Select a payment before recording refund.");
          return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          setActionError("Enter a valid refund amount.");
          return;
        }
        if (!note.trim()) {
          setActionError("Refund reason is required.");
          return;
        }

        await recordRefund({
          paymentId: refundPaymentId,
          amount,
          method: refundMethod,
          reason: note.trim(),
          ...(booking.refundRequest &&
            (booking.refundRequest.status === "REQUESTED" ||
              booking.refundRequest.status === "IN_REVIEW") && {
              refundRequestId: booking.refundRequest.id,
            }),
        });
      } else if (pendingAction.type === "rejectRefundRequest") {
        if (!booking.refundRequest) {
          setActionError("No refund request is active for this booking.");
          return;
        }
        if (!note.trim()) {
          setActionError("Admin note is required to reject a refund request.");
          return;
        }

        await updateRefundRequest({
          requestId: booking.refundRequest.id,
          payload: {
            status: "REJECTED",
            adminNote: note.trim(),
          },
        });
      } else if (pendingAction.type === "statusOverride") {
        if (!note.trim()) {
          setActionError("Audit note is required for status correction.");
          return;
        }

        await correctStatus({
          expectedVersion: booking.version,
          status: selectedStatus,
          note: note.trim(),
        });
      } else if (pendingAction.type === "checkIn") {
        if (!identityVerified) {
          setActionError("Confirm that guest identity was verified.");
          return;
        }
        if (pendingAction.requiresNote && !note.trim()) {
          setActionError("Note is required for this action.");
          return;
        }
        await checkInBooking({
          expectedVersion: booking.version,
          identityVerified: true,
          ...(Number(booking.balanceAmount) > 0 && {
            allowBalanceDueCheckIn: true,
          }),
          ...(note.trim() && { note: note.trim() }),
        });
      } else if (pendingAction.type === "checkOut") {
        if (pendingAction.requiresNote && !note.trim()) {
          setActionError("Audit note is required for balance override.");
          return;
        }
        await checkOutBooking({
          expectedVersion: booking.version,
          ...(Number(booking.balanceAmount) > 0 && {
            allowBalanceDueCheckout: true,
          }),
          ...(note.trim() && { note: note.trim() }),
        });
      } else if (pendingAction.type === "noShow") {
        await markNoShow({
          expectedVersion: booking.version,
          note: note.trim(),
        });
      } else if (pendingAction.status) {
        await updateBooking({
          status: pendingAction.status,
          ...(note.trim() && { note: note.trim() }),
        });
      }

      closeAction();
    } catch (err) {
      setActionError(normalizeApiError(err).message);
    }
  };

  const canCheckIn =
    booking?.status === "CONFIRMED" &&
    booking !== undefined &&
    hasAssignedTarget(booking);
  const canCheckOut = booking?.status === "CHECKED_IN";
  const canAdminCancelAfterCheckIn =
    booking?.status === "CHECKED_IN" && canUseAdminCorrection;
  const canCancel =
    booking?.status === "PENDING" ||
    booking?.status === "CONFIRMED" ||
    canAdminCancelAfterCheckIn;
  const canMarkNoShow =
    booking?.status === "CONFIRMED" && booking.noShowEligible;
  const canRecordBalance =
    booking !== undefined &&
    Number(booking.balanceAmount) > 0 &&
    booking.status !== "CANCELLED" &&
    booking.status !== "NO_SHOW" &&
    booking.status !== "CHECKED_OUT" &&
    (booking.status === "CHECKED_IN" || !booking.isCheckInDatePassed);
  const canShowRefunds =
    booking !== undefined &&
    (booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
    (Number(booking.paidAmount) > 0 || booking.refundRequest !== null);
  const canActOnRefundRequest =
    booking?.refundRequest !== null &&
    booking?.refundRequest !== undefined &&
    (booking.refundRequest.status === "REQUESTED" ||
      booking.refundRequest.status === "IN_REVIEW") &&
    Number(booking.refundableAmount) > 0;
  const canAssignRoom =
    booking !== undefined &&
    booking.status !== "CHECKED_OUT" &&
    booking.status !== "CANCELLED" &&
    booking.status !== "NO_SHOW" &&
    (booking.status === "CHECKED_IN" ||
      booking.status === "CONFIRMED" ||
      !booking.isCheckInDatePassed);
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

  if (isPending) {
    return <PageState message="Loading booking details..." />;
  }

  if (isError || !booking) {
    return (
      <PageState
        message={normalizeApiError(error).message || "Could not load booking."}
        isError
      />
    );
  }

  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6">
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<FiArrowLeft />}
          onClick={() => navigate(adminPath(ADMIN_ROUTES.BOOKINGS))}
        >
          Bookings
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {booking.bookingRef}
            </h2>
            <StatusBadge status={booking.status} />
          </div>
          <div className="text-sm font-semibold text-slate-650 flex flex-wrap items-center gap-1.5">
            <span className="text-indigo-650 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-0.5 text-xs">{booking.propertyName}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-xs">{getStayLabel(booking)}</span>
            {isFetching && <span className="text-slate-400 text-xs animate-pulse">(refreshing...)</span>}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50/70 border border-slate-200/50 rounded-lg p-3 shrink-0">
          <div className="text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-In</span>
            <span className="font-bold text-slate-800 text-sm">{formatDate(booking.checkIn)}</span>
          </div>
          <div className="flex flex-col items-center shrink-0 min-w-16">
            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              {nights} {nights === 1 ? "night" : "nights"}
            </span>
            <div className="w-full h-0.5 bg-slate-300 relative mt-1.5">
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400"></div>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            </div>
          </div>
          <div className="text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-Out</span>
            <span className="font-bold text-slate-800 text-sm">{formatDate(booking.checkOut)}</span>
          </div>
        </div>
      </div>

      {Number(booking.balanceAmount) > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50/15 px-4 py-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <FiAlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-amber-950">Outstanding Balance Due</div>
              <div className="text-xs text-amber-800 font-semibold mt-0.5">
                This folio has an unpaid balance of <span className="font-bold text-amber-950">{formatMoney(booking.balanceAmount)}</span>. Please collect the payment before or during check-in.
              </div>
            </div>
          </div>
          {canRecordBalance && (
            <Button
              type="button"
              size="sm"
              variant="warning"
              disabled={isMutating}
              onClick={() => openAction("recordPayment")}
              className="shrink-0 font-bold"
            >
              Collect {formatMoney(booking.balanceAmount)}
            </Button>
          )}
        </div>
      )}

      {(actionError || roomsQuery.isError) && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError || "Could not load rooms for assignment."}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[7fr_3fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSummaryTab("booking")}
                className={`pb-3 text-sm font-semibold transition-all border-b-2 px-4 cursor-pointer -mb-px flex items-center gap-1.5 ${
                  activeSummaryTab === "booking"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FiUser className="h-4 w-4 shrink-0" />
                <span>Booking Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSummaryTab("payment")}
                className={`pb-3 text-sm font-semibold transition-all border-b-2 px-4 cursor-pointer -mb-px flex items-center gap-1.5 ${
                  activeSummaryTab === "payment"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FiCreditCard className="h-4 w-4 shrink-0" />
                <span>Payment & Billing</span>
              </button>
            </div>

            <div className="mt-4">
              {activeSummaryTab === "booking" ? (
                <div className="overflow-x-auto mt-3">
                  <table className="min-w-full text-sm">
                    <tbody>
                      <SummaryRow label="Guest Name" value={booking.guestNameSnapshot} />
                      <SummaryRow label="Guest Email" value={booking.guestEmailSnapshot} />
                      <SummaryRow label="Contact Number" value={booking.guestContactSnapshot ?? "Not provided"} />
                      <SummaryRow label="Guest Count" value={`${booking.guestCount} guests`} />
                      <SummaryRow label="Check-In Date" value={formatDate(booking.checkIn)} />
                      <SummaryRow label="Check-Out Date" value={formatDate(booking.checkOut)} />
                      <SummaryRow label="Stay Type / Product" value={getStayLabel(booking)} />
                      <SummaryRow label="Assigned Room/Unit" value={getAssignedLabel(booking)} />
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto mt-3">
                    <table className="min-w-full text-sm">
                      <tbody>
                        <SummaryRow label="Subtotal" value={formatMoney(booking.subtotalAmount)} />
                        <SummaryRow label="Discount" value={formatMoney(booking.discountAmount)} />
                        <SummaryRow label="Tax" value={formatMoney(booking.taxAmount)} />
                        <SummaryRow
                          label="Total Amount"
                          value={formatMoney(booking.totalAmount)}
                          className="bg-indigo-50/20 text-indigo-950 font-bold"
                        />
                        <SummaryRow
                          label="Paid Amount"
                          value={formatMoney(booking.paidAmount)}
                          className="bg-emerald-50/15 text-emerald-950 font-bold"
                        />
                        <SummaryRow
                          label="Refunded"
                          value={formatMoney(booking.refundedAmount)}
                          className={Number(booking.refundedAmount) > 0 ? "bg-amber-50/25 text-amber-950" : ""}
                        />
                        <SummaryRow label="Net Paid" value={formatMoney(booking.netPaidAmount)} />
                        <SummaryRow label="Refundable" value={formatMoney(booking.refundableAmount)} />
                        <SummaryRow
                          label="Balance Due"
                          value={
                            <div className="flex items-center justify-between gap-1.5">
                              <span>{formatMoney(booking.balanceAmount)}</span>
                              {Number(booking.balanceAmount) <= 0 ? (
                                <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 border border-emerald-200">
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-800 border border-rose-200 animate-pulse">
                                  Due
                                </span>
                              )}
                            </div>
                          }
                          className={Number(booking.balanceAmount) > 0
                            ? "bg-rose-50/20 text-rose-950 font-extrabold"
                            : "bg-emerald-50/25 text-emerald-950 font-extrabold"
                          }
                        />
                        <SummaryRow label="Token expected" value={formatMoney(booking.upfrontAmount)} />
                        <SummaryRow label="Payment status" value={formatEnumLabel(booking.paymentStatus)} />
                        <SummaryRow label="Payment policy" value={formatEnumLabel(booking.paymentPolicy)} />
                        <SummaryRow label="Coupon used" value={booking.couponCode ?? "None"} />
                      </tbody>
                    </table>
                  </div>

                  {booking.taxBreakdown.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm">
                      <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Tax breakdown
                      </div>
                      <div className="space-y-2">
                        {booking.taxBreakdown.map((tax) => (
                          <div
                            key={`${tax.taxId}-${tax.included ? "included" : "exclusive"}`}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-slate-600 font-semibold">
                              {tax.name} {tax.included ? "(included)" : ""}
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatMoney(String(tax.taxAmount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <FolioSection
            booking={booking}
            isMutating={isMutating}
            onCreate={createFolioCharge}
            onVoid={(chargeId, reason) =>
              voidFolioCharge({
                chargeId,
                payload: {
                  expectedVersion: booking.version,
                  note: reason,
                },
              })
            }
          />

          <InternalNotesSection
            key={booking.id}
            initialValue={booking.internalNotes ?? ""}
            isMutating={isMutating}
            onSave={(value) =>
              updateBooking({
                internalNotes: value.trim().length > 0 ? value.trim() : null,
              })
            }
          />

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Status History
            </h3>
            <div className="mt-4 divide-y divide-slate-100">
              {booking.statusHistory.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">No audit history yet.</p>
              ) : (
                booking.statusHistory.map((event) => (
                  <div
                    key={event.id}
                    className="py-4 first:pt-0 last:pb-0 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.toStatus} />
                      <span className="text-xs text-slate-400 font-medium">
                        {event.fromStatus
                          ? `from ${formatEnumLabel(event.fromStatus)}`
                          : "initial status"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTime(event.createdAt)} by{" "}
                      <span className="font-semibold text-slate-700">
                        {event.actorName ?? "System"}
                      </span>
                    </div>
                    {event.note && (
                      <p className="mt-2 text-xs text-slate-600 font-medium italic border-l-2 border-slate-200 pl-3.5 py-0.5">
                        "{event.note}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {booking.operationEvents.some(
            (event) => event.eventType === "ROOM_MOVE",
          ) && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">
                Room and Unit Changes
              </h3>
              <div className="mt-4 divide-y divide-slate-100">
                {booking.operationEvents
                  .filter((event) => event.eventType === "ROOM_MOVE")
                  .map((event) => {
                    const waivedAmount = getMetadataString(
                      event.metadata,
                      "waivedAmount",
                    );
                    const totalAdjustment = getMetadataString(
                      event.metadata,
                      "totalAdjustment",
                    );
                    const pricingAction = getMetadataString(
                      event.metadata,
                      "pricingAction",
                    );
                    return (
                      <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-semibold text-slate-800">
                            {pricingAction === "COMPLIMENTARY_UPGRADE"
                              ? `Complimentary upgrade: ${formatMoney(waivedAmount ?? "0")} waived`
                              : `Assignment changed${Number(totalAdjustment) > 0 ? `: ${formatMoney(totalAdjustment ?? "0")} added` : ""}`}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {event.note ?? "No audit note"} by{" "}
                          {event.actorName ?? "System"}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Operational Actions
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage guest stay lifecycle and room allocations.
              </p>
            </div>

            <div className="grid gap-2.5">
              {canCheckIn && (
                <ActionButton
                  theme="emerald"
                  icon={<FiLogIn />}
                  disabled={isMutating}
                  onClick={() => openAction("checkIn")}
                >
                  Check In
                </ActionButton>
              )}
              {canCheckOut && (
                <ActionButton
                  theme="slate"
                  icon={<FiLogOut />}
                  disabled={isMutating}
                  onClick={() => openAction("checkOut")}
                >
                  Check Out
                </ActionButton>
              )}
              {canRecordBalance && (
                <ActionButton
                  theme="indigo"
                  icon={<FiCreditCard />}
                  disabled={isMutating}
                  onClick={() => openAction("recordPayment")}
                >
                  Record Balance Payment
                </ActionButton>
              )}
              {canAssignRoom && (
                <ActionButton
                  theme="sky"
                  icon={<FiHome />}
                  disabled={isMutating}
                  onClick={() => openAction("assignRoom")}
                >
                  {booking.items.length > 1
                    ? "Change Rooms"
                    : booking.targetType === "UNIT"
                      ? "Change Unit"
                      : booking.roomId !== null
                      ? "Change Room"
                      : "Assign Room"}
                </ActionButton>
              )}
              {canUseAdminCorrection && (
                <ActionButton
                  theme="orange"
                  icon={<FiEdit3 />}
                  disabled={isMutating}
                  onClick={() => openAction("statusOverride")}
                >
                  Fix Status Mistake
                </ActionButton>
              )}
              {canMarkNoShow && (
                <ActionButton
                  theme="amber"
                  icon={<FiAlertTriangle />}
                  disabled={isMutating}
                  onClick={() => openAction("noShow")}
                >
                  Mark No-Show
                </ActionButton>
              )}
              {canCancel && (
                <ActionButton
                  theme="rose"
                  icon={<FiSlash />}
                  disabled={isMutating}
                  onClick={() => openAction("cancel")}
                >
                  Cancel Booking
                </ActionButton>
              )}
            </div>

            {booking.status === "CONFIRMED" && booking.noShowEligible && (
              <div className="mt-3 rounded-md bg-amber-50/60 border border-amber-250 p-2 text-xs font-semibold text-amber-850 flex items-center gap-1.5">
                <FiAlertTriangle className="text-amber-500" />
                <span>No-show eligible</span>
              </div>
            )}
            {booking.status === "CHECKED_IN" && !canOverrideCheckedInRoom && (
              <p className="mt-3 text-xs text-slate-500 leading-normal italic">
                Room changes after check-in require confirmation and an audit note.
              </p>
            )}
            {(booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
              Number(booking.refundableAmount) > 0 && (
                <div className="mt-3 rounded-md bg-indigo-50/60 border border-indigo-250 p-2 text-xs font-semibold text-indigo-850 flex items-center gap-1.5 animate-pulse">
                  <span>Refundable balance: {formatMoney(booking.refundableAmount)}</span>
                </div>
              )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Current Assignment
            </h3>
            <div className="mt-4 flex items-center gap-3.5 text-slate-700">
              <span className="rounded-lg bg-slate-100 p-2 text-slate-600 shrink-0">
                <FiHome size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Assigned Unit & Room
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {getAssignedLabel(booking)}
                </span>
              </div>
            </div>
          </section>

          {canShowRefunds && (
            <div className="rounded-xl border border-amber-200 bg-linear-to-r from-amber-50/80 to-orange-50/50 p-5 shadow-sm">
              <div className="flex gap-3.5 items-start">
                <span className="rounded-lg bg-amber-100 p-2 text-amber-700 shrink-0">
                  <FiAlertTriangle size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                    Refund Request
                  </span>
                  {booking.refundRequest ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">
                          Guest requested a refund
                        </h4>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            booking.refundRequest.status === "REQUESTED"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : booking.refundRequest.status === "IN_REVIEW"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : booking.refundRequest.status === "FULFILLED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {formatEnumLabel(booking.refundRequest.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium italic border-l-2 border-amber-400 pl-3 py-0.5 my-1.5 bg-amber-500/5 rounded-r">
                        "{booking.refundRequest.reason}"
                      </p>
                      {booking.refundRequest.adminNote && (
                        <p className="text-xs text-amber-800 font-medium">
                          <span className="font-semibold">Admin Note:</span>{" "}
                          {booking.refundRequest.adminNote}
                        </p>
                      )}
                    </div>
                  ) : Number(booking.refundableAmount) > 0 ? (
                    <p className="text-xs text-slate-600">
                      No active guest refund request. Admin can still record a
                      manual refund.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 font-medium">
                      Refund has been fully completed.
                    </p>
                  )}
                </div>
              </div>

              {canActOnRefundRequest && (
                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-amber-200/50 pt-4">
                  {booking.refundRequest!.status === "REQUESTED" && (
                    <Button
                      type="button"
                      size="md"
                      variant="secondary"
                      disabled={isMutating}
                      onClick={() => {
                        void updateRefundRequest({
                          requestId: booking.refundRequest!.id,
                          payload: { status: "IN_REVIEW" },
                        }).catch((err: unknown) => {
                          setActionError(normalizeApiError(err).message);
                        });
                      }}
                    >
                      Mark In Review
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="md"
                    variant="danger"
                    outline
                    disabled={isMutating}
                    onClick={() => openAction("rejectRefundRequest")}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Recorded Payments
            </h3>
            <div className="mt-4 divide-y divide-slate-200">
              {booking.payments.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">No payments recorded.</p>
              ) : (
                booking.payments.map((payment) => {
                  const isSucceeded = payment.status === "SUCCEEDED";
                  const isFailed = payment.status === "FAILED";
                  const isPending = payment.status === "PENDING";
                  return (
                    <div
                      key={payment.id}
                      className="py-5 first:pt-0 last:pb-0 transition duration-150"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xl font-bold text-slate-900 tracking-tight">
                          {formatMoney(payment.amount)}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                            isSucceeded
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : isFailed
                                ? "bg-rose-50 text-rose-700 border-rose-200/60"
                                : isPending
                                  ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {formatEnumLabel(payment.status)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[9px] tracking-wider uppercase">
                          {formatEnumLabel(payment.purpose)}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[9px] tracking-wider uppercase">
                          {getPaymentMethodLabel(payment.method)}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          {formatDateTime(payment.paidAt ?? payment.createdAt)}
                        </span>
                      </div>

                      {(payment.referenceId || payment.payerDetail) && (
                        <div className="mt-3 grid gap-2 border-l-2 border-slate-200 pl-3.5 py-0.5 text-xs text-slate-600 sm:grid-cols-2">
                          {payment.referenceId && (
                            <div>
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Reference
                              </span>
                              <span className="mt-0.5 block font-semibold text-slate-800">
                                {payment.referenceId}
                              </span>
                            </div>
                          )}
                          {payment.payerDetail && (
                            <div>
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Payer detail
                              </span>
                              <span className="mt-0.5 block font-semibold text-slate-800">
                                {payment.payerDetail}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Refunded:</span>
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {formatMoney(payment.refundedAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Refundable:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${Number(payment.refundableAmount) > 0 ? "text-amber-800 bg-amber-50" : "text-slate-800 bg-slate-100"}`}
                          >
                            {formatMoney(payment.refundableAmount)}
                          </span>
                        </div>
                      </div>

                      {payment.refunds.length > 0 && (
                        <div className="mt-3.5 space-y-2 border-l-2 border-amber-200 pl-3.5 py-0.5 text-xs text-slate-600">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80 mb-1">
                            Refund Transactions
                          </div>
                          {payment.refunds.map((refund) => (
                            <div
                              key={refund.id}
                              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 last:border-0 pb-1.5 last:pb-0"
                            >
                              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                {getPaymentMethodLabel(refund.method)} refund /{" "}
                                {formatEnumLabel(refund.status)}
                              </span>
                              <span className="font-bold text-amber-800">
                                -{formatMoney(refund.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {payment.status === "SUCCEEDED" && (
                        <div className="mt-4 flex flex-wrap gap-2 pt-1">
                          {receiptByPaymentId.get(payment.id) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              icon={<FiDownload />}
                              disabled={isBillingMutating}
                              onClick={() => {
                                const receipt = receiptByPaymentId.get(
                                  payment.id,
                                );
                                if (receipt) {
                                  setActionError("");
                                  void billingActions
                                    .downloadDocument(receipt)
                                    .catch(handleBillingError);
                                }
                              }}
                            >
                              Receipt
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              icon={<FiFileText />}
                              disabled={isBillingMutating}
                              onClick={() => {
                                setActionError("");
                                void billingActions
                                  .generateReceipt(payment.id)
                                  .catch(handleBillingError);
                              }}
                            >
                              Generate Receipt
                            </Button>
                          )}
                          {(booking.status === "CANCELLED" ||
                            booking.status === "NO_SHOW") &&
                            Number(payment.refundableAmount) > 0 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="warning"
                                icon={<FiCreditCard />}
                                disabled={isMutating}
                                onClick={() =>
                                  openAction("recordRefund", payment.id)
                                }
                              >
                                {payment.provider === "MANUAL"
                                  ? "Record Manual Refund"
                                  : "Process Gateway Refund"}
                              </Button>
                            )}
                        </div>
                      )}

                      {payment.note && (
                        <p className="mt-3.5 text-xs font-medium text-slate-500 border-l-2 border-slate-200 pl-3.5 py-0.5">
                          <span className="font-semibold text-slate-700">
                            Note:{" "}
                          </span>
                          {payment.note}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Billing Documents
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Frozen invoice and receipt snapshots for this booking.
                </p>
              </div>
              {invoiceDocument ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={<FiDownload />}
                  disabled={isBillingMutating}
                  onClick={() => {
                    setActionError("");
                    void billingActions
                      .downloadDocument(invoiceDocument)
                      .catch(handleBillingError);
                  }}
                >
                  Download Invoice
                </Button>
              ) : !canGenerateInvoice ? (
                <p className="text-right text-xs text-slate-500">
                  Full payment is required before invoice generation.
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  icon={<FiFileText />}
                  disabled={isBillingMutating}
                  onClick={() => {
                    if (booking) {
                      setActionError("");
                      void billingActions
                        .generateInvoice(booking.id)
                        .catch(handleBillingError);
                    }
                  }}
                >
                  Generate Invoice
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {billingDocumentsQuery.isPending ? (
                <p className="text-sm text-slate-500">Loading documents...</p>
              ) : billingDocuments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No billing documents generated yet.
                </p>
              ) : (
                billingDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {document.documentNumber}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {formatEnumLabel(document.type)} /{" "}
                        {formatEnumLabel(document.status)}{" "}
                        / {formatMoney(document.total)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={<FiDownload />}
                      disabled={isBillingMutating}
                      onClick={() => {
                        setActionError("");
                        void billingActions
                          .downloadDocument(document)
                          .catch(handleBillingError);
                      }}
                    >
                      Download
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmationModal
        action={pendingAction}
        note={note}
        selectedRoomIds={selectedRoomIds}
        assignedRoomIds={
          booking.targetType === "UNIT" && booking.unitId
            ? rooms.filter((r) => r.unitId === booking.unitId).map((r) => r.id)
            : booking.items
                .map((item) => item.roomId)
                .filter((roomId): roomId is string => roomId !== null)
        }
        requiredRoomCount={
          booking.targetType === "UNIT"
            ? selectedRoomIds.length
            : booking.items.length
        }
        selectedStatus={selectedStatus}
        paymentAmount={paymentAmount}
        paymentMethod={paymentMethod}
        paymentReferenceId={paymentReferenceId}
        paymentPayerDetail={paymentPayerDetail}
        paymentPaidAt={paymentPaidAt}
        refundAmount={refundAmount}
        refundMethod={refundMethod}
        rooms={rooms}
        isSubmitting={isMutating || isPreviewingRoomMove}
        errorMessage={actionError}
        roomMovePreview={roomMovePreview}
        roomMovePricingAction={roomMovePricingAction}
        onRoomMovePricingActionChange={setRoomMovePricingAction}
        onNoteChange={setNote}
        onRoomToggle={toggleAssignedRoom}
        onStatusChange={setSelectedStatus}
        onPaymentAmountChange={setPaymentAmount}
        onPaymentMethodChange={setPaymentMethod}
        onPaymentReferenceIdChange={setPaymentReferenceId}
        onPaymentPayerDetailChange={setPaymentPayerDetail}
        onPaymentPaidAtChange={setPaymentPaidAt}
        onRefundAmountChange={setRefundAmount}
        onRefundMethodChange={setRefundMethod}
        identityVerified={identityVerified}
        onIdentityVerifiedChange={setIdentityVerified}
        onClose={closeAction}
        onSubmit={submitAction}
      />
    </div>
  );
}

function PageState({
  message,
  isError = false,
}: {
  message: string;
  isError?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className={isError ? "text-red-700" : "text-slate-500"}>{message}</p>
    </div>
  );
}



function SummaryRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`transition-all hover:bg-slate-50/20 border-b border-slate-500/30 last:border-0 ${className}`}>
      <td className="px-6 py-4 font-medium text-slate-500 text-sm w-2/5 whitespace-nowrap">
        {label}
      </td>
      <td className="px-6 py-4 font-semibold text-slate-900 text-sm">{value}</td>
    </tr>
  );
}

function InternalNotesSection({
  initialValue,
  isMutating,
  onSave,
}: {
  initialValue: string;
  isMutating: boolean;
  onSave: (value: string) => Promise<AdminBooking>;
}) {
  const [value, setValue] = useState(initialValue);
  const [errorMessage, setErrorMessage] = useState("");

  const saveInternalNotes = async () => {
    try {
      setErrorMessage("");
      await onSave(value);
    } catch (err) {
      setErrorMessage(normalizeApiError(err).message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">
          Internal Notes
        </h3>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<FiEdit3 />}
          disabled={isMutating}
          onClick={() => void saveInternalNotes()}
        >
          Save notes
        </Button>
      </div>
      <textarea
        value={value}
        maxLength={5000}
        disabled={isMutating}
        onChange={(event) => setValue(event.target.value)}
        className="mt-4 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        placeholder="Add internal notes for operations..."
      />
      {errorMessage && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
    </section>
  );
}

function FolioSection({
  booking,
  isMutating,
  onCreate,
  onVoid,
}: {
  booking: AdminBooking;
  isMutating: boolean;
  onCreate: (payload: {
    expectedVersion: number;
    type: FolioChargeType;
    description: string;
    amount: number;
    note?: string;
  }) => Promise<AdminBooking>;
  onVoid: (chargeId: string, reason: string) => Promise<AdminBooking>;
}) {
  const [type, setType] = useState<FolioChargeType>("INCIDENTAL");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [voidChargeId, setVoidChargeId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const addCharge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Enter a description and valid positive amount.");
      return;
    }
    try {
      setErrorMessage("");
      await onCreate({
        expectedVersion: booking.version,
        type,
        description: description.trim(),
        amount: numericAmount,
      });
      setDescription("");
      setAmount("");
    } catch (error) {
      setErrorMessage(normalizeApiError(error).message);
    }
  };

  const voidCharge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!voidChargeId || !voidReason.trim()) return;
    try {
      setErrorMessage("");
      await onVoid(voidChargeId, voidReason.trim());
      setVoidChargeId(null);
      setVoidReason("");
    } catch (error) {
      setErrorMessage(normalizeApiError(error).message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Guest folio</h3>
          <p className="mt-1 text-sm text-slate-500">
            Active operational charges: {formatMoney(booking.folioTotal)}
          </p>
        </div>
      </div>

      <form
        onSubmit={addCharge}
        className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4"
      >
        <select
          value={type}
          disabled={isMutating}
          onChange={(event) => setType(event.target.value as FolioChargeType)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          {(["INCIDENTAL", "PENALTY", "EXTENSION", "ADJUSTMENT"] as const).map(
            (item) => (
              <option key={item} value={item}>
                {formatEnumLabel(item)}
              </option>
            ),
          )}
        </select>
        <input
          value={description}
          maxLength={255}
          disabled={isMutating}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Charge description"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm md:col-span-2"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            disabled={isMutating}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount"
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm"
          />
          <Button type="submit" size="sm" disabled={isMutating}>
            Add
          </Button>
        </div>
      </form>

      {errorMessage && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 divide-y divide-slate-100">
        {booking.folioCharges.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">No folio charges recorded.</p>
        ) : (
          booking.folioCharges.map((charge) => (
            <div
              key={charge.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0 text-sm"
            >
              <div>
                <div className="font-semibold text-slate-900">
                  {charge.description}
                </div>
                <div className="text-xs text-slate-500">
                  {formatEnumLabel(charge.type)} / {charge.createdByName} /{" "}
                  {formatDateTime(charge.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={charge.status === "VOID" ? "line-through text-slate-400" : "font-bold"}>
                  {formatMoney(charge.amount)}
                </span>
                <StatusBadge status={charge.status} />
                {charge.status === "ACTIVE" && (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => {
                      setVoidChargeId(charge.id);
                      setVoidReason("");
                    }}
                    className="font-semibold text-rose-700 hover:underline disabled:opacity-50"
                  >
                    Void
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={voidChargeId !== null}
        onClose={() => {
          setVoidChargeId(null);
          setVoidReason("");
        }}
        title="Void Folio Charge"
        disableBackdropClose={isMutating}
        disableEscapeClose={isMutating}
      >
        <form className="space-y-4" onSubmit={voidCharge}>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            The charge remains in the immutable folio history. Add a clear audit
            reason for the void.
          </div>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Audit reason</span>
            <textarea
              value={voidReason}
              required
              maxLength={1000}
              disabled={isMutating}
              onChange={(event) => setVoidReason(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isMutating}
              onClick={() => setVoidChargeId(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isMutating || !voidReason.trim()}
            >
              Void charge
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function ConfirmationModal({
  action,
  note,
  selectedRoomIds,
  assignedRoomIds,
  requiredRoomCount,
  selectedStatus,
  paymentAmount,
  paymentMethod,
  paymentReferenceId,
  paymentPayerDetail,
  paymentPaidAt,
  refundAmount,
  refundMethod,
  rooms,
  isSubmitting,
  errorMessage,
  roomMovePreview,
  roomMovePricingAction,
  onRoomMovePricingActionChange,
  onNoteChange,
  onRoomToggle,
  onStatusChange,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onPaymentReferenceIdChange,
  onPaymentPayerDetailChange,
  onPaymentPaidAtChange,
  onRefundAmountChange,
  onRefundMethodChange,
  identityVerified,
  onIdentityVerifiedChange,
  onClose,
  onSubmit,
}: {
  action: PendingAction | null;
  note: string;
  selectedRoomIds: string[];
  assignedRoomIds: string[];
  requiredRoomCount: number;
  selectedStatus: BookingStatus;
  paymentAmount: string;
  paymentMethod: PaymentMethod;
  paymentReferenceId: string;
  paymentPayerDetail: string;
  paymentPaidAt: string;
  refundAmount: string;
  refundMethod: PaymentMethod;
  rooms: AssignmentRoom[];
  isSubmitting: boolean;
  errorMessage: string;
  roomMovePreview: RoomMovePreview | null;
  roomMovePricingAction: RoomMovePricingAction;
  onRoomMovePricingActionChange: (value: RoomMovePricingAction) => void;
  onNoteChange: (value: string) => void;
  onRoomToggle: (roomId: string) => void;
  onStatusChange: (value: BookingStatus) => void;
  onPaymentAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onPaymentReferenceIdChange: (value: string) => void;
  onPaymentPayerDetailChange: (value: string) => void;
  onPaymentPaidAtChange: (value: string) => void;
  onRefundAmountChange: (value: string) => void;
  onRefundMethodChange: (value: PaymentMethod) => void;
  identityVerified: boolean;
  onIdentityVerifiedChange: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const paymentReferenceRequired =
    action?.type === "recordPayment" &&
    paymentMethodsRequiringReference.has(paymentMethod);
  const canSubmit =
    !isSubmitting &&
    (action?.type !== "assignRoom" ||
      (selectedRoomIds.length === requiredRoomCount &&
        roomMovePreview !== null)) &&
    (action?.type !== "recordPayment" || Number(paymentAmount) > 0) &&
    (!paymentReferenceRequired || paymentReferenceId.trim().length > 0) &&
    (action?.type !== "recordRefund" || Number(refundAmount) > 0) &&
    (action?.type !== "checkIn" || identityVerified) &&
    (action?.type === "assignRoom" ||
      !action?.requiresNote ||
      note.trim().length > 0);

  return (
    <Modal
      isOpen={action !== null}
      onClose={onClose}
      title={action?.title}
      size={action?.type === "assignRoom" ? "xl" : "md"}
      disableBackdropClose={isSubmitting}
      disableEscapeClose={isSubmitting}
    >
      {action && (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <p>{action.message}</p>
          </div>

          {action.type === "assignRoom" && (
            <>
              <RoomAssignmentPicker
                rooms={rooms}
                selectedRoomIds={selectedRoomIds}
                assignedRoomIds={assignedRoomIds}
                requiredRoomCount={requiredRoomCount}
                isSubmitting={isSubmitting}
                onRoomToggle={onRoomToggle}
              />
              {roomMovePreview && (
                <RoomMovePricingPreview
                  preview={roomMovePreview}
                  pricingAction={roomMovePricingAction}
                  onPricingActionChange={onRoomMovePricingActionChange}
                  disabled={isSubmitting}
                />
              )}
            </>
          )}

          {action.type === "statusOverride" && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Correct status</span>
              <select
                value={selectedStatus}
                disabled={isSubmitting}
                onChange={(event) =>
                  onStatusChange(event.target.value as BookingStatus)
                }
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              >
                {bookingStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {action.type === "checkIn" && (
            <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={identityVerified}
                disabled={isSubmitting}
                onChange={(event) =>
                  onIdentityVerifiedChange(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block font-semibold text-slate-800">
                  Guest identity verified
                </span>
                <span className="text-slate-500">
                  Confirm against an accepted document. No raw document image is stored.
                </span>
              </span>
            </label>
          )}

          {action.type === "recordPayment" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Amount</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={paymentAmount}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    onPaymentAmountChange(event.target.value)
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Method</span>
                <select
                  value={paymentMethod}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    onPaymentMethodChange(event.target.value as PaymentMethod)
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {getPaymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </label>
              {paymentReferenceRequired && (
                <>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">
                      {getPaymentReferenceLabel(paymentMethod)}
                    </span>
                    <input
                      type="text"
                      value={paymentReferenceId}
                      required
                      maxLength={100}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        onPaymentReferenceIdChange(event.target.value)
                      }
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">
                      {getPayerDetailLabel(paymentMethod)}{" "}
                      <span className="font-normal text-slate-400">
                        optional
                      </span>
                    </span>
                    <input
                      type="text"
                      value={paymentPayerDetail}
                      maxLength={100}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        onPaymentPayerDetailChange(event.target.value)
                      }
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                    />
                  </label>
                </>
              )}
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Paid at</span>
                <input
                  type="datetime-local"
                  value={paymentPaidAt}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    onPaymentPaidAtChange(event.target.value)
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                />
              </label>
            </div>
          )}

          {action.type === "recordRefund" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Amount</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={refundAmount}
                  disabled={isSubmitting}
                  onChange={(event) => onRefundAmountChange(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Method</span>
                <select
                  value={refundMethod}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    onRefundMethodChange(event.target.value as PaymentMethod)
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                >
                  {refundMethods.map((method) => (
                    <option key={method} value={method}>
                      {getPaymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              {action.requiresNote ? "Audit note" : "Optional note"}
            </span>
            <textarea
              value={note}
              required={action.requiresNote}
              maxLength={1000}
              disabled={isSubmitting}
              onChange={(event) => onNoteChange(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              placeholder="Reason or audit note..."
            />
          </label>

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={
                action.type === "cancel" ||
                action.type === "rejectRefundRequest"
                  ? "danger"
                  : "primary"
              }
              icon={<FiCheckCircle />}
              disabled={!canSubmit}
            >
              {action.confirmLabel}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RoomMovePricingPreview({
  preview,
  pricingAction,
  onPricingActionChange,
  disabled,
}: {
  preview: RoomMovePreview;
  pricingAction: RoomMovePricingAction;
  onPricingActionChange: (value: RoomMovePricingAction) => void;
  disabled: boolean;
}) {
  const adjustment = Number(preview.totalAdjustment);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-xs font-semibold uppercase text-slate-400">
            Current
          </span>
          <p className="font-semibold text-slate-800">
            {preview.currentAssignment}
          </p>
          <p className="text-slate-500">
            {formatMoney(preview.currentNightlyRate)} / night
          </p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase text-slate-400">
            Destination
          </span>
          <p className="font-semibold text-slate-800">
            {preview.destinationAssignment}
          </p>
          <p className="text-slate-500">
            {formatMoney(preview.destinationNightlyRate)} / night
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs sm:grid-cols-3">
        <span>Affected nights: <strong>{preview.affectedNights}</strong></span>
        <span>Rate difference: <strong>{formatMoney(preview.baseDifference)}</strong></span>
        <span>Tax: <strong>{formatMoney(preview.taxDifference)}</strong></span>
      </div>

      {adjustment > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="font-semibold text-slate-900">
            Added balance: {formatMoney(preview.totalAdjustment)}
          </p>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              checked={pricingAction === "CHARGE_DIFFERENCE"}
              disabled={disabled}
              onChange={() => onPricingActionChange("CHARGE_DIFFERENCE")}
            />
            <span>Add the difference to the guest folio</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              checked={pricingAction === "COMPLIMENTARY_UPGRADE"}
              disabled={disabled}
              onChange={() => onPricingActionChange("COMPLIMENTARY_UPGRADE")}
            />
            <span>
              Complimentary upgrade and waive{" "}
              {formatMoney(preview.totalAdjustment)}
            </span>
          </label>
        </div>
      ) : (
        <p className="mt-4 rounded bg-emerald-50 px-3 py-2 font-medium text-emerald-700">
          No additional charge. Lower-priced moves do not create a refund or credit.
        </p>
      )}
    </div>
  );
}

function RoomAssignmentPicker({
  rooms,
  selectedRoomIds,
  assignedRoomIds,
  requiredRoomCount,
  isSubmitting,
  onRoomToggle,
}: {
  rooms: AssignmentRoom[];
  selectedRoomIds: string[];
  assignedRoomIds: string[];
  requiredRoomCount: number;
  isSubmitting: boolean;
  onRoomToggle: (roomId: string) => void;
}) {
  const assignedRoomIdSet = new Set(assignedRoomIds);
  const selectedRoomIdSet = new Set(selectedRoomIds);
  const visibleRooms = rooms
    .filter(
      (room) =>
        assignedRoomIdSet.has(room.id) ||
        (room.status === "AVAILABLE" && room.isActive),
    )
    .sort((left, right) => {
      const leftAssigned = assignedRoomIdSet.has(left.id);
      const rightAssigned = assignedRoomIdSet.has(right.id);
      if (leftAssigned !== rightAssigned) return leftAssigned ? -1 : 1;
      return (
        left.unitNumber.localeCompare(right.unitNumber) ||
        left.number.localeCompare(right.number)
      );
    });
  const countIsValid = selectedRoomIds.length === requiredRoomCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">Rooms</span>
        <span
          className={`text-xs font-semibold ${
            countIsValid ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {selectedRoomIds.length} / {requiredRoomCount} selected
        </span>
      </div>

      {!countIsValid && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          This booking requires exactly {requiredRoomCount} rooms. Keep{" "}
          {requiredRoomCount} rooms selected.
        </p>
      )}

      <div className="grid max-h-112 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
        {visibleRooms.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            No available rooms found for these stay dates.
          </p>
        ) : (
          visibleRooms.map((room) => {
            const isAssigned = assignedRoomIdSet.has(room.id);
            const isSelected = selectedRoomIdSet.has(room.id);
            return (
              <label
                key={room.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm transition ${
                  isSelected
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } ${isSubmitting ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isSubmitting}
                  onChange={() => onRoomToggle(room.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">
                    Unit {room.unitNumber} / Room {room.number}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {room.name} / Capacity {room.maxOccupancy} /{" "}
                    {formatEnumLabel(room.status)}
                  </span>
                </span>
                {isAssigned && (
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                    Assigned
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
  theme: "indigo" | "sky" | "emerald" | "slate" | "amber" | "rose" | "orange";
}

function ActionButton({
  onClick,
  disabled = false,
  icon,
  children,
  theme,
}: ActionButtonProps) {
  const themeClasses: Record<ActionButtonProps["theme"], string> = {
    indigo: "border-indigo-200 bg-indigo-50/45 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 hover:shadow-xs focus:ring-indigo-400/30",
    sky: "border-sky-200 bg-sky-50/45 text-sky-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-800 hover:shadow-xs focus:ring-sky-400/30",
    emerald: "border-emerald-200 bg-emerald-50/45 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 hover:shadow-xs focus:ring-emerald-400/30",
    slate: "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 hover:shadow-xs focus:ring-slate-400/30",
    amber: "border-amber-200 bg-amber-50/45 text-amber-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 hover:shadow-xs focus:ring-amber-400/30",
    rose: "border-rose-200 bg-rose-50/45 text-rose-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800 hover:shadow-xs focus:ring-rose-400/30",
    orange: "border-orange-200 bg-orange-50/45 text-orange-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 hover:shadow-xs focus:ring-orange-400/30",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full inline-flex items-center justify-center gap-2.5 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold cursor-pointer
        transition-all duration-200 ease-in-out
        hover:-translate-y-0.5 active:translate-y-0
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none
        ${themeClasses[theme]}
      `}
    >
      <span className="shrink-0 text-lg">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

