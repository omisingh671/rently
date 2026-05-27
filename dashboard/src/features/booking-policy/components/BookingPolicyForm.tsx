import type { ChangeEvent, FormEvent } from "react";
import Button from "@/components/ui/Button";
import type {
  AdvancePaymentType,
  BookingPolicyForm as BookingPolicyFormState,
} from "../types";
import PolicyJsonSection from "./PolicyJsonSection";

interface BookingPolicyFormProps {
  form: BookingPolicyFormState;
  readOnly: boolean;
  isSaving: boolean;
  onChange: (form: BookingPolicyFormState) => void;
  onSubmit: () => void;
}

export default function BookingPolicyForm({
  form,
  readOnly,
  isSaving,
  onChange,
  onSubmit,
}: BookingPolicyFormProps) {
  const updateField = <K extends keyof BookingPolicyFormState>(
    key: K,
    value: BookingPolicyFormState[K],
  ) => {
    onChange({ ...form, [key]: value });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const handleAdvanceValue = (event: ChangeEvent<HTMLInputElement>) => {
    updateField("advancePaymentValue", event.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-900">Advance Payment</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-semibold text-slate-700">
            Type
            <select
              value={form.advancePaymentType}
              disabled={readOnly}
              onChange={(event) =>
                updateField(
                  "advancePaymentType",
                  event.target.value as AdvancePaymentType,
                )
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
            >
              <option value="NONE">No upfront payment</option>
              <option value="FIXED_AMOUNT">Fixed token amount</option>
              <option value="PERCENTAGE">Percentage of booking</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Value
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.advancePaymentValue}
              disabled={readOnly || form.advancePaymentType === "NONE"}
              onChange={handleAdvanceValue}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
            />
          </label>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.tokenRefundable}
              disabled={readOnly}
              onChange={(event) =>
                updateField("tokenRefundable", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            Token refundable
          </label>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <PolicyJsonSection
          title="Cancellation Rules"
          value={form.cancellationRulesText}
          readOnly={readOnly}
          onChange={(value) => updateField("cancellationRulesText", value)}
        />
        <PolicyJsonSection
          title="Refund Rules"
          value={form.refundRulesText}
          readOnly={readOnly}
          onChange={(value) => updateField("refundRulesText", value)}
        />
        <PolicyJsonSection
          title="Early Checkout Rules"
          value={form.earlyCheckoutRulesText}
          readOnly={readOnly}
          onChange={(value) => updateField("earlyCheckoutRulesText", value)}
        />
        <PolicyJsonSection
          title="No-show Rules"
          value={form.noShowRulesText}
          readOnly={readOnly}
          onChange={(value) => updateField("noShowRulesText", value)}
        />
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-900">Guest-visible Text</h2>
        <textarea
          value={form.guestPolicyText}
          readOnly={readOnly}
          onChange={(event) =>
            updateField("guestPolicyText", event.target.value)
          }
          rows={5}
          className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 read-only:bg-slate-100"
        />
      </section>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Policy"}
          </Button>
        </div>
      )}
    </form>
  );
}
