import ActiveToggle from "@/components/common/ActiveToggle";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import {
  formatDate,
  getRateTarget,
  type RateForm,
} from "@/features/pricing/pricingPage.helpers";
import type {
  AdminRoomPricing,
  AdminRoomProduct,
  PricingTier,
  RateType,
} from "@/features/pricing/types";
import type { AdminRoom } from "@/features/rooms/types";
import type { AdminUnit } from "@/features/units/types";
import { PricingFormHeader } from "./PricingFormHeader";
import PricingTable from "./PricingTable";
import {
  actionRowClass,
  fieldClass,
  formCardClass,
  formGridClass,
  inputClass,
  pricingSectionGridClass,
} from "./pricingSectionStyles";

interface PricingRatesSectionProps {
  form: RateForm;
  editingRate: AdminRoomPricing | null;
  products: AdminRoomProduct[];
  units: AdminUnit[];
  rooms: AdminRoom[];
  rates: AdminRoomPricing[];
  isFetching: boolean;
  isMutating: boolean;
  onGuide: () => void;
  onFormChange: (patch: Partial<RateForm>) => void;
  onTargetTypeChange: (targetType: RateForm["targetType"]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onEdit: (rate: AdminRoomPricing) => void;
  onDelete: (rateId: string) => void;
}

export function PricingRatesSection({
  form,
  editingRate,
  products,
  units,
  rooms,
  rates,
  isFetching,
  isMutating,
  onGuide,
  onFormChange,
  onTargetTypeChange,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
}: PricingRatesSectionProps) {
  return (
    <section className={pricingSectionGridClass}>
      <div className={formCardClass}>
        <PricingFormHeader
          title={editingRate ? "Edit Price Rule" : "Create Price Rule"}
          guideLabel="Rate Guide"
          onGuide={onGuide}
        />
        <p className="mt-3 text-sm text-slate-500">
          Create property-wide rates first. Use overrides only when a specific
          unit or room has different pricing.
        </p>
        <div className={formGridClass}>
          <label className={`${fieldClass} sm:col-span-2`}>
            <span>Rate Product</span>
            <select
              value={form.productId}
              onChange={(event) =>
                onFormChange({ productId: event.target.value })
              }
              className={inputClass}
            >
              <option value="">Select rate product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${fieldClass} sm:col-span-2`}>
            <span>Applies To</span>
            <select
              value={form.targetType}
              onChange={(event) =>
                onTargetTypeChange(event.target.value as RateForm["targetType"])
              }
              className={inputClass}
            >
              <option value="PROPERTY">Property-wide</option>
              <option value="UNIT">Unit override</option>
              <option value="ROOM">Room override</option>
            </select>
          </label>
          {form.targetType === "UNIT" && (
            <label className={`${fieldClass} sm:col-span-2`}>
              <span>Unit Override</span>
              <select
                value={form.unitId}
                onChange={(event) =>
                  onFormChange({ unitId: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitNumber}
                  </option>
                ))}
              </select>
            </label>
          )}
          {form.targetType === "ROOM" && (
            <label className={`${fieldClass} sm:col-span-2`}>
              <span>Room Override</span>
              <select
                value={form.roomId}
                onChange={(event) =>
                  onFormChange({ roomId: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Select room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.unitNumber} / {room.number} - {room.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={fieldClass}>
            <span>Rate Type</span>
            <select
              value={form.rateType}
              onChange={(event) =>
                onFormChange({ rateType: event.target.value as RateType })
              }
              className={inputClass}
            >
              <option value="NIGHTLY">Nightly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Pricing Tier</span>
            <select
              value={form.pricingTier}
              onChange={(event) =>
                onFormChange({
                  pricingTier: event.target.value as PricingTier,
                })
              }
              className={inputClass}
            >
              <option value="STANDARD">Standard</option>
              <option value="CORPORATE">Corporate</option>
              <option value="SEASONAL">Seasonal</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Price</span>
            <input
              value={form.price}
              onChange={(event) =>
                onFormChange({ price: Number(event.target.value) })
              }
              type="number"
              min={1}
              placeholder="Price"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Minimum Nights</span>
            <input
              value={form.minNights}
              onChange={(event) =>
                onFormChange({ minNights: Number(event.target.value) })
              }
              type="number"
              min={1}
              placeholder="Min nights"
              className={inputClass}
            />
          </label>
          <label className={`${fieldClass} sm:col-span-2`}>
            <span>Maximum Nights</span>
            <input
              value={form.maxNights ?? ""}
              onChange={(event) =>
                onFormChange({
                  maxNights: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              type="number"
              min={1}
              placeholder="No max"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Valid From</span>
            <input
              value={form.validFrom}
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
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Tax inclusive
            </span>
            <ActiveToggle
              checked={form.taxInclusive}
              onChange={(taxInclusive) => onFormChange({ taxInclusive })}
            />
          </div>
          <div className={actionRowClass}>
            <Button disabled={isMutating} onClick={onSubmit}>
              {editingRate ? "Save Price Rule" : "Create Price Rule"}
            </Button>
            {editingRate && (
              <Button variant="dark" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <PricingTable
        headers={[
          "Rate Product",
          "Applies To",
          "Rate",
          "Price",
          "Validity",
          "Action",
        ]}
        loading={isFetching}
        empty={rates.length === 0}
      >
        {rates.map((rate) => (
          <tr
            key={rate.id}
            className="border-t border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <td className="px-4 py-3 font-medium">{rate.productName}</td>
            <td className="px-4 py-3">{getRateTarget(rate)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={rate.rateType} />
            </td>
            <td className="px-4 py-3">{rate.price}</td>
            <td className="px-4 py-3">
              {formatDate(rate.validFrom)} - {formatDate(rate.validTo)}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-3">
                <button
                  className="text-indigo-600 hover:underline"
                  onClick={() => onEdit(rate)}
                >
                  Edit
                </button>
                <button
                  className="text-rose-600 hover:underline"
                  onClick={() => onDelete(rate.id)}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </PricingTable>
    </section>
  );
}
