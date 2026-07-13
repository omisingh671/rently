import ActiveToggle from "@/components/common/ActiveToggle";
import Button from "@/components/ui/Button";
import {
  formatDate,
  type CouponForm,
} from "@/features/pricing/pricingPage.helpers";
import type {
  AdminCoupon,
  DiscountType,
} from "@/features/pricing/types";
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

interface PricingCouponsSectionProps {
  form: CouponForm;
  editingCoupon: AdminCoupon | null;
  coupons: AdminCoupon[];
  isFetching: boolean;
  isMutating: boolean;
  onGuide: () => void;
  onFormChange: (patch: Partial<CouponForm>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onEdit: (coupon: AdminCoupon) => void;
  onActiveChange: (couponId: string, isActive: boolean) => void;
}

export function PricingCouponsSection({
  form,
  editingCoupon,
  coupons,
  isFetching,
  isMutating,
  onGuide,
  onFormChange,
  onSubmit,
  onCancel,
  onEdit,
  onActiveChange,
}: PricingCouponsSectionProps) {
  return (
    <section className={pricingSectionGridClass}>
      <div className={formCardClass}>
        <PricingFormHeader
          title={editingCoupon ? "Edit Coupon" : "Create Coupon"}
          guideLabel="Coupon Guide"
          onGuide={onGuide}
        />
        <p className="mt-3 text-sm text-slate-500">
          Define coupon codes and usage limits for guest-facing booking
          discounts.
        </p>
        <div className={formGridClass}>
          <label className={fieldClass}>
            <span>Coupon Code</span>
            <input
              value={form.code}
              onChange={(event) => onFormChange({ code: event.target.value })}
              placeholder="Example: WEEKEND10"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Coupon Name</span>
            <input
              value={form.name}
              onChange={(event) => onFormChange({ name: event.target.value })}
              placeholder="Example: Weekend offer"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Discount Type</span>
            <select
              value={form.discountType}
              onChange={(event) =>
                onFormChange({
                  discountType: event.target.value as DiscountType,
                })
              }
              className={inputClass}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span>Discount Value</span>
            <input
              value={form.discountValue}
              onChange={(event) =>
                onFormChange({ discountValue: Number(event.target.value) })
              }
              type="number"
              min={1}
              placeholder="Example: 10"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Maximum Uses</span>
            <input
              value={form.maxUses ?? ""}
              onChange={(event) =>
                onFormChange({
                  maxUses: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              type="number"
              min={1}
              placeholder="No limit"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Minimum Nights</span>
            <input
              value={form.minNights ?? ""}
              onChange={(event) =>
                onFormChange({
                  minNights: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              type="number"
              min={1}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
          <label className={`${fieldClass} sm:col-span-2`}>
            <span>Minimum Booking Amount</span>
            <input
              value={form.minAmount ?? ""}
              onChange={(event) =>
                onFormChange({
                  minAmount: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              type="number"
              min={1}
              placeholder="Optional"
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
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-1">
            <span className="text-sm font-medium text-slate-700">
              Once per User
            </span>
            <ActiveToggle
              checked={form.oncePerUser}
              onChange={(oncePerUser) => onFormChange({ oncePerUser })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-1">
            <span className="text-sm font-medium text-slate-700">Enabled</span>
            <ActiveToggle
              checked={form.isActive}
              onChange={(isActive) => onFormChange({ isActive })}
            />
          </div>
          <div className={actionRowClass}>
            <Button disabled={isMutating} onClick={onSubmit}>
              {editingCoupon ? "Save Coupon" : "Create Coupon"}
            </Button>
            {editingCoupon && (
              <Button variant="dark" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <PricingTable
        headers={[
          "Code",
          "Name",
          "Discount",
          "Once/User",
          "Validity",
          "Active",
          "Action",
        ]}
        loading={isFetching}
        empty={coupons.length === 0}
      >
        {coupons.map((coupon) => (
          <tr
            key={coupon.id}
            className="border-t border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <td className="px-4 py-3 font-medium">{coupon.code}</td>
            <td className="px-4 py-3">{coupon.name}</td>
            <td className="px-4 py-3">
              {coupon.discountValue} {coupon.discountType}
            </td>
            <td className="px-4 py-3">
              {coupon.oncePerUser ? (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  Yes
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </td>
            <td className="px-4 py-3">
              {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
            </td>
            <td className="px-4 py-3">
              <ActiveToggle
                checked={coupon.isActive}
                disabled={isMutating}
                onChange={(isActive) => onActiveChange(coupon.id, isActive)}
              />
            </td>
            <td className="px-4 py-3">
              <button
                className="text-indigo-600 hover:underline"
                onClick={() => onEdit(coupon)}
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
