import { useMemo, useState, type FormEvent } from "react";
import {
  FiBriefcase,
  FiChevronDown,
  FiEdit2,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type {
  CompanyAccount,
  UpdateCompanyPayload,
} from "@/features/commercial/types";

const inputClass =
  "mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-sm font-medium text-slate-700";

type CompanyForm = {
  legalName: string;
  tradeName: string;
  gstin: string;
  stateCode: string;
  billingAddress: string;
  contactName: string;
  contactEmail: string;
  contactNumber: string;
  creditLimit: string;
  paymentTermsDays: string;
  reason: string;
};

type Dialog =
  | { kind: "edit"; company: CompanyAccount; form: CompanyForm }
  | { kind: "lifecycle"; company: CompanyAccount; reason: string }
  | null;

const editForm = (company: CompanyAccount): CompanyForm => ({
  legalName: company.legalName,
  tradeName: company.tradeName ?? "",
  gstin: company.gstin ?? "",
  stateCode: company.stateCode ?? "",
  billingAddress: company.billingAddress ?? "",
  contactName: company.contactName ?? "",
  contactEmail: company.contactEmail ?? "",
  contactNumber: company.contactNumber ?? "",
  creditLimit: company.creditLimit,
  paymentTermsDays: String(company.paymentTermsDays),
  reason: "",
});

type Props = {
  companies: CompanyAccount[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string;
  onClearError: () => void;
  onAdd: () => void;
  onUpdate: (
    companyId: string,
    payload: UpdateCompanyPayload,
  ) => Promise<boolean>;
};

export default function CompanyAccountsManager({
  companies,
  isLoading,
  isSubmitting,
  error,
  onClearError,
  onAdd,
  onUpdate,
}: Props) {
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const visibleCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) =>
      [
        company.legalName,
        company.tradeName,
        company.gstin,
        company.contactEmail,
        company.contactNumber,
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [companies, search]);

  const close = () => {
    if (!isSubmitting) setDialog(null);
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== "edit" || dialog.form.reason.trim().length < 5) return;
    const { company, form } = dialog;
    const updated = await onUpdate(company.id, {
      legalName: form.legalName.trim(),
      tradeName: form.tradeName.trim() || null,
      gstin: form.gstin.trim().toUpperCase() || null,
      stateCode: form.stateCode.trim() || null,
      billingAddress: form.billingAddress.trim() || null,
      contactName: form.contactName.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      contactNumber: form.contactNumber.trim() || null,
      creditLimit: Number(form.creditLimit),
      paymentTermsDays: Number(form.paymentTermsDays),
      reason: form.reason.trim(),
    });
    if (updated) setDialog(null);
  };

  const submitLifecycle = async (event: FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== "lifecycle" || dialog.reason.trim().length < 5) return;
    const updated = await onUpdate(dialog.company.id, {
      isActive: !dialog.company.isActive,
      reason: dialog.reason.trim(),
    });
    if (updated) setDialog(null);
  };

  const setEditField = (field: keyof CompanyForm, value: string) => {
    setDialog((current) =>
      current?.kind === "edit"
        ? { ...current, form: { ...current.form, [field]: value } }
        : current,
    );
  };

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="group flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          aria-controls="company-accounts-content"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <FiBriefcase aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <h2 className="font-semibold text-slate-900">Manage Company Accounts</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Edit billing records or deactivate accounts that should not be used for new groups.
            </p>
          </span>
          <FiChevronDown
            className={`ml-auto size-5 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <Button className="w-full sm:w-52" size="sm" icon={<FiPlus />} onClick={onAdd}>Add Company Account</Button>
      </div>

      {isExpanded && <div id="company-accounts-content" className="flex flex-1 flex-col p-5">
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Search company accounts</span>
          <span className="relative block">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              type="search"
              placeholder="Search by company, GSTIN, email, or contact"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </span>
        </label>
        {isLoading ? (
          <div className="space-y-2" aria-label="Loading company accounts">
            {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : visibleCompanies.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            {companies.length === 0 ? "No company accounts yet." : "No company accounts match this search."}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {visibleCompanies.map((company) => (
              <div key={company.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{company.legalName}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${company.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {company.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {company.gstin ?? "No GSTIN"} · {company.contactEmail ?? "No billing email"} · Net {company.paymentTermsDays}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FiEdit2 />}
                    onClick={() => {
                      onClearError();
                      setDialog({ kind: "edit", company, form: editForm(company) });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={company.isActive ? "danger" : "success"}
                    outline
                    onClick={() => {
                      onClearError();
                      setDialog({ kind: "lifecycle", company, reason: "" });
                    }}
                  >
                    {company.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      <Modal
        isOpen={dialog?.kind === "edit"}
        onClose={close}
        title="Edit Company Account"
        size="lg"
        disableBackdropClose={isSubmitting}
        disableEscapeClose={isSubmitting}
      >
        {dialog?.kind === "edit" && (
          <form className="space-y-4" onSubmit={submitEdit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Legal Name *<input required maxLength={190} className={inputClass} value={dialog.form.legalName} onChange={(event) => setEditField("legalName", event.target.value)} /></label>
              <label className={labelClass}>Trade Name<input maxLength={190} className={inputClass} value={dialog.form.tradeName} onChange={(event) => setEditField("tradeName", event.target.value)} /></label>
              <label className={labelClass}>GSTIN<input maxLength={15} className={`${inputClass} uppercase`} value={dialog.form.gstin} onChange={(event) => setEditField("gstin", event.target.value.toUpperCase())} /></label>
              <label className={labelClass}>State Code<input inputMode="numeric" maxLength={2} className={inputClass} value={dialog.form.stateCode} onChange={(event) => setEditField("stateCode", event.target.value)} /></label>
              <label className={labelClass}>Contact Name<input maxLength={190} className={inputClass} value={dialog.form.contactName} onChange={(event) => setEditField("contactName", event.target.value)} /></label>
              <label className={labelClass}>Contact Number<input maxLength={40} className={inputClass} value={dialog.form.contactNumber} onChange={(event) => setEditField("contactNumber", event.target.value)} /></label>
              <label className={labelClass}>Billing Email<input type="email" maxLength={190} className={inputClass} value={dialog.form.contactEmail} onChange={(event) => setEditField("contactEmail", event.target.value)} /></label>
              <label className={labelClass}>Payment Terms (days)<input type="number" min={0} max={365} required className={inputClass} value={dialog.form.paymentTermsDays} onChange={(event) => setEditField("paymentTermsDays", event.target.value)} /></label>
              <label className={labelClass}>Credit Limit<input type="number" min={0} max={100000000} step="0.01" required className={inputClass} value={dialog.form.creditLimit} onChange={(event) => setEditField("creditLimit", event.target.value)} /></label>
              <label className={`${labelClass} sm:col-span-2`}>Billing Address<textarea maxLength={2000} className="mt-1.5 min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={dialog.form.billingAddress} onChange={(event) => setEditField("billingAddress", event.target.value)} /></label>
            </div>
            <label className={labelClass}>Audit Reason *<textarea required minLength={5} maxLength={500} className="mt-1.5 min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Why is this company account being updated?" value={dialog.form.reason} onChange={(event) => setEditField("reason", event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Required, at least 5 characters. Stored in audit history.</span></label>
            {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={isSubmitting} onClick={close}>Cancel</Button><Button type="submit" disabled={isSubmitting || dialog.form.reason.trim().length < 5}>{isSubmitting ? "Saving..." : "Save Changes"}</Button></div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={dialog?.kind === "lifecycle"}
        onClose={close}
        title={dialog?.kind === "lifecycle" && dialog.company.isActive ? "Deactivate Company Account" : "Reactivate Company Account"}
        size="sm"
        disableBackdropClose={isSubmitting}
        disableEscapeClose={isSubmitting}
      >
        {dialog?.kind === "lifecycle" && (
          <form className="space-y-5" onSubmit={submitLifecycle}>
            <p className="text-sm leading-6 text-slate-600">
              {dialog.company.isActive
                ? <><strong>{dialog.company.legalName}</strong> will no longer appear in Bill To for new groups. Existing groups and financial history stay linked.</>
                : <><strong>{dialog.company.legalName}</strong> will become available in Bill To for new groups again.</>}
            </p>
            <label className={labelClass}>Audit Reason *<textarea autoFocus required minLength={5} maxLength={500} className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={dialog.reason} onChange={(event) => setDialog({ ...dialog, reason: event.target.value })} /></label>
            {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={isSubmitting} onClick={close}>Cancel</Button><Button type="submit" variant={dialog.company.isActive ? "danger" : "success"} disabled={isSubmitting || dialog.reason.trim().length < 5}>{isSubmitting ? "Saving..." : dialog.company.isActive ? "Deactivate" : "Reactivate"}</Button></div>
          </form>
        )}
      </Modal>
    </section>
  );
}
