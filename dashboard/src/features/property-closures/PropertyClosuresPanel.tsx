import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/common/StatusBadge";
import { normalizeApiError } from "@/utils/errors";
import type {
  AdminPropertyClosure,
  PropertyClosureType,
} from "./types";
import { usePropertyClosures } from "./usePropertyClosures";

type Props = { propertyId: string };

const inputClassName =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const toExclusiveEndDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
const formatInclusiveEndDate = (value: string) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - 1);
  return formatDate(date.toISOString());
};

export default function PropertyClosuresPanel({ propertyId }: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cancelling, setCancelling] = useState<AdminPropertyClosure | null>(null);
  const [type, setType] = useState<PropertyClosureType>("HOLIDAY_CLOSURE");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const {
    data,
    isPending,
    isError,
    createClosure,
    cancelClosure,
    isCreating,
    isCancelling,
  } = usePropertyClosures(propertyId);

  const resetCreate = () => {
    setType("HOLIDAY_CLOSURE");
    setReason("");
    setStartDate("");
    setEndDate("");
    setError(null);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    resetCreate();
  };

  const closeCancellation = () => {
    if (isCancelling) return;
    setCancelling(null);
    setCancellationReason("");
    setError(null);
  };

  const submitCreate = async () => {
    if (!reason.trim() || !startDate || !endDate || endDate < startDate) {
      setError("Enter a reason and a valid start/end date range.");
      return;
    }
    try {
      await createClosure({
        propertyId,
        type,
        reason: reason.trim(),
        startDate,
        endDate: toExclusiveEndDate(endDate),
      });
      closeCreate();
    } catch (caughtError) {
      setError(normalizeApiError(caughtError).message);
    }
  };

  const submitCancellation = async () => {
    if (!cancelling || cancellationReason.trim().length < 3) {
      setError("A cancellation reason is required.");
      return;
    }
    try {
      await cancelClosure({
        closureId: cancelling.id,
        reason: cancellationReason.trim(),
      });
      setCancelling(null);
      setCancellationReason("");
      setError(null);
    } catch (caughtError) {
      setError(normalizeApiError(caughtError).message);
    }
  };

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Property closures</h2>
          <p className="mt-1 text-sm text-slate-500">
            Close every publicly bookable room for a holiday or owner-requested sell stop.
          </p>
        </div>
        <Button
          disabled={!propertyId}
          onClick={() => {
            resetCreate();
            setIsCreateOpen(true);
          }}
        >
          Create Closure
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 md:grid-cols-3">
        <div>
          <p className="font-semibold">Whole-property effect</p>
          <p className="mt-1 leading-5 text-blue-700">All public inventory is unavailable for the inclusive date range.</p>
        </div>
        <div>
          <p className="font-semibold">Not for repairs</p>
          <p className="mt-1 leading-5 text-blue-700">Use Maintenance Blocks when only a room, unit, or repair scope is affected.</p>
        </div>
        <div>
          <p className="font-semibold">Audit-safe changes</p>
          <p className="mt-1 leading-5 text-blue-700">Closures are not edited. Cancel with a reason, then create the corrected record.</p>
        </div>
      </div>

      {!propertyId ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          Select a property to manage closures.
        </p>
      ) : isPending ? (
        <p className="p-4 text-sm text-slate-600">Loading property closures...</p>
      ) : isError ? (
        <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load property closures.
        </p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          No holiday or owner closures for this property.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created by</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map((closure) => (
                <tr key={closure.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4"><StatusBadge status={closure.type} /></td>
                  <td className="max-w-sm px-4 py-4 font-medium leading-5 text-slate-800">{closure.reason}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    <p className="font-medium">{formatDate(closure.startDate)} – {formatInclusiveEndDate(closure.endDate)}</p>
                    <p className="mt-1 text-xs text-slate-500">Inclusive</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={closure.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{closure.createdByName}</td>
                  <td className="px-4 py-3">
                    {closure.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setCancelling(closure);
                          setCancellationReason("");
                          setError(null);
                        }}
                      >
                        Cancel
                      </button>
                    ) : (
                      <span className="text-slate-400">Cancelled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Create Property Closure"
        size="lg"
      >
        <div className="space-y-5">
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">This closes the entire property to public bookings.</p>
            <p className="mt-1 leading-5 text-amber-800">
              Do not also create a maintenance block for the same holiday or owner sell stop. Existing reservations are not cancelled or moved automatically.
            </p>
          </div>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">1. Why is the property closed?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([
                {
                  value: "HOLIDAY_CLOSURE" as const,
                  label: "Holiday closure",
                  description: "The property will not sell rooms for a holiday or planned shutdown.",
                },
                {
                  value: "OWNER_BLOCK" as const,
                  label: "Owner block",
                  description: "The owner or authorized operator has requested a whole-property sell stop.",
                },
              ]).map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-3 ${
                    type === option.value
                      ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="closure-type"
                      value={option.value}
                      checked={type === option.value}
                      onChange={() => setType(option.value)}
                      className="mt-1 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Closure reason <span className="text-rose-600">*</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                maxLength={500}
                placeholder={type === "HOLIDAY_CLOSURE" ? "Example: Independence Day planned closure" : "Example: Owner-requested private event"}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">2. Inclusive closure dates</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Both the start and end date are unavailable. Public inventory reopens the following day.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Closed from<input className={`${inputClassName} mt-1`} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label className="block text-sm font-medium text-slate-700">Closed through<input className={`${inputClassName} mt-1`} type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeCreate}>Cancel</Button>
            <Button disabled={isCreating} onClick={() => void submitCreate()}>{isCreating ? "Creating..." : "Create Property Closure"}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={cancelling !== null}
        onClose={closeCancellation}
        title="Cancel Property Closure"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Cancelling reopens the affected dates for public availability. Existing history is retained. Create a new closure if the dates need correction.</p>
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <label className="block text-sm font-medium text-slate-700">Required cancellation reason<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" maxLength={500} value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} /></label>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" disabled={isCancelling} onClick={closeCancellation}>Keep Closure</Button>
            <Button variant="danger" disabled={isCancelling} onClick={() => void submitCancellation()}>{isCancelling ? "Cancelling..." : "Cancel Closure"}</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
