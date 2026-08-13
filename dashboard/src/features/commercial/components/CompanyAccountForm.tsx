import { useState, type FormEvent } from "react";
import { FiBriefcase } from "react-icons/fi";
import Button from "@/components/ui/Button";
import type { CreateCompanyPayload } from "@/features/commercial/types";

const inputClass =
  "mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-sm font-medium text-slate-700";
const hintClass = "mt-1 block text-xs font-normal leading-5 text-slate-500";

const initialForm = {
  legalName: "",
  gstin: "",
  stateCode: "",
  billingAddress: "",
  contactEmail: "",
  creditLimit: "0",
  paymentTermsDays: "0",
};

type Props = {
  isSubmitting: boolean;
  onSubmit: (payload: CreateCompanyPayload) => Promise<boolean>;
};

export default function CompanyAccountForm({
  isSubmitting,
  onSubmit,
}: Props) {
  const [form, setForm] = useState(initialForm);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await onSubmit({
      legalName: form.legalName.trim(),
      gstin: form.gstin.trim() || undefined,
      stateCode: form.stateCode.trim() || undefined,
      billingAddress: form.billingAddress.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      creditLimit: Number(form.creditLimit),
      paymentTermsDays: Number(form.paymentTermsDays),
    });
    if (created) setForm(initialForm);
  };

  return (
    <form
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      onSubmit={submit}
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <FiBriefcase aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">
                Company Account <span className="font-normal text-slate-400">(Optional)</span>
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Create once and reuse this company in Bill To for future group stays.
              </p>
            </div>
          </div>
          <span className="whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
            Step 1
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <label className={labelClass}>
          Legal Name <span className="text-red-500">*</span>
          <input
            className={inputClass}
            required
            placeholder="e.g. Acme Technologies Private Limited"
            value={form.legalName}
            onChange={(event) =>
              setForm((current) => ({ ...current, legalName: event.target.value }))
            }
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            GSTIN <span className="font-normal text-slate-400">(Optional)</span>
            <input
              className={`${inputClass} uppercase`}
              placeholder="29ABCDE1234F1Z5"
              value={form.gstin}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  gstin: event.target.value.toUpperCase(),
                }))
              }
            />
          </label>
          <label className={labelClass}>
            State Code
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={2}
              placeholder="e.g. 29"
              value={form.stateCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, stateCode: event.target.value }))
              }
            />
          </label>
        </div>

        <label className={labelClass}>
          Billing Contact Email <span className="font-normal text-slate-400">(Optional)</span>
          <input
            className={inputClass}
            type="email"
            placeholder="accounts@company.com"
            value={form.contactEmail}
            onChange={(event) =>
              setForm((current) => ({ ...current, contactEmail: event.target.value }))
            }
          />
        </label>

        <label className={labelClass}>
          Billing Address <span className="font-normal text-slate-400">(Optional)</span>
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Registered billing address"
            value={form.billingAddress}
            onChange={(event) =>
              setForm((current) => ({ ...current, billingAddress: event.target.value }))
            }
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Credit Limit
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                ₹
              </span>
              <input
                className={`${inputClass} mt-0 pl-7`}
                min={0}
                step="0.01"
                type="number"
                value={form.creditLimit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, creditLimit: event.target.value }))
                }
              />
            </div>
            <span className={hintClass}>Maximum unpaid balance approved for this company.</span>
          </label>
          <label className={labelClass}>
            Payment Terms
            <div className="relative mt-1.5">
              <input
                className={`${inputClass} mt-0 pr-14`}
                min={0}
                max={365}
                type="number"
                value={form.paymentTermsDays}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentTermsDays: event.target.value }))
                }
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                days
              </span>
            </div>
            <span className={hintClass}>Days allowed to pay after invoicing; 30 means Net 30.</span>
          </label>
        </div>

        <p className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Credit Limit and Payment Terms are reference details only. Automated enforcement is
          not active yet.
        </p>

        <Button fullWidth type="submit" className="mt-auto h-11" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Company Account"}
        </Button>
      </div>
    </form>
  );
}
