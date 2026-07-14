import { useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { useBillingSetting } from "@/features/billing/hooks";
import { normalizeApiError } from "@/utils/errors";

const { FiFileText } = ICON_REGISTRY;

type BillingSettingsFormState = {
  legalName: string;
  gstin: string;
  pan: string;
  billingAddress: string;
  invoicePrefix: string;
  receiptPrefix: string;
  creditNotePrefix: string;
  debitNotePrefix: string;
  footerNotes: string;
};

interface BillingSettingsSectionProps {
  propertyId: string | undefined;
  canEdit: boolean;
}

export default function BillingSettingsSection({
  propertyId,
  canEdit,
}: BillingSettingsSectionProps) {
  const billingSetting = useBillingSetting(propertyId);
  const error = billingSetting.error
    ? normalizeApiError(billingSetting.error).message
    : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-4">
        <span className="rounded-md bg-slate-100 p-2 text-slate-600">
          <FiFileText size={20} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Billing Settings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Legal and numbering details for the selected property.
          </p>
        </div>
      </div>

      {!propertyId ? (
        <div className="px-6 py-5 text-sm text-slate-500">
          Select a property to edit billing settings.
        </div>
      ) : billingSetting.isLoading ? (
        <div className="px-6 py-5 text-sm text-slate-500">
          Loading billing settings...
        </div>
      ) : billingSetting.data ? (
        <BillingSettingsForm
          key={propertyId}
          initialData={billingSetting.data}
          onSave={billingSetting.updateSetting}
          isUpdating={billingSetting.isUpdating}
          error={error}
          canEdit={canEdit}
        />
      ) : null}
    </section>
  );
}

interface BillingSettingsFormProps {
  initialData: NonNullable<ReturnType<typeof useBillingSetting>["data"]>;
  onSave: ReturnType<typeof useBillingSetting>["updateSetting"];
  isUpdating: boolean;
  error: string | null;
  canEdit: boolean;
}

function BillingSettingsForm({
  initialData,
  onSave,
  isUpdating,
  error,
  canEdit,
}: BillingSettingsFormProps) {
  const [form, setForm] = useState<BillingSettingsFormState>({
    legalName: initialData.legalName ?? "",
    gstin: initialData.gstin ?? "",
    pan: initialData.pan ?? "",
    billingAddress: initialData.billingAddress ?? "",
    invoicePrefix: initialData.invoicePrefix,
    receiptPrefix: initialData.receiptPrefix,
    creditNotePrefix: initialData.creditNotePrefix,
    debitNotePrefix: initialData.debitNotePrefix,
    footerNotes: initialData.footerNotes ?? "",
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const normalizeNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;

    await onSave({
      legalName: normalizeNullable(form.legalName),
      gstin: normalizeNullable(form.gstin),
      pan: normalizeNullable(form.pan),
      billingAddress: normalizeNullable(form.billingAddress),
      invoicePrefix: form.invoicePrefix.trim(),
      receiptPrefix: form.receiptPrefix.trim(),
      creditNotePrefix: form.creditNotePrefix.trim(),
      debitNotePrefix: form.debitNotePrefix.trim(),
      footerNotes: normalizeNullable(form.footerNotes),
    });
  };

  return (
    <form className="space-y-5 px-6 py-5" onSubmit={onSubmit}>
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Field
          label="Legal name"
          value={form.legalName}
          disabled={!canEdit}
          onChange={(value) => updateField("legalName", value)}
        />
        <Field
          label="GSTIN"
          value={form.gstin}
          disabled={!canEdit}
          onChange={(value) => updateField("gstin", value)}
        />
        <Field
          label="PAN"
          value={form.pan}
          disabled={!canEdit}
          onChange={(value) => updateField("pan", value)}
        />
        <Field
          label="Invoice prefix"
          value={form.invoicePrefix}
          disabled={!canEdit}
          onChange={(value) => updateField("invoicePrefix", value)}
        />
        <Field
          label="Receipt prefix"
          value={form.receiptPrefix}
          disabled={!canEdit}
          onChange={(value) => updateField("receiptPrefix", value)}
        />
        <Field
          label="Credit note prefix"
          value={form.creditNotePrefix}
          disabled={!canEdit}
          onChange={(value) => updateField("creditNotePrefix", value)}
        />
        <Field
          label="Debit note prefix"
          value={form.debitNotePrefix}
          disabled={!canEdit}
          onChange={(value) => updateField("debitNotePrefix", value)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          label="Billing address"
          value={form.billingAddress}
          disabled={!canEdit}
          onChange={(value) => updateField("billingAddress", value)}
        />
        <TextareaField
          label="Footer notes"
          value={form.footerNotes}
          disabled={!canEdit}
          onChange={(value) => updateField("footerNotes", value)}
        />
      </div>
      {canEdit ? (
        <Button
          type="submit"
          size="md"
          variant="primary"
          disabled={isUpdating}
        >
          {isUpdating ? "Saving..." : "Save Billing Settings"}
        </Button>
      ) : (
        <Button type="button" size="md" disabled>
          Read-only
        </Button>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <textarea
        className="mt-2 min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
