import type { FormEvent } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import {
  bookingStatuses,
  paymentMethods,
  paymentMethodsRequiringReference,
  refundMethods,
  type PendingAction,
} from "../bookingActionLabels";
import {
  formatMoney,
  getPayerDetailLabel,
  getPaymentMethodLabel,
  getPaymentReferenceLabel,
} from "../bookingDisplay";
import type {
  BookingStatus,
  PaymentMethod,
  RoomMovePreview,
  RoomMovePricingAction,
  CheckInPolicyPreview,
  CheckOutPolicyPreview,
} from "../types";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

export type AssignmentRoom = {
  id: string;
  unitNumber: string;
  number: string;
  name: string;
  status: string;
  isActive: boolean;
  maxOccupancy: number;
  unitId: string;
};

type BookingActionModalProps = {
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
  checkInPolicyPreview: CheckInPolicyPreview | null;
  checkOutPolicyPreview: CheckOutPolicyPreview | null;
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
};

export function BookingActionModal({
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
  checkInPolicyPreview,
  checkOutPolicyPreview,
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
}: BookingActionModalProps) {
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
            <>
            {checkInPolicyPreview && checkInPolicyPreview.isEarly && (
              <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
                Early check-in before {checkInPolicyPreview.scheduledCheckInTime}: {checkInPolicyPreview.allowed ? `fee ${formatMoney(checkInPolicyPreview.feeAmount)}` : "disabled; Admin override and reason required"}.
              </div>
            )}
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
            </>
          )}

          {action.type === "checkOut" && checkOutPolicyPreview && (
            <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
              {checkOutPolicyPreview.isEarly && (
                <p>Early checkout: {checkOutPolicyPreview.unusedNights} unused night(s), refund for review {formatMoney(checkOutPolicyPreview.refundAmount)}.</p>
              )}
              {checkOutPolicyPreview.lateCheckoutCharge && (
                <p>Late checkout tariff: {formatMoney(checkOutPolicyPreview.lateCheckoutCharge.totalAmount)} ({formatEnumLabel(checkOutPolicyPreview.lateCheckoutCharge.tariffType)}).</p>
              )}
              {!checkOutPolicyPreview.isEarly && !checkOutPolicyPreview.lateCheckoutCharge && <p>Standard checkout policy applies with no timing adjustment.</p>}
            </div>
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
        <span>
          Affected nights: <strong>{preview.affectedNights}</strong>
        </span>
        <span>
          Rate difference: <strong>{formatMoney(preview.baseDifference)}</strong>
        </span>
        <span>
          Tax: <strong>{formatMoney(preview.taxDifference)}</strong>
        </span>
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
      ) : adjustment < 0 ? (
        <div className="mt-4 space-y-2 rounded bg-emerald-50 px-3 py-3 text-emerald-800">
          <p className="font-semibold">
            Downgrade difference: {formatMoney(String(Math.abs(adjustment)))}
          </p>
          <p className="text-xs">
            Property policy: {formatEnumLabel(preview.downgradeTreatment)}
          </p>
          {preview.allowedPricingActions.includes("APPLY_CREDIT") && (
            <label className="flex items-start gap-2">
              <input type="radio" checked={pricingAction === "APPLY_CREDIT"} disabled={disabled} onChange={() => onPricingActionChange("APPLY_CREDIT")} />
              <span>Apply the price difference as a folio credit</span>
            </label>
          )}
          {preview.allowedPricingActions.includes("NO_CREDIT") && (
            <label className="flex items-start gap-2">
              <input type="radio" checked={pricingAction === "NO_CREDIT"} disabled={disabled} onChange={() => onPricingActionChange("NO_CREDIT")} />
              <span>No credit; retain the original booking value with audit note</span>
            </label>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded bg-slate-100 px-3 py-2 font-medium text-slate-700">
          Same-rate move. No financial adjustment.
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
