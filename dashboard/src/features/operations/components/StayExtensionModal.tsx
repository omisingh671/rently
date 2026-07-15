import type { FormEvent } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "../bookingDisplay";
import type { StayExtensionPreview } from "../types";

type StayExtensionModalProps = {
  isOpen: boolean;
  currentCheckOut: string;
  newCheckOut: string;
  note: string;
  overrideReason: string;
  preview: StayExtensionPreview | null;
  canOverrideMaintenance: boolean;
  isPreviewing: boolean;
  isSubmitting: boolean;
  errorMessage: string;
  onNewCheckOutChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onOverrideReasonChange: (value: string) => void;
  onPreview: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function StayExtensionModal({
  isOpen,
  currentCheckOut,
  newCheckOut,
  note,
  overrideReason,
  preview,
  canOverrideMaintenance,
  isPreviewing,
  isSubmitting,
  errorMessage,
  onNewCheckOutChange,
  onNoteChange,
  onOverrideReasonChange,
  onPreview,
  onClose,
  onSubmit,
}: StayExtensionModalProps) {
  const blockingConflicts =
    preview?.conflicts.filter(
      (conflict) =>
        conflict.type !== "MAINTENANCE" ||
        !canOverrideMaintenance ||
        overrideReason.trim().length === 0,
    ) ?? [];
  const canSubmit =
    preview !== null &&
    blockingConflicts.length === 0 &&
    note.trim().length > 0 &&
    !isSubmitting &&
    !isPreviewing;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extend Stay"
      size="lg"
      disableBackdropClose={isSubmitting}
      disableEscapeClose={isSubmitting}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Current check-out</span>
            <input
              type="date"
              value={currentCheckOut.slice(0, 10)}
              disabled
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">New check-out</span>
            <input
              type="date"
              value={newCheckOut}
              min={currentCheckOut.slice(0, 10)}
              disabled={isSubmitting}
              onChange={(event) => onNewCheckOutChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={!newCheckOut || isPreviewing || isSubmitting}
          onClick={onPreview}
        >
          {isPreviewing ? "Checking availability..." : "Preview extension"}
        </Button>

        {preview && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <PreviewRow label="Added nights" value={String(preview.extraNights)} />
              <PreviewRow label="Nightly rate" value={formatMoney(preview.nightlyRate)} />
              <PreviewRow label="Incremental subtotal" value={formatMoney(preview.baseAmount)} />
              <PreviewRow label="Additional discount" value={formatMoney(preview.discountAmount)} />
              <PreviewRow label="Tax" value={formatMoney(preview.taxAmount)} />
              <PreviewRow label="Extension total" value={formatMoney(preview.totalAmount)} />
              <PreviewRow label="Resulting balance" value={formatMoney(preview.resultingBalance)} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Existing booking discounts are frozen. Additional nights use the active rate and tax configuration.
            </p>
          </div>
        )}

        {preview && preview.conflicts.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <p className="font-semibold">Inventory conflicts</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {preview.conflicts.map((conflict) => (
                <li key={`${conflict.type}-${conflict.targetId}`}>
                  {conflict.targetLabel}: {conflict.type.toLowerCase().replace("_", " ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canOverrideMaintenance &&
          preview?.conflicts.some((conflict) => conflict.type === "MAINTENANCE") && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">
                Authorized maintenance override reason
              </span>
              <textarea
                value={overrideReason}
                disabled={isSubmitting}
                onChange={(event) => onOverrideReasonChange(event.target.value)}
                className="mt-1 min-h-20 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </label>
          )}

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Audit note</span>
          <textarea
            value={note}
            required
            maxLength={1000}
            disabled={isSubmitting}
            onChange={(event) => onNoteChange(event.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            Confirm extension
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
