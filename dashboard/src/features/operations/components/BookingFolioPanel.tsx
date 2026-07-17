import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/common/StatusBadge";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { formatDateTime, formatMoney } from "../bookingDisplay";
import type { AdminBooking, FolioChargeType } from "../types";

type BookingFolioPanelProps = {
  booking: AdminBooking;
  isMutating: boolean;
  canVoid: boolean;
  onCreate: (payload: {
    expectedVersion: number;
    type: FolioChargeType;
    description: string;
    amount: number;
    note?: string;
  }) => Promise<AdminBooking>;
  onVoid: (chargeId: string, reason: string) => Promise<AdminBooking>;
};

export function BookingFolioPanel({
  booking,
  isMutating,
  canVoid,
  onCreate,
  onVoid,
}: BookingFolioPanelProps) {
  const [type, setType] = useState<FolioChargeType>("INCIDENTAL");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [voidChargeId, setVoidChargeId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const addCharge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (
      !description.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
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
          <h3 className="text-base font-semibold text-slate-900">
            Guest folio
          </h3>
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
          <p className="text-sm text-slate-500 py-2">
            No folio charges recorded.
          </p>
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
                <span
                  className={
                    charge.status === "VOID"
                      ? "line-through text-slate-400"
                      : "font-bold"
                  }
                >
                  {formatMoney(charge.amount)}
                </span>
                <StatusBadge status={charge.status} />
                {charge.status === "ACTIVE" && canVoid && (
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
