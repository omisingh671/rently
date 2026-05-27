import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ActiveToggle from "@/components/common/ActiveToggle";
import StatusBadge from "@/components/common/StatusBadge";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { HiChevronDown } from "react-icons/hi2";
import { FiInfo } from "react-icons/fi";
import { useAdminRooms } from "@/features/rooms/hooks/useAdminRooms";
import { useAdminUnits } from "@/features/units/hooks/useAdminUnits";
import { useAdminPricing } from "@/features/pricing/hooks/useAdminPricing";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import { normalizeApiError } from "@/utils/errors";
import PricingTable from "@/features/pricing/components/PricingTable";
import {
  couponSchema,
  dateInput,
  emptyCoupon,
  emptyProduct,
  emptyRate,
  emptyTax,
  formatDate,
  getRateTarget,
  productSchema,
  rateSchema,
  tabs,
  taxSchema,
  type CouponForm,
  type ProductForm,
  type RateForm,
  type Tab,
  type TaxForm,
} from "@/features/pricing/pricingPage.helpers";
import type {
  AdminCoupon,
  AdminRoomPricing,
  AdminRoomProduct,
  AdminTax,
  CouponPayload,
  DiscountType,
  PricingTier,
  ProductPayload,
  RatePayload,
  RateType,
  RoomProductCategory,
  TaxCalculationMode,
  TaxCategory,
  TaxScope,
  TaxTargetType,
  TaxPayload,
  TaxType,
} from "@/features/pricing/types";

const formCardClass =
  "rounded-md border border-slate-200 bg-white p-6 shadow-sm";
const formGridClass = "mt-5 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2";
const fieldClass =
  "flex flex-col gap-2 text-sm font-medium text-slate-700 [&>span]:leading-none";
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100";
const disabledInputClass =
  "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const actionRowClass =
  "flex flex-wrap gap-2 border-t border-slate-100 pt-5 sm:col-span-2";

type PricingGuide = {
  title: string;
  intro: string;
  sections: Array<{
    heading: string;
    items: string[];
  }>;
};

const pricingGuides: Record<Tab, PricingGuide> = {
  products: {
    title: "Rate Product Guide",
    intro:
      "Rate products are reusable sellable pricing types. Create these first, then attach prices to them from Price Rules / Rates.",
    sections: [
      {
        heading: "Common examples",
        items: ["Single Non-AC", "Double AC", "Dorm Bed", "Whole Unit AC"],
      },
      {
        heading: "Fields",
        items: [
          "Rate Product Name is the internal product guests will be priced against.",
          "Occupancy is the number of guests this product covers.",
          "AC rate product marks whether this product is for AC or Non-AC inventory.",
          "Product Category groups the product as nightly, long stay, or corporate.",
        ],
      },
    ],
  },
  rates: {
    title: "Price Rule Guide",
    intro:
      "Price rules are the actual pricing engine. They decide what amount is used for quote and booking calculations.",
    sections: [
      {
        heading: "How to use",
        items: [
          "Start with a property-wide nightly rate for each rate product.",
          "Use unit or room overrides only when one unit or room has different pricing.",
          "Weekly and monthly rates support longer stay pricing without creating duplicate products.",
        ],
      },
      {
        heading: "Tax inclusive",
        items: [
          "Tax inclusive means the entered price already includes tax.",
          "Backend only extracts or applies tax when an active matching tax exists.",
          "If matching taxes are disabled, no tax is applied even when Tax inclusive is checked.",
        ],
      },
    ],
  },
  taxes: {
    title: "Tax Guide",
    intro:
      "Taxes are calculated by the backend during quote and booking creation. Use slabs for accommodation GST and flat rules for booking-level charges.",
    sections: [
      {
        heading: "Normal GST setup",
        items: [
          "Create GST 5% with Category GST, Scope Accommodation, Calculation Slab by nightly tariff, Min 0, Max 7500.",
          "Create GST 18% with Category GST, Scope Accommodation, Calculation Slab by nightly tariff, Min 7500, Max empty.",
          "Only one GST slab applies to each booking item, and multi-room bookings sum item-wise tax.",
        ],
      },
      {
        heading: "Flat and fixed examples",
        items: [
          "Booking-level flat tax: use Scope Booking and Calculation Flat rule.",
          "Platform fee Rs. 5: use Tax Type Fixed, Rate / Amount 5, Scope Booking, Calculation Flat rule.",
          "Generic percentage service tax: use Tax Type Percentage, Scope Booking or Accommodation, Calculation Flat rule.",
        ],
      },
      {
        heading: "Important fields",
        items: [
          "Percentage uses the rate as a percent. Fixed uses the rate as an INR amount.",
          "Min Tariff and Max Tariff are only for slab by nightly tariff.",
          "Priority controls ordering when rules need deterministic selection.",
          "Disabled taxes are not applied to quotes or bookings.",
          "Coupons reduce taxable value before tax.",
        ],
      },
    ],
  },
  coupons: {
    title: "Coupon Guide",
    intro:
      "Coupons reduce the booking amount before tax when they match the guest booking.",
    sections: [
      {
        heading: "Discount setup",
        items: [
          "Percentage discount uses Discount Value as a percent, such as 10 for 10%.",
          "Fixed discount uses Discount Value as an INR amount.",
          "Minimum nights and minimum booking amount restrict when the coupon can apply.",
        ],
      },
      {
        heading: "Usage controls",
        items: [
          "Maximum uses limits total redemptions.",
          "Once per User prevents the same guest account from reusing the coupon.",
          "Valid From and Valid To control the booking date window.",
          "Disabled coupons are ignored by public quote and booking calculations.",
        ],
      },
    ],
  },
};

