import { Link } from "react-router-dom";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { useBillingSetting } from "@/features/billing/hooks";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { normalizeApiError } from "@/utils/errors";
const { FiKey, FiUser, FiFileText } = ICON_REGISTRY;

type BillingSettingsFormState = {
  legalName: string;
  gstin: string;
  pan: string;
  billingAddress: string;
  invoicePrefix: string;
  receiptPrefix: string;
  creditNotePrefix: string;
  footerNotes: string;
};

import { adminPath, ADMIN_ROUTES } from "@/configs/routePathsAdmin";
import { useDashboardContext } from "@/features/dashboard/hooks";

export default function AdminSettingsPage() {
  const { data: context, isLoading, isError } = useDashboardContext();

  return (
    <div className="space-y-6">
      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load settings context.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          to={adminPath(ADMIN_ROUTES.PROFILE)}
          className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-slate-100 p-2 text-slate-600">
              <FiUser size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update your name and contact details.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to={adminPath(ADMIN_ROUTES.CHANGE_PASSWORD)}
          className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-slate-100 p-2 text-slate-600">
              <FiKey size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Change your password for dashboard access.
              </p>
            </div>
          </div>
        </Link>
      </section>

      {(context?.user.role === "SUPER_ADMIN" || context?.user.role === "ADMIN") && (
        <BillingSettingsSection />
      )}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Access Scope
          </h2>
        </div>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Role
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {isLoading ? "..." : (context?.user.role ?? "Unknown")}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Enabled Modules
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {isLoading ? "..." : (context?.modules.length ?? 0)}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Accessible Properties
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(context?.properties ?? []).length === 0 ? (
              <span className="text-sm text-slate-500">
                No properties assigned yet.
              </span>
            ) : (
              (context?.properties ?? []).map((property) => (
                <span
                  key={property.id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {property.name}
                </span>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function BillingSettingsSection() {
  const currentProperty = useCurrentProperty();
  const propertyId = currentProperty.selectedPropertyId || undefined;
  const billingSetting = useBillingSetting(propertyId);

  const error = billingSetting.error
    ? normalizeApiError(billingSetting.error).message
    : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
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
}

function BillingSettingsForm({
  initialData,
  onSave,
  isUpdating,
  error,
}: BillingSettingsFormProps) {
  const [form, setForm] = useState<BillingSettingsFormState>({
    legalName: initialData.legalName ?? "",
    gstin: initialData.gstin ?? "",
    pan: initialData.pan ?? "",
    billingAddress: initialData.billingAddress ?? "",
    invoicePrefix: initialData.invoicePrefix,
    receiptPrefix: initialData.receiptPrefix,
    creditNotePrefix: initialData.creditNotePrefix,
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
    await onSave({
      legalName: normalizeNullable(form.legalName),
      gstin: normalizeNullable(form.gstin),
      pan: normalizeNullable(form.pan),
      billingAddress: normalizeNullable(form.billingAddress),
      invoicePrefix: form.invoicePrefix.trim(),
      receiptPrefix: form.receiptPrefix.trim(),
      creditNotePrefix: form.creditNotePrefix.trim(),
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
          onChange={(value) => updateField("legalName", value)}
        />
        <Field
          label="GSTIN"
          value={form.gstin}
          onChange={(value) => updateField("gstin", value)}
        />
        <Field
          label="PAN"
          value={form.pan}
          onChange={(value) => updateField("pan", value)}
        />
        <Field
          label="Invoice prefix"
          value={form.invoicePrefix}
          onChange={(value) => updateField("invoicePrefix", value)}
        />
        <Field
          label="Receipt prefix"
          value={form.receiptPrefix}
          onChange={(value) => updateField("receiptPrefix", value)}
        />
        <Field
          label="Credit note prefix"
          value={form.creditNotePrefix}
          onChange={(value) => updateField("creditNotePrefix", value)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          label="Billing address"
          value={form.billingAddress}
          onChange={(value) => updateField("billingAddress", value)}
        />
        <TextareaField
          label="Footer notes"
          value={form.footerNotes}
          onChange={(value) => updateField("footerNotes", value)}
        />
      </div>
      <Button
        type="submit"
        size="md"
        variant="primary"
        disabled={isUpdating}
      >
        {isUpdating ? "Saving..." : "Save Billing Settings"}
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <textarea
        className="mt-2 min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
