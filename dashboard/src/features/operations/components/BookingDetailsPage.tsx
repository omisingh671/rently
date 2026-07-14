import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
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
import { paymentMethodsRequiringReference } from "../bookingActionLabels";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  getAssignedLabel,
  getStayLabel,
  hasAssignedTarget,
} from "../bookingDisplay";
import { useAdminBooking } from "../hooks/useAdminOperations";
import { useBookingActionState } from "../hooks/useBookingActionState";
import type {
  AdminBooking,
  CheckInPolicyPreview,
  CheckOutPolicyPreview,
  StayExtensionPreview,
} from "../types";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCreditCard,
  FiEdit3,
  FiUser,
} from "react-icons/fi";
import { BookingActionModal } from "./BookingActionModal";
import { BookingAssignmentPanel } from "./BookingAssignmentPanel";
import { BookingBillingDocumentsPanel } from "./BookingBillingDocumentsPanel";
import { BookingFolioPanel } from "./BookingFolioPanel";
import { BookingPaymentsPanel } from "./BookingPaymentsPanel";
import { BookingStatusPanel } from "./BookingStatusPanel";
import { StayExtensionModal } from "./StayExtensionModal";

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

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canOverrideCheckedInRoom = useAuthStore((state) =>
    state.hasAnyRole(["SUPER_ADMIN", "ADMIN"]),
  );
  const canUseAdminCorrection = useAuthStore((state) =>
    state.hasAnyRole(["SUPER_ADMIN", "ADMIN"]),
  );
  const [activeSummaryTab, setActiveSummaryTab] = useState<"booking" | "payment">("booking");
  const [isStayExtensionOpen, setIsStayExtensionOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionNote, setExtensionNote] = useState("");
  const [extensionOverrideReason, setExtensionOverrideReason] = useState("");
  const [extensionPreview, setExtensionPreview] =
    useState<StayExtensionPreview | null>(null);
  const [extensionError, setExtensionError] = useState("");
  const [checkInPolicyPreview, setCheckInPolicyPreview] =
    useState<CheckInPolicyPreview | null>(null);
  const [checkOutPolicyPreview, setCheckOutPolicyPreview] =
    useState<CheckOutPolicyPreview | null>(null);

  const {
    data: booking,
    isPending,
    isFetching,
    isError,
    error,
    updateBooking,
    checkInBooking,
    checkOutBooking,
    previewCheckInPolicy,
    previewCheckOutPolicy,
    markNoShow,
    moveRooms,
    previewRoomMove,
    isPreviewingRoomMove,
    previewStayExtension,
    isPreviewingStayExtension,
    extendStay,
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
    billingDocuments.flatMap((document) =>
      document.type === "RECEIPT" && document.paymentId
        ? [[document.paymentId, document] as const]
        : [],
    ),
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
  const {
    pendingAction,
    note,
    selectedRoomIds,
    selectedStatus,
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
    setSelectedStatus,
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
  } = useBookingActionState({ booking, rooms });

  useEffect(() => {
    if (!booking || (pendingAction?.type !== "checkIn" && pendingAction?.type !== "checkOut")) {
      return;
    }
    let active = true;
    const preview =
      pendingAction.type === "checkIn"
        ? previewCheckInPolicy(booking.version).then((value) => {
            if (active) setCheckInPolicyPreview(value);
          })
        : previewCheckOutPolicy(booking.version).then((value) => {
            if (active) setCheckOutPolicyPreview(value);
          });
    void preview.catch((previewError: unknown) => {
      if (active) setActionError(normalizeApiError(previewError).message);
    });
    return () => {
      active = false;
    };
  }, [
    booking,
    pendingAction?.type,
    previewCheckInPolicy,
    previewCheckOutPolicy,
    setActionError,
  ]);

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
            setRoomMovePricingAction(
              preview.allowedPricingActions[0] ?? "NO_CREDIT",
            );
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
    setActionError,
    setRoomMovePreview,
    setRoomMovePricingAction,
  ]);

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
          ...(checkInPolicyPreview && {
            policyFingerprint: checkInPolicyPreview.policyFingerprint,
          }),
          ...(!checkInPolicyPreview?.allowed && canUseAdminCorrection && {
            allowPolicyOverride: true,
            overrideReason: note.trim(),
          }),
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
          ...(checkOutPolicyPreview && {
            policyFingerprint: checkOutPolicyPreview.policyFingerprint,
          }),
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

  const openStayExtension = () => {
    if (!booking) return;
    const nextCheckOut = new Date(booking.checkOut);
    nextCheckOut.setUTCDate(nextCheckOut.getUTCDate() + 1);
    setExtensionDate(nextCheckOut.toISOString().slice(0, 10));
    setExtensionNote("");
    setExtensionOverrideReason("");
    setExtensionPreview(null);
    setExtensionError("");
    setIsStayExtensionOpen(true);
  };

  const previewExtension = async () => {
    if (!booking || !extensionDate) return;
    try {
      setExtensionError("");
      setExtensionPreview(
        await previewStayExtension({
          expectedVersion: booking.version,
          newCheckOut: new Date(`${extensionDate}T00:00:00.000Z`).toISOString(),
        }),
      );
    } catch (err) {
      setExtensionPreview(null);
      setExtensionError(normalizeApiError(err).message);
    }
  };

  const submitStayExtension = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!booking || !extensionPreview) return;
    try {
      setExtensionError("");
      await extendStay({
        expectedVersion: booking.version,
        newCheckOut: extensionPreview.newCheckOut,
        pricingFingerprint: extensionPreview.pricingFingerprint,
        note: extensionNote.trim(),
        ...(extensionOverrideReason.trim() && {
          overrideReason: extensionOverrideReason.trim(),
        }),
      });
      setIsStayExtensionOpen(false);
    } catch (err) {
      setExtensionError(normalizeApiError(err).message);
    }
  };

  const canCheckIn =
    booking?.status === "CONFIRMED" &&
    booking !== undefined &&
    hasAssignedTarget(booking);
  const canCheckOut = booking?.status === "CHECKED_IN";
  const canExtendStay =
    booking !== undefined &&
    (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") &&
    hasAssignedTarget(booking);
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
  const refundRequestPayment = canActOnRefundRequest
    ? booking?.payments.find((payment) => Number(payment.refundableAmount) > 0)
    : undefined;
  const canAssignRoom =
    booking !== undefined &&
    booking.status !== "CHECKED_OUT" &&
    booking.status !== "CANCELLED" &&
    booking.status !== "NO_SHOW" &&
    (booking.status === "CHECKED_IN" ||
      booking.status === "CONFIRMED" ||
      !booking.isCheckInDatePassed);
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

          <BookingFolioPanel
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
          <BookingStatusPanel
            booking={booking}
            canCheckIn={canCheckIn}
            canCheckOut={canCheckOut}
            canExtendStay={canExtendStay}
            canRecordBalance={canRecordBalance}
            canAssignRoom={canAssignRoom}
            canUseAdminCorrection={canUseAdminCorrection}
            canMarkNoShow={canMarkNoShow}
            canCancel={canCancel}
            canOverrideCheckedInRoom={canOverrideCheckedInRoom}
            isMutating={isMutating}
            onCheckIn={() => openAction("checkIn")}
            onCheckOut={() => openAction("checkOut")}
            onExtendStay={openStayExtension}
            onRecordPayment={() => openAction("recordPayment")}
            onAssignRoom={() => openAction("assignRoom")}
            onStatusOverride={() => openAction("statusOverride")}
            onNoShow={() => openAction("noShow")}
            onCancel={() => openAction("cancel")}
          />

          <BookingAssignmentPanel booking={booking} />

          <BookingPaymentsPanel
            booking={booking}
            canShowRefunds={canShowRefunds}
            canActOnRefundRequest={canActOnRefundRequest}
            refundRequestPaymentId={refundRequestPayment?.id}
            receiptByPaymentId={receiptByPaymentId}
            isMutating={isMutating}
            isBillingMutating={isBillingMutating}
            onMarkRefundRequestInReview={() => {
              if (!booking.refundRequest) return;
              void updateRefundRequest({
                requestId: booking.refundRequest.id,
                payload: { status: "IN_REVIEW" },
              }).catch((err: unknown) => {
                setActionError(normalizeApiError(err).message);
              });
            }}
            onProcessRefundRequest={(paymentId) =>
              openAction("recordRefund", paymentId)
            }
            onRejectRefundRequest={() => openAction("rejectRefundRequest")}
            onDownloadReceipt={(document) => {
              setActionError("");
              void billingActions
                .downloadDocument(document)
                .catch(handleBillingError);
            }}
            onGenerateReceipt={(paymentId) => {
              setActionError("");
              void billingActions
                .generateReceipt(paymentId)
                .catch(handleBillingError);
            }}
            onRecordRefund={(paymentId) => openAction("recordRefund", paymentId)}
          />

          <BookingBillingDocumentsPanel
            billingDocuments={billingDocuments}
            invoiceDocument={invoiceDocument}
            isPending={billingDocumentsQuery.isPending}
            canGenerateInvoice={canGenerateInvoice}
            isBillingMutating={isBillingMutating}
            onDownloadDocument={(document) => {
              setActionError("");
              void billingActions
                .downloadDocument(document)
                .catch(handleBillingError);
            }}
            onGenerateInvoice={() => {
              if (!booking) return;
              setActionError("");
              void billingActions.generateInvoice(booking.id).catch(handleBillingError);
            }}
          />
        </aside>
      </div>

      <BookingActionModal
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
        checkInPolicyPreview={checkInPolicyPreview}
        checkOutPolicyPreview={checkOutPolicyPreview}
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
      <StayExtensionModal
        isOpen={isStayExtensionOpen}
        currentCheckOut={booking.checkOut}
        newCheckOut={extensionDate}
        note={extensionNote}
        overrideReason={extensionOverrideReason}
        preview={extensionPreview}
        canOverrideMaintenance={canUseAdminCorrection}
        isPreviewing={isPreviewingStayExtension}
        isSubmitting={isMutating}
        errorMessage={extensionError}
        onNewCheckOutChange={(value) => {
          setExtensionDate(value);
          setExtensionPreview(null);
          setExtensionError("");
        }}
        onNoteChange={setExtensionNote}
        onOverrideReasonChange={setExtensionOverrideReason}
        onPreview={() => void previewExtension()}
        onClose={() => setIsStayExtensionOpen(false)}
        onSubmit={submitStayExtension}
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