function FormHeader({
  title,
  guideLabel,
  onGuide,
}: {
  title: string;
  guideLabel: string;
  onGuide: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={<FiInfo />}
        onClick={onGuide}
      >
        {guideLabel}
      </Button>
    </div>
  );
}

function PricingGuideContent({ guide }: { guide: PricingGuide }) {
  return (
    <div className="space-y-5 text-sm text-slate-600">
      <p>{guide.intro}</p>
      {guide.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">
            {section.heading}
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [helpTopic, setHelpTopic] = useState<Tab | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminRoomProduct | null>(
    null,
  );
  const [editingRate, setEditingRate] = useState<AdminRoomPricing | null>(null);
  const [editingTax, setEditingTax] = useState<AdminTax | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);

  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [rateForm, setRateForm] = useState<RateForm>(emptyRate);
  const [taxForm, setTaxForm] = useState<TaxForm>(emptyTax);
  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCoupon);

  const { properties, selectedPropertyId, setSelectedPropertyId } =
    useCurrentProperty();

  const { products, rates, taxes, coupons, isFetching, isMutating, ...actions } =
    useAdminPricing(selectedPropertyId);

  const { data: unitsData } = useAdminUnits(selectedPropertyId, 1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const units = unitsData?.items ?? [];

  const { data: roomsData } = useAdminRooms(selectedPropertyId, 1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const rooms = roomsData?.items ?? [];
  const isFlatTaxRule = taxForm.calculationMode === "FLAT";

  const submitProduct = async () => {
    setError(null);
    const payload = productSchema.parse(productForm) satisfies ProductPayload;
    try {
      if (editingProduct) {
        await actions.updateProduct({
          productId: editingProduct.id,
          payload,
        });
      } else {
        await actions.createProduct(payload);
      }
      setProductForm(emptyProduct);
      setEditingProduct(null);
    } catch {
      setError("Could not save product");
    }
  };

  const submitRate = async () => {
    setError(null);
    const parsed = rateSchema.parse(rateForm);
    const payload: RatePayload = {
      productId: parsed.productId,
      rateType: parsed.rateType,
      pricingTier: parsed.pricingTier,
      minNights: parsed.minNights,
      ...(parsed.maxNights !== undefined && { maxNights: parsed.maxNights }),
      taxInclusive: parsed.taxInclusive,
      price: parsed.price,
      validFrom: parsed.validFrom,
      ...(parsed.validTo && { validTo: parsed.validTo }),
      ...(parsed.targetType === "PROPERTY" && {
        unitId: null,
        roomId: null,
      }),
      ...(parsed.targetType === "UNIT" &&
        parsed.unitId && { unitId: parsed.unitId }),
      ...(parsed.targetType === "ROOM" &&
        parsed.roomId && { roomId: parsed.roomId }),
    };

    try {
      if (editingRate) {
        await actions.updateRate({ rateId: editingRate.id, payload });
      } else {
        await actions.createRate(payload);
      }
      setRateForm(emptyRate);
      setEditingRate(null);
    } catch (error) {
      setError(normalizeApiError(error).message);
    }
  };

  const submitTax = async () => {
    setError(null);
    const result = taxSchema.safeParse(taxForm);
    if (!result.success) {
      setError("Tax rate / amount is required");
      return;
    }

    const parsed = result.data;
    const payload: TaxPayload = {
      ...parsed,
      minTariff:
        parsed.calculationMode === "FLAT" ? null : parsed.minTariff ?? null,
      maxTariff:
        parsed.calculationMode === "FLAT" ? null : parsed.maxTariff ?? null,
      validFrom: parsed.validFrom || null,
      validTo: parsed.validTo || null,
      appliesTo: parsed.targetType,
    };
    try {
      if (editingTax) {
        await actions.updateTax({ taxId: editingTax.id, payload });
      } else {
        await actions.createTax(payload);
      }
      setTaxForm(emptyTax);
      setEditingTax(null);
    } catch (error) {
      setError(normalizeApiError(error).message);
    }
  };

  const submitCoupon = async () => {
    setError(null);
    const parsed = couponSchema.parse(couponForm);
    const payload: CouponPayload = {
      code: parsed.code,
      name: parsed.name,
      discountType: parsed.discountType,
      discountValue: parsed.discountValue,
      ...(parsed.maxUses !== undefined && { maxUses: parsed.maxUses }),
      ...(parsed.minNights !== undefined && { minNights: parsed.minNights }),
      ...(parsed.minAmount !== undefined && { minAmount: parsed.minAmount }),
      validFrom: parsed.validFrom,
      ...(parsed.validTo && { validTo: parsed.validTo }),
      isActive: parsed.isActive,
      oncePerUser: parsed.oncePerUser,
    };

    try {
      if (editingCoupon) {
        await actions.updateCoupon({ couponId: editingCoupon.id, payload });
      } else {
        await actions.createCoupon(payload);
      }
      setCouponForm(emptyCoupon);
      setEditingCoupon(null);
    } catch {
      setError("Could not save coupon");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className={`relative py-1 rounded-md text-sm bg-white text-slate-700 transition-all duration-300 border border-slate-300 focus-within:ring-2 focus-within:ring-slate-300 ${
          activeTab === "products" || activeTab === "taxes"
            ? "w-full sm:w-64 xl:w-[380px]"
            : "w-full sm:w-64 xl:w-[420px]"
        }`}>
          <select
            value={selectedPropertyId || ""}
            onChange={(event) => {
              setError(null);
              setSelectedPropertyId(event.target.value || null);
            }}
            className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setError(null);
                setActiveTab(tab.key);
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!selectedPropertyId ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          No accessible properties found.
        </div>
      ) : (
        <>
          {activeTab === "products" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
              <div className={formCardClass}>
                <FormHeader
                  title={editingProduct ? "Edit Rate Product" : "Create Rate Product"}
                  guideLabel="Product Guide"
                  onGuide={() => setHelpTopic("products")}
                />
                <p className="mt-3 text-sm text-slate-500">
                  Define reusable internal pricing types such as Single AC,
                  Double Non-AC, or Whole Unit AC.
                </p>
                <div className={formGridClass}>
                  <label className={`${fieldClass} sm:col-span-2`}>
                    <span>Rate Product Name</span>
                    <input
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Example: Single AC"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Occupancy</span>
                    <input
                      value={productForm.occupancy}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          occupancy: Number(event.target.value),
                        }))
                      }
                      type="number"
                      min={1}
                      placeholder="Guests covered"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Product Category</span>
                    <select
                      value={productForm.category}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          category: event.target.value as RoomProductCategory,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="NIGHTLY">Nightly</option>
                      <option value="LONG_STAY">Long stay</option>
                      <option value="CORPORATE">Corporate</option>
                    </select>
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">AC rate product</span>
                    <ActiveToggle
                      checked={productForm.hasAC}
                      onChange={(checked) =>
                        setProductForm((prev) => ({
                          ...prev,
                          hasAC: checked,
                        }))
                      }
                    />
                  </div>
                  <div className={actionRowClass}>
                    <Button disabled={isMutating} onClick={submitProduct}>
                      {editingProduct ? "Save Rate Product" : "Create Rate Product"}
                    </Button>
                    {editingProduct && (
                      <Button
                        variant="dark"
                        onClick={() => {
                          setEditingProduct(null);
                          setProductForm(emptyProduct);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <PricingTable
                headers={["Name", "Occupancy", "Category", "Type", "Action"]}
                loading={isFetching}
                empty={products.length === 0}
              >
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3">{product.occupancy}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.category} />
                    </td>
                    <td className="px-4 py-3">
                      {product.hasAC ? "AC" : "Non-AC"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-indigo-600 hover:underline"
                        onClick={() => {
                          setEditingProduct(product);
                          setProductForm({
                            name: product.name,
                            occupancy: product.occupancy,
                            hasAC: product.hasAC,
                            category: product.category,
                          });
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </PricingTable>
            </section>
          )}

          {activeTab === "rates" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
              <div className={formCardClass}>
                <FormHeader
                  title={editingRate ? "Edit Price Rule" : "Create Price Rule"}
                  guideLabel="Rate Guide"
                  onGuide={() => setHelpTopic("rates")}
                />
                <p className="mt-3 text-sm text-slate-500">
                  Create property-wide rates first. Use overrides only when a
                  specific unit or room has different pricing.
                </p>
                <div className={formGridClass}>
                  <label className={`${fieldClass} sm:col-span-2`}>
                    <span>Rate Product</span>
                    <select
                      value={rateForm.productId}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          productId: event.target.value,
                        }))
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
                      value={rateForm.targetType}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          targetType: event.target.value as RateForm["targetType"],
                          unitId: "",
                          roomId: "",
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="PROPERTY">Property-wide</option>
                      <option value="UNIT">Unit override</option>
                      <option value="ROOM">Room override</option>
                    </select>
                  </label>
                  {rateForm.targetType === "UNIT" && (
                    <label className={`${fieldClass} sm:col-span-2`}>
                      <span>Unit Override</span>
                      <select
                        value={rateForm.unitId}
                        onChange={(event) =>
                          setRateForm((prev) => ({
                            ...prev,
                            unitId: event.target.value,
                          }))
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
                  {rateForm.targetType === "ROOM" && (
                    <label className={`${fieldClass} sm:col-span-2`}>
                      <span>Room Override</span>
                      <select
                        value={rateForm.roomId}
                        onChange={(event) =>
                          setRateForm((prev) => ({
                            ...prev,
                            roomId: event.target.value,
                          }))
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
                      value={rateForm.rateType}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          rateType: event.target.value as RateType,
                        }))
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
                      value={rateForm.pricingTier}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          pricingTier: event.target.value as PricingTier,
                        }))
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
                      value={rateForm.price}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          price: Number(event.target.value),
                        }))
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
                      value={rateForm.minNights}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          minNights: Number(event.target.value),
                        }))
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
                      value={rateForm.maxNights ?? ""}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          maxNights: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
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
                      value={rateForm.validFrom}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          validFrom: event.target.value,
                        }))
                      }
                      type="date"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Valid To</span>
                    <input
                      value={rateForm.validTo ?? ""}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          validTo: event.target.value,
                        }))
                      }
                      type="date"
                      className={inputClass}
                    />
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Tax inclusive</span>
                    <ActiveToggle
                      checked={rateForm.taxInclusive}
                      onChange={(checked) =>
                        setRateForm((prev) => ({
                          ...prev,
                          taxInclusive: checked,
                        }))
                      }
                    />
                  </div>
                  <div className={actionRowClass}>
                    <Button disabled={isMutating} onClick={submitRate}>
                      {editingRate ? "Save Price Rule" : "Create Price Rule"}
                    </Button>
                    {editingRate && (
                      <Button
                        variant="dark"
                        onClick={() => {
                          setEditingRate(null);
                          setRateForm(emptyRate);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <PricingTable
                headers={["Rate Product", "Applies To", "Rate", "Price", "Validity", "Action"]}
                loading={isFetching}
                empty={rates.length === 0}
              >
                {rates.map((rate) => (
                  <tr key={rate.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
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
                          onClick={() => {
                            setEditingRate(rate);
                            setRateForm({
                              productId: rate.productId,
                              targetType: rate.roomId
                                ? "ROOM"
                                : rate.unitId
                                  ? "UNIT"
                                  : "PROPERTY",
                              unitId: rate.unitId ?? "",
                              roomId: rate.roomId ?? "",
                              rateType: rate.rateType,
                              pricingTier: rate.pricingTier,
                              minNights: rate.minNights,
                              maxNights: rate.maxNights ?? undefined,
                              taxInclusive: rate.taxInclusive,
                              price: Number(rate.price),
                              validFrom: dateInput(rate.validFrom),
                              validTo: dateInput(rate.validTo),
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-rose-600 hover:underline"
                          onClick={() => {
                            void actions.deleteRate(rate.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </PricingTable>
            </section>
          )}

          {activeTab === "taxes" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
              <div className={formCardClass}>
                <FormHeader
                  title={editingTax ? "Edit Tax" : "Create Tax"}
                  guideLabel="Tax Guide"
                  onGuide={() => setHelpTopic("taxes")}
                />
                <p className="mt-3 text-sm text-slate-500">
                  Configure GST/tax rules used by backend quote and booking
                  totals.
                </p>
                <div className={formGridClass}>
                  <label className={`${fieldClass} sm:col-span-2`}>
                    <span>Tax Name</span>
                    <input
                      value={taxForm.name}
                      onChange={(event) =>
                        setTaxForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Example: GST"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Category</span>
                    <select
                      value={taxForm.category}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          category: event.target.value as TaxCategory,
                        }))
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
                      value={taxForm.scope}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          scope: event.target.value as TaxScope,
                        }))
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
                      value={taxForm.rate === "" ? "" : taxForm.rate}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          rate:
                            event.target.value === ""
                              ? ""
                              : Number(event.target.value),
                        }))
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
                      value={taxForm.taxType}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          taxType: event.target.value as TaxType,
                        }))
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
                      value={taxForm.targetType}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          targetType: event.target.value as TaxTargetType,
                        }))
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
                      value={taxForm.calculationMode}
                      onChange={(event) => {
                        const calculationMode = event.target
                          .value as TaxCalculationMode;
                        setTaxForm((prev) => ({
                          ...prev,
                          calculationMode,
                          minTariff:
                            calculationMode === "FLAT"
                              ? null
                              : prev.minTariff ?? 0,
                          maxTariff:
                            calculationMode === "FLAT" ? null : prev.maxTariff,
                        }));
                      }}
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
                      value={taxForm.minTariff ?? ""}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          minTariff:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        }))
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
                      value={taxForm.maxTariff ?? ""}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          maxTariff:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        }))
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
                      value={taxForm.validFrom ?? ""}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          validFrom: event.target.value,
                        }))
                      }
                      type="date"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Valid To</span>
                    <input
                      value={taxForm.validTo ?? ""}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          validTo: event.target.value,
                        }))
                      }
                      type="date"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Priority</span>
                    <input
                      value={taxForm.priority}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          priority: Number(event.target.value),
                        }))
                      }
                      type="number"
                      className={inputClass}
                    />
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Enabled</span>
                    <ActiveToggle
                      checked={taxForm.isActive}
                      onChange={(checked) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          isActive: checked,
                        }))
                      }
                    />
                  </div>
                  <div className={actionRowClass}>
                    <Button disabled={isMutating} onClick={submitTax}>
                      {editingTax ? "Save Tax" : "Create Tax"}
                    </Button>
                    {editingTax && (
                      <Button
                        variant="dark"
                        onClick={() => {
                          setEditingTax(null);
                          setTaxForm(emptyTax);
                        }}
                      >
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
                  <tr key={tax.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{tax.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={tax.category} />
                        <span className="text-xs text-slate-500">
                          {tax.scope.replaceAll("_", " ")} / {tax.targetType}
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
                        onChange={(next) => {
                          void actions.updateTax({
                            taxId: tax.id,
                            payload: { isActive: next },
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-indigo-600 hover:underline"
                        onClick={() => {
                          setEditingTax(tax);
                          setTaxForm({
                            name: tax.name,
                            rate: Number(tax.rate),
                            taxType: tax.taxType,
                            category: tax.category,
                            scope: tax.scope,
                            targetType: tax.targetType,
                            calculationMode: tax.calculationMode,
                            discountTreatment: tax.discountTreatment,
                            minTariff:
                              tax.calculationMode === "FLAT" ||
                              tax.minTariff === null
                                ? null
                                : Number(tax.minTariff),
                            maxTariff:
                              tax.calculationMode === "FLAT" ||
                              tax.maxTariff === null
                                ? null
                                : Number(tax.maxTariff),
                            validFrom: dateInput(tax.validFrom),
                            validTo: dateInput(tax.validTo),
                            priority: tax.priority,
                            appliesTo: tax.targetType,
                            isActive: tax.isActive,
                          });
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </PricingTable>
            </section>
          )}

          {activeTab === "coupons" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
              <div className={formCardClass}>
                <FormHeader
                  title={editingCoupon ? "Edit Coupon" : "Create Coupon"}
                  guideLabel="Coupon Guide"
                  onGuide={() => setHelpTopic("coupons")}
                />
                <p className="mt-3 text-sm text-slate-500">
                  Define coupon codes and usage limits for guest-facing booking
                  discounts.
                </p>
                <div className={formGridClass}>
                  <label className={fieldClass}>
                    <span>Coupon Code</span>
                    <input
                      value={couponForm.code}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          code: event.target.value,
                        }))
                      }
                      placeholder="Example: WEEKEND10"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Coupon Name</span>
                    <input
                      value={couponForm.name}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Example: Weekend offer"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Discount Type</span>
                    <select
                      value={couponForm.discountType}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          discountType: event.target.value as DiscountType,
                        }))
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
                      value={couponForm.discountValue}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          discountValue: Number(event.target.value),
                        }))
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
                      value={couponForm.maxUses ?? ""}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          maxUses: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
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
                      value={couponForm.minNights ?? ""}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          minNights: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
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
                      value={couponForm.minAmount ?? ""}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          minAmount: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
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
                      value={couponForm.validFrom}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          validFrom: event.target.value,
                        }))
                      }
                      type="date"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Valid To</span>
                    <input
                      value={couponForm.validTo ?? ""}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          validTo: event.target.value,
                        }))
                      }
                      type="date"
                      className={inputClass}
                    />
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-1">
                    <span className="text-sm font-medium text-slate-700">Once per User</span>
                    <ActiveToggle
                      checked={couponForm.oncePerUser}
                      onChange={(checked) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          oncePerUser: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-1">
                    <span className="text-sm font-medium text-slate-700">Enabled</span>
                    <ActiveToggle
                      checked={couponForm.isActive}
                      onChange={(checked) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          isActive: checked,
                        }))
                      }
                    />
                  </div>
                  <div className={actionRowClass}>
                    <Button disabled={isMutating} onClick={submitCoupon}>
                      {editingCoupon ? "Save Coupon" : "Create Coupon"}
                    </Button>
                    {editingCoupon && (
                      <Button
                        variant="dark"
                        onClick={() => {
                          setEditingCoupon(null);
                          setCouponForm(emptyCoupon);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <PricingTable
                headers={["Code", "Name", "Discount", "Once/User", "Validity", "Active", "Action"]}
                loading={isFetching}
                empty={coupons.length === 0}
              >
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
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
                        onChange={(next) => {
                          void actions.updateCoupon({
                            couponId: coupon.id,
                            payload: { isActive: next },
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-indigo-600 hover:underline"
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setCouponForm({
                            code: coupon.code,
                            name: coupon.name,
                            discountType: coupon.discountType,
                            discountValue: Number(coupon.discountValue),
                            maxUses: coupon.maxUses ?? undefined,
                            minNights: coupon.minNights ?? undefined,
                            minAmount: coupon.minAmount
                              ? Number(coupon.minAmount)
                              : undefined,
                            validFrom: dateInput(coupon.validFrom),
                            validTo: dateInput(coupon.validTo),
                            isActive: coupon.isActive,
                            oncePerUser: coupon.oncePerUser,
                          });
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </PricingTable>
            </section>
          )}
        </>
      )}
      <Modal
        isOpen={helpTopic !== null}
        onClose={() => setHelpTopic(null)}
        title={helpTopic ? pricingGuides[helpTopic].title : undefined}
        size="lg"
      >
        {helpTopic && (
          <>
            <PricingGuideContent guide={pricingGuides[helpTopic]} />
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setHelpTopic(null)}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
