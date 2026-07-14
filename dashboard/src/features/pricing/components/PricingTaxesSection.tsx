import ActiveToggle from "@/components/common/ActiveToggle";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import type { TaxForm } from "@/features/pricing/pricingPage.helpers";
import type {
  AdminTax,
  TaxCalculationMode,
  TaxCategory,
  TaxScope,
  TaxTargetType,
  TaxType,
} from "@/features/pricing/types";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { PricingFormHeader } from "./PricingFormHeader";
import PricingTable from "./PricingTable";
import {
  actionRowClass,
  disabledInputClass,
  fieldClass,
  formCardClass,
  formGridClass,
  inputClass,
  pricingSectionGridClass,
} from "./pricingSectionStyles";

interface PricingTaxesSectionProps {
  form: TaxForm;
  editingTax: AdminTax | null;
  taxes: AdminTax[];
  isFetching: boolean;
  isMutating: boolean;
  onGuide: () => void;
  onFormChange: (patch: Partial<TaxForm>) => void;
  onCalculationModeChange: (mode: TaxCalculationMode) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onEdit: (tax: AdminTax) => void;
  onActiveChange: (taxId: string, isActive: boolean) => void;
}

export function PricingTaxesSection({
  form,
  editingTax,
  taxes,
  isFetching,
  isMutating,
  onGuide,
  onFormChange,
  onCalculationModeChange,
  onSubmit,
  onCancel,
  onEdit,
  onActiveChange,
}: PricingTaxesSectionProps) {
  const isFlatTaxRule = form.calculationMode === "FLAT";

  return (
    <section className={pricingSectionGridClass}>
      <div className={formCardClass}>
        <PricingFormHeader
          title={editingTax ? "Edit Tax" : "Create Tax"}
          guideLabel="Tax Guide"
          onGuide={onGuide}
        />
        <p className="mt-3 text-sm text-slate-500">
          Configure GST/tax rules used by backend quote and booking totals.
        </p>
        <div className={formGridClass}>
          <label className={`${fieldClass} sm:col-span-2`}>
            <span>Tax Name</span>
            <input
              value={form.name}
              onChange={(event) => onFormChange({ name: event.target.value })}
              placeholder="Example: GST"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) =>
                onFormChange({
                  category: event.target.value as TaxCategory,
                })
              }
              className={inputClass}
            >
              <option value="GST">GST</option>
              <option value="GENERIC">Generic</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Scope</span>
            <select
              value={form.scope}
              onChange={(event) =>
                onFormChange({ scope: event.target.value as TaxScope })
              }
              className={inputClass}
            >
              <option value="ACCOMMODATION">Accommodation</option>
              <option value="BOOKING">Booking</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Tax Rate / Amount</span>
            <input
              value={form.rate === "" ? "" : form.rate}
              onChange={(event) =>
                onFormChange({
                  rate:
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value),
                })
              }
              type="number"
              min={0}
              placeholder="Example: 12"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Tax Type</span>
            <select
              value={form.taxType}
              onChange={(event) =>
                onFormChange({ taxType: event.target.value as TaxType })
              }
              className={inputClass}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Applies To</span>
            <select
              value={form.targetType}
              onChange={(event) =>
                onFormChange({
                  targetType: event.target.value as TaxTargetType,
                })
              }
              className={inputClass}
            >
              <option value="ALL">All accommodation</option>
              <option value="ROOM">Rooms only</option>
              <option value="UNIT">Units only</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Calculation</span>
            <select
              value={form.calculationMode}
              onChange={(event) =>
                onCalculationModeChange(
                  event.target.value as TaxCalculationMode,
                )
              }
              className={inputClass}
            >
              <option value="SLAB_PER_ITEM_NIGHTLY_TARIFF">
                Slab by nightly tariff
              </option>
              <option value="FLAT">Flat rule</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Min Tariff</span>
            <input
              value={form.minTariff ?? ""}
              onChange={(event) =>
                onFormChange({
                  minTariff:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                })
              }
              type="number"
              min={0}
              placeholder="Example: 0"
              disabled={isFlatTaxRule}
              className={`${inputClass} ${disabledInputClass}`}
            />
            {isFlatTaxRule && (
              <span className="text-xs font-normal leading-5 text-slate-500">
                Flat taxes do not use tariff slabs.
              </span>
            )}
          </label>
          <label className={fieldClass}>
            <span>Max Tariff</span>
            <input
              value={form.maxTariff ?? ""}
              onChange={(event) =>
                onFormChange({
                  maxTariff:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                })
              }
              type="number"
              min={0}
              placeholder="Leave empty for no limit"
              disabled={isFlatTaxRule}
              className={`${inputClass} ${disabledInputClass}`}
            />
            {isFlatTaxRule && (
              <span className="text-xs font-normal leading-5 text-slate-500">
                Not used for flat rules.
              </span>
            )}
          </label>
          <label className={fieldClass}>
            <span>Valid From</span>
            <input
              value={form.validFrom ?? ""}
              onChange={(event) =>
                onFormChange({ validFrom: event.target.value })
              }
              type="date"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Valid To</span>
            <input
              value={form.validTo ?? ""}
              onChange={(event) =>
                onFormChange({ validTo: event.target.value })
              }
              type="date"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Priority</span>
            <input
              value={form.priority}
              onChange={(event) =>
                onFormChange({ priority: Number(event.target.value) })
              }
              type="number"
              className={inputClass}
            />
          </label>
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Refundable
            </span>
            <ActiveToggle
              checked={form.isRefundable}
              onChange={(isRefundable) => onFormChange({ isRefundable })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Enabled</span>
            <ActiveToggle
              checked={form.isActive}
              onChange={(isActive) => onFormChange({ isActive })}
            />
          </div>
          <div className={actionRowClass}>
            <Button disabled={isMutating} onClick={onSubmit}>
              {editingTax ? "Save Tax" : "Create Tax"}
            </Button>
            {editingTax && (
              <Button variant="dark" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <PricingTable
        headers={["Name", "Rule", "Slab", "Rate", "Active", "Action"]}
        loading={isFetching}
        empty={taxes.length === 0}
      >
        {taxes.map((tax) => (
          <tr
            key={tax.id}
            className="border-t border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <td className="px-4 py-3 font-medium">{tax.name}</td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-1">
                <StatusBadge status={tax.category} />
                <span className="text-xs text-slate-500">
                  {formatEnumLabel(tax.scope)} /{" "}
                  {formatEnumLabel(tax.targetType)}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-slate-600">
              {tax.calculationMode === "SLAB_PER_ITEM_NIGHTLY_TARIFF"
                ? `${tax.minTariff ?? "0"} - ${tax.maxTariff ?? "No limit"}`
                : "Not used"}
            </td>
            <td className="px-4 py-3">
              {tax.rate} {tax.taxType === "PERCENTAGE" ? "%" : "INR"}
            </td>
            <td className="px-4 py-3">
              <ActiveToggle
                checked={tax.isActive}
                disabled={isMutating}
                onChange={(isActive) => onActiveChange(tax.id, isActive)}
              />
            </td>
            <td className="px-4 py-3">
              <button
                className="text-indigo-600 hover:underline"
                onClick={() => onEdit(tax)}
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </PricingTable>
    </section>
  );
}
