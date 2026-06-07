import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Button from "@/components/ui/Button";
import type {
  AdvancePaymentType,
  BookingPolicyForm as BookingPolicyFormState,
  BookingStatusRule,
} from "../types";

interface BookingPolicyFormProps {
  form: BookingPolicyFormState;
  readOnly: boolean;
  isSaving: boolean;
  onChange: (form: BookingPolicyFormState) => void;
  onSubmit: () => void;
}

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  readOnly: boolean;
  onChange: (checked: boolean) => void;
}

interface SectionHeaderProps {
  title: string;
  description: string;
}

interface FieldPanelProps {
  label: string;
  description: string;
  children: ReactNode;
}

const statusOptions: Array<{ value: BookingStatusRule; label: string }> = [
  { value: "PENDING", label: "Pending bookings" },
  { value: "CONFIRMED", label: "Confirmed bookings" },
];

const inputClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const cardClassName =
  "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function FieldPanel({ label, description, children }: FieldPanelProps) {
  return (
    <div className="flex min-h-33 flex-col justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  readOnly,
  onChange,
}: ToggleRowProps) {
  return (
    <label className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm transition hover:bg-slate-100/70">
      <input
        type="checkbox"
        checked={checked}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 disabled:cursor-not-allowed"
      />
      <span>
        <span className="block font-semibold text-slate-800">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
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

  const handleAdvanceType = (event: ChangeEvent<HTMLSelectElement>) => {
    updateField("advancePaymentType", event.target.value as AdvancePaymentType);
  };

  const handleAdvanceValue = (event: ChangeEvent<HTMLInputElement>) => {
    updateField("advancePaymentValue", event.target.value);
  };

  const toggleAllowedStatus = (status: BookingStatusRule, checked: boolean) => {
    const nextStatuses = checked
      ? Array.from(new Set([...form.allowedStatuses, status]))
      : form.allowedStatuses.filter((value) => value !== status);

    updateField("allowedStatuses", nextStatuses);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className={cardClassName}>
        <SectionHeader
          title="Stay Timing"
          description="Set the guest-visible check-in and check-out times for this property."
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FieldPanel
            label="Check-in after"
            description="Shown to guests on booking details as the earliest check-in time."
          >
            <input
              type="time"
              value={form.checkInTime}
              disabled={readOnly}
              onChange={(event) =>
                updateField("checkInTime", event.target.value)
              }
              className={inputClassName}
            />
          </FieldPanel>

          <FieldPanel
            label="Check-out before"
            description="Shown to guests on booking details as the latest check-out time."
          >
            <input
              type="time"
              value={form.checkOutTime}
              disabled={readOnly}
              onChange={(event) =>
                updateField("checkOutTime", event.target.value)
              }
              className={inputClassName}
            />
          </FieldPanel>
        </div>
      </section>

      <section className={cardClassName}>
        <SectionHeader
          title="Advance Payment"
          description="Choose whether guests pay nothing upfront, a fixed token amount, or a percentage of the booking total."
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <FieldPanel
            label="Payment option"
            description="Decides what is collected when a new booking is created."
          >
            <select
              value={form.advancePaymentType}
              disabled={readOnly}
              onChange={handleAdvanceType}
              className={inputClassName}
            >
              <option value="NONE">No upfront payment</option>
              <option value="FIXED_AMOUNT">Fixed token amount</option>
              <option value="PERCENTAGE">Percentage of booking</option>
            </select>
          </FieldPanel>

          <FieldPanel
            label={
              form.advancePaymentType === "PERCENTAGE"
                ? "Percentage value"
                : "Token amount"
            }
            description={
              form.advancePaymentType === "NONE"
                ? "Disabled because no amount is collected at booking."
                : form.advancePaymentType === "PERCENTAGE"
                  ? "Collected as a percentage of the booking total."
                  : "Collected as a fixed token amount at booking."
            }
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.advancePaymentValue}
              disabled={readOnly || form.advancePaymentType === "NONE"}
              onChange={handleAdvanceValue}
              className={inputClassName}
            />
          </FieldPanel>

          <FieldPanel
            label="Default token refundability"
            description="The general setting for whether the upfront token can be refunded."
          >
            <label className="flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <span>{form.tokenRefundable ? "Refundable" : "Non-refundable"}</span>
              <input
                type="checkbox"
                checked={form.tokenRefundable}
                disabled={readOnly}
                onChange={(event) =>
                  updateField("tokenRefundable", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 disabled:cursor-not-allowed"
              />
            </label>
          </FieldPanel>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClassName}>
          <SectionHeader
            title="Cancellation Rules"
            description="Define when guests are allowed to request cancellation."
          />
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Guest cancellation allowed"
              description="Guests can request cancellation from eligible booking states."
              checked={form.guestCancellationAllowed}
              readOnly={readOnly}
              onChange={(checked) =>
                updateField("guestCancellationAllowed", checked)
              }
            />
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-sm font-semibold text-slate-800">
                Eligible booking statuses
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.allowedStatuses.includes(option.value)}
                      disabled={readOnly}
                      onChange={(event) =>
                        toggleAllowedStatus(option.value, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 disabled:cursor-not-allowed"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <ToggleRow
              title="Before check-in only"
              description="Cancellation is limited to bookings that have not reached check-in."
              checked={form.beforeCheckInOnly}
              readOnly={readOnly}
              onChange={(checked) => updateField("beforeCheckInOnly", checked)}
            />
          </div>
        </section>

        <section className={cardClassName}>
          <SectionHeader
            title="Refund Rules"
            description="Control how token and refund requests are handled after cancellation."
          />
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Refund requests can include token amount"
              description="Allows the token amount to be considered during refund review."
              checked={form.refundTokenRefundable}
              readOnly={readOnly}
              onChange={(checked) =>
                updateField("refundTokenRefundable", checked)
              }
            />
            <ToggleRow
              title="Manual review required"
              description="Keeps refund requests in review before fulfilment."
              checked={form.refundManualReviewRequired}
              readOnly={readOnly}
              onChange={(checked) =>
                updateField("refundManualReviewRequired", checked)
              }
            />
          </div>
        </section>

        <section className={cardClassName}>
          <SectionHeader
            title="Early Checkout Rules"
            description="Define refund handling when guests leave before the planned checkout."
          />
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Refund unused nights"
              description="Allows unused nights to be considered for refund."
              checked={form.refundUnusedNights}
              readOnly={readOnly}
              onChange={(checked) => updateField("refundUnusedNights", checked)}
            />
            <ToggleRow
              title="Manual review required"
              description="Requires property review before early checkout refunds are completed."
              checked={form.earlyCheckoutManualReviewRequired}
              readOnly={readOnly}
              onChange={(checked) =>
                updateField("earlyCheckoutManualReviewRequired", checked)
              }
            />
          </div>
        </section>

        <section className={cardClassName}>
          <SectionHeader
            title="No-show Rules"
            description="Control token handling and no-show marking after the check-in cutoff."
          />
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Mark after check-in cutoff"
              description="Allows bookings to be marked no-show after the check-in cutoff."
              checked={form.markAfterCheckInCutoff}
              readOnly={readOnly}
              onChange={(checked) =>
                updateField("markAfterCheckInCutoff", checked)
              }
            />
            <ToggleRow
              title="No-show token remains refundable"
              description="Keeps the token refundable even when a booking is marked no-show."
              checked={form.noShowTokenRefundable}
              readOnly={readOnly}
              onChange={(checked) =>
                updateField("noShowTokenRefundable", checked)
              }
            />
          </div>
        </section>
      </div>

      <section className={cardClassName}>
        <SectionHeader
          title="Guest-visible Text"
          description="This text is shown to guests alongside payment and cancellation policy details."
        />
        <textarea
          value={form.guestPolicyText}
          readOnly={readOnly}
          onChange={(event) =>
            updateField("guestPolicyText", event.target.value)
          }
          rows={5}
          className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 read-only:bg-slate-100"
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
