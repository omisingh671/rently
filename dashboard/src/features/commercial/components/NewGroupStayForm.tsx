import { useState, type FormEvent } from "react";
import { FiCalendar } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { toDateTimeLocalValue } from "@/features/commercial/commercial.helpers";
import type {
  CompanyAccount,
  CreateGroupPayload,
} from "@/features/commercial/types";

const inputClass =
  "mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-sm font-medium text-slate-700";
const hintClass = "mt-1 block text-xs font-normal leading-5 text-slate-500";

type Props = {
  companies: CompanyAccount[];
  initialCompanyId?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateGroupPayload) => Promise<boolean>;
};

export default function NewGroupStayForm({
  companies,
  initialCompanyId = "",
  isSubmitting,
  onCancel,
  onSubmit,
}: Props) {
  const [form, setForm] = useState({
    companyId: initialCompanyId,
    name: "",
    checkIn: "",
    checkOut: "",
    expectedRooms: "1",
    expectedGuests: "1",
    releaseDate: "",
  });
  const releaseDateMinimum = toDateTimeLocalValue(new Date().toISOString());
  const releaseDateMaximum = toDateTimeLocalValue(form.checkIn);
  const releaseDateError = form.releaseDate && new Date(form.releaseDate) <= new Date()
    ? "Choose a future release cutoff."
    : form.releaseDate && releaseDateMaximum && form.releaseDate > releaseDateMaximum
      ? "Release cutoff cannot be later than check-in."
      : "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (releaseDateError) return;
    await onSubmit({
      companyId: form.companyId || undefined,
      name: form.name.trim(),
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      expectedRooms: Number(form.expectedRooms),
      expectedGuests: Number(form.expectedGuests),
      releaseDate: form.releaseDate
        ? new Date(form.releaseDate).toISOString()
        : undefined,
    });
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="rounded-md border border-indigo-100 bg-indigo-50 p-3 text-sm leading-6 text-indigo-900">
        Create one dated group for an event, tour, wedding, or corporate visit. Individual guest bookings are added later as rooming details are confirmed.
      </p>
      <label className={labelClass}>
        Stay or Group Name <span className="text-red-500">*</span>
        <input className={inputClass} required maxLength={190} placeholder="e.g. Acme onboarding team — September" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </label>
      <div>
        <label className={labelClass} htmlFor="new-group-company">Bill To</label>
        <select id="new-group-company" className={inputClass} value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}>
          <option value="">Independent group — no company billing</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}
        </select>
        <span className={hintClass}>Choose a saved company for corporate billing, or leave this independent.</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Check-In <span className="text-red-500">*</span><input className={inputClass} required type="date" value={form.checkIn} onChange={(event) => setForm((current) => ({ ...current, checkIn: event.target.value }))} /></label>
        <label className={labelClass}>Check-Out <span className="text-red-500">*</span><input className={inputClass} required min={form.checkIn || undefined} type="date" value={form.checkOut} onChange={(event) => setForm((current) => ({ ...current, checkOut: event.target.value }))} /></label>
        <label className={labelClass}>Rooms Needed <span className="text-red-500">*</span><input className={inputClass} required min={1} max={500} type="number" value={form.expectedRooms} onChange={(event) => setForm((current) => ({ ...current, expectedRooms: event.target.value }))} /></label>
        <label className={labelClass}>Guests Expected <span className="text-red-500">*</span><input className={inputClass} required min={1} max={5000} type="number" value={form.expectedGuests} onChange={(event) => setForm((current) => ({ ...current, expectedGuests: event.target.value }))} /></label>
      </div>
      <label className={labelClass}>
        Release Unsold Rooms At <span className="font-normal text-slate-400">(Optional)</span>
        <input className={inputClass} min={releaseDateMinimum} max={releaseDateMaximum || undefined} type="datetime-local" value={form.releaseDate} onChange={(event) => setForm((current) => ({ ...current, releaseDate: event.target.value }))} />
        <span className={`${hintClass} ${releaseDateError ? "text-red-600" : ""}`}>{releaseDateError || "Latest release time for this group. Individual room holds may release earlier, but never later."}</span>
      </label>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" icon={<FiCalendar />} disabled={isSubmitting || Boolean(releaseDateError)}>
          {isSubmitting ? "Creating..." : "Create Group Stay"}
        </Button>
      </div>
    </form>
  );
}
