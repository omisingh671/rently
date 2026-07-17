import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Button from "@/components/ui/Button";
import type {
  AdvancePaymentType,
  BookingPolicyForm as BookingPolicyFormState,
} from "../types";

interface BookingPolicyFormProps {
  form: BookingPolicyFormState;
  readOnly: boolean;
  isSaving: boolean;
  fieldErrors: Partial<Record<keyof BookingPolicyFormState, string>>;
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
  error?: string;
}

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

function FieldPanel({ label, description, children, error }: FieldPanelProps) {
  return (
    <div className="flex min-h-33 flex-col justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="mt-3">{children}</div>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
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
  fieldErrors,
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
            error={fieldErrors.checkInTime}
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
            error={fieldErrors.checkOutTime}
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
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
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
            error={fieldErrors.advancePaymentValue}
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

          <FieldPanel
            label="Payment time limit"
            description="Pending token bookings are cancelled automatically after this many minutes."
            error={fieldErrors.pendingPaymentExpiryMinutes}
          >
            <input
              type="number"
              min="5"
              max="120"
              step="1"
              value={form.pendingPaymentExpiryMinutes}
              disabled={readOnly}
              onChange={(event) =>
                updateField("pendingPaymentExpiryMinutes", event.target.value)
              }
              className={inputClassName}
            />
          </FieldPanel>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClassName}>
          <SectionHeader
            title="Early Check-in Rules"
            description="Control same-day arrival before the configured check-in time. Fee waivers require Admin or Super Admin approval."
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ToggleRow
              title="Allow early check-in"
              description="Allows same-day arrival before the property check-in time."
              checked={form.earlyCheckInEnabled}
              readOnly={readOnly}
              onChange={(checked) => updateField("earlyCheckInEnabled", checked)}
            />
            <FieldPanel label="Fee type" description="No fee or a fixed early-arrival charge.">
              <select className={inputClassName} disabled={readOnly} value={form.earlyCheckInFeeType} onChange={(event) => updateField("earlyCheckInFeeType", event.target.value as BookingPolicyFormState["earlyCheckInFeeType"])}>
                <option value="NONE">No fee</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </FieldPanel>
            <FieldPanel label="Fixed fee" description="Applied only when fixed amount is selected." error={fieldErrors.earlyCheckInFeeValue}>
              <input className={inputClassName} type="number" min="0" disabled={readOnly || form.earlyCheckInFeeType === "NONE"} value={form.earlyCheckInFeeValue} onChange={(event) => updateField("earlyCheckInFeeValue", event.target.value)} />
            </FieldPanel>
          </div>
        </section>

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
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
              Guest cancellation is limited to pending or confirmed bookings before check-in. Staff corrections remain audited dashboard operations.
            </p>
          </div>
        </section>

        <section className={cardClassName}>
          <SectionHeader
            title="Late Checkout Tariff"
            description="Configure the server-owned charge when departure crosses the property checkout date."
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <FieldPanel label="Tariff type" description="Charge a rate multiplier or fixed amount per extra night.">
              <select className={inputClassName} disabled={readOnly} value={form.lateCheckoutFeeType} onChange={(event) => updateField("lateCheckoutFeeType", event.target.value as BookingPolicyFormState["lateCheckoutFeeType"])}>
                <option value="NIGHTLY_RATE_MULTIPLIER">Nightly-rate multiplier</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </FieldPanel>
            <FieldPanel label="Tariff value" description="Multiplier or fixed amount, depending on tariff type." error={fieldErrors.lateCheckoutFeeValue}>
              <input className={inputClassName} type="number" min="0" step="0.01" disabled={readOnly} value={form.lateCheckoutFeeValue} onChange={(event) => updateField("lateCheckoutFeeValue", event.target.value)} />
            </FieldPanel>
            <FieldPanel label="Grace period (minutes)" description="Same-day late checkout charges begin after this grace period." error={fieldErrors.lateCheckoutGraceMinutes}>
              <input className={inputClassName} type="number" min="0" max="1440" disabled={readOnly} value={form.lateCheckoutGraceMinutes} onChange={(event) => updateField("lateCheckoutGraceMinutes", event.target.value)} />
            </FieldPanel>
          </div>
        </section>

        <section className={cardClassName}>
          <SectionHeader
            title="Room Downgrade Policy"
            description="Define the financial outcome shown before a lower-priced room move commits."
          />
          <div className="mt-4 max-w-xl">
            <select className={inputClassName} disabled={readOnly} value={form.downgradeFinancialTreatment} onChange={(event) => updateField("downgradeFinancialTreatment", event.target.value as BookingPolicyFormState["downgradeFinancialTreatment"])}>
              <option value="NO_CREDIT">No credit</option>
              <option value="CREDIT_DIFFERENCE">Credit price difference</option>
              <option value="WAIVER">Admin decides with audit reason</option>
            </select>
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
            <FieldPanel
              label="Unused-night refund percentage"
              description="Percentage of eligible unused-night value presented for refund review."
              error={fieldErrors.earlyCheckoutRefundPercentage}
            >
              <input
                className={inputClassName}
                type="number"
                min="0"
                max="100"
                disabled={readOnly || !form.refundUnusedNights}
                value={form.earlyCheckoutRefundPercentage}
                onChange={(event) =>
                  updateField("earlyCheckoutRefundPercentage", event.target.value)
                }
              />
            </FieldPanel>
          </div>
        </section>

        <section className={cardClassName}>
          <SectionHeader
            title="No-show Rules"
            description="Control token handling and no-show marking after the check-in cutoff."
          />
          <div className="mt-4 space-y-3">
            <FieldPanel
              label="No-show after"
              description="A confirmed arrival can be marked no-show only after this property-local time."
              error={fieldErrors.noShowAfterTime}
            >
              <input
                className={inputClassName}
                type="time"
                disabled={readOnly}
                value={form.noShowAfterTime}
                onChange={(event) =>
                  updateField("noShowAfterTime", event.target.value)
                }
              />
            </FieldPanel>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
              Token refundability uses the single advance-payment setting above. All guest refund requests require staff review.
            </p>
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
        {fieldErrors.guestPolicyText && (
          <p className="mt-2 text-xs font-semibold text-rose-600">{fieldErrors.guestPolicyText}</p>
        )}
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
