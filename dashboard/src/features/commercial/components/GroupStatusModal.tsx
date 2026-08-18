import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { BookingGroup, BookingGroupStatus } from "@/features/commercial/types";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

type Props = {
  group: BookingGroup | null;
  targetStatus: BookingGroupStatus | null;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
};

export default function GroupStatusModal({
  group,
  targetStatus,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState("");

  const close = () => {
    if (isSubmitting) return;
    setReason("");
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) return;
    if (await onSubmit(reason.trim())) close();
  };

  const isClosingStatus = targetStatus === "CANCELLED" || targetStatus === "COMPLETED";

  return (
    <Modal
      isOpen={group !== null && targetStatus !== null}
      onClose={close}
      title="Change Group Status"
      size="sm"
      disableBackdropClose={isSubmitting}
      disableEscapeClose={isSubmitting}
    >
      {group && targetStatus && (
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <p className="text-sm text-slate-600">You are changing <strong>{group.name}</strong> from:</p>
            <div className="mt-3 flex items-center gap-3 text-sm font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{formatEnumLabel(group.status)}</span>
              <span className="text-slate-400">→</span>
              <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-indigo-700">{formatEnumLabel(targetStatus)}</span>
            </div>
          </div>

          {isClosingStatus && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              All member bookings must already be resolved. Any remaining active room holds will
              be released when this status change succeeds.
            </div>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Change Reason <span className="text-red-500">*</span>
            <textarea
              autoFocus
              className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={reason}
              maxLength={500}
              placeholder="Explain why the group status is changing"
              disabled={isSubmitting}
              onChange={(event) => setReason(event.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Required, at least 5 characters. Stored in the audit history.</span>
          </label>

          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={close}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || reason.trim().length < 5}>
              {isSubmitting ? "Changing..." : "Change Status"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
