import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { toDateTimeLocalValue } from "@/features/commercial/commercial.helpers";
import type {
  BookingGroup,
  UpdateGroupDetailsPayload,
} from "@/features/commercial/types";

const inputClass =
  "mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-sm font-medium text-slate-700";
const dateOnly = (value: string) => value.slice(0, 10);

type Props = {
  group: BookingGroup | null;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: UpdateGroupDetailsPayload) => Promise<boolean>;
};

export default function GroupDetailsModal({
  group,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState(() => ({
    name: group?.name ?? "",
    checkIn: group ? dateOnly(group.checkIn) : "",
    checkOut: group ? dateOnly(group.checkOut) : "",
    expectedRooms: String(group?.expectedRooms ?? 1),
    expectedGuests: String(group?.expectedGuests ?? 1),
    releaseDate: toDateTimeLocalValue(group?.releaseDate),
    reason: "",
  }));
  const releaseDateMinimum = toDateTimeLocalValue(new Date().toISOString());
  const releaseDateMaximum = toDateTimeLocalValue(form.checkIn);
  const releaseDateError = form.releaseDate && new Date(form.releaseDate) <= new Date()
    ? "Choose a future release cutoff."
    : form.releaseDate && releaseDateMaximum && form.releaseDate > releaseDateMaximum
      ? "Release cutoff cannot be later than check-in."
      : "";

  const close = () => {
    if (!isSubmitting) onClose();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!group || form.reason.trim().length < 5 || releaseDateError) return;
    if (await onSubmit({
      name: form.name.trim(),
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      expectedRooms: Number(form.expectedRooms),
      expectedGuests: Number(form.expectedGuests),
      releaseDate: form.releaseDate
        ? new Date(form.releaseDate).toISOString()
        : null,
      reason: form.reason.trim(),
    })) close();
  };

  return (
    <Modal
      isOpen={group !== null}
      onClose={close}
      title="Edit Group Stay"
      size="md"
      disableBackdropClose={isSubmitting}
      disableEscapeClose={isSubmitting}
    >
      {group && (
        <form className="space-y-4" onSubmit={submit}>
          <p className="rounded-md border border-indigo-100 bg-indigo-50 p-3 text-sm leading-6 text-indigo-900">
            Update planning details before rooms, guest bookings, or folio charges are created. The group reference and company billing link remain unchanged.
          </p>
          <label className={labelClass}>Stay or Group Name *<input required maxLength={190} className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Check-In *<input required type="date" className={inputClass} value={form.checkIn} onChange={(event) => setForm((current) => ({ ...current, checkIn: event.target.value }))} /></label>
            <label className={labelClass}>Check-Out *<input required type="date" min={form.checkIn || undefined} className={inputClass} value={form.checkOut} onChange={(event) => setForm((current) => ({ ...current, checkOut: event.target.value }))} /></label>
            <label className={labelClass}>Rooms Needed *<input required type="number" min={1} max={500} className={inputClass} value={form.expectedRooms} onChange={(event) => setForm((current) => ({ ...current, expectedRooms: event.target.value }))} /></label>
            <label className={labelClass}>Guests Expected *<input required type="number" min={1} max={5000} className={inputClass} value={form.expectedGuests} onChange={(event) => setForm((current) => ({ ...current, expectedGuests: event.target.value }))} /></label>
          </div>
          <label className={labelClass}>Release Unsold Rooms At<input type="datetime-local" min={releaseDateMinimum} max={releaseDateMaximum || undefined} className={inputClass} value={form.releaseDate} onChange={(event) => setForm((current) => ({ ...current, releaseDate: event.target.value }))} /><span className={`mt-1 block text-xs font-normal leading-5 ${releaseDateError ? "text-red-600" : "text-slate-500"}`}>{releaseDateError || "Choose a future cutoff no later than check-in. Individual room holds may release earlier, but never later."}</span></label>
          <label className={labelClass}>Audit Reason *<textarea required minLength={5} maxLength={500} className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Why are these group details changing?" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} /><span className="mt-1 block text-xs font-normal text-slate-500">Required, at least 5 characters. Stored in audit history.</span></label>
          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={isSubmitting} onClick={close}>Cancel</Button><Button type="submit" disabled={isSubmitting || form.reason.trim().length < 5 || Boolean(releaseDateError)}>{isSubmitting ? "Saving..." : "Save Group Details"}</Button></div>
        </form>
      )}
    </Modal>
  );
}
