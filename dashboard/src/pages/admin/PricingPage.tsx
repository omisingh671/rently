import { useMemo, useState } from "react";
import { z } from "zod";
import Button from "@/components/ui/Button";
import ActiveToggle from "@/components/common/ActiveToggle";
import StatusBadge from "@/components/common/StatusBadge";
import { useAdminProperties } from "@/features/admin/properties/hooks/useAdminProperties";
import { useAdminRooms } from "@/features/admin/rooms/hooks/useAdminRooms";
import { useAdminUnits } from "@/features/admin/units/hooks/useAdminUnits";
import { useAdminPricing } from "@/features/admin/pricing/hooks/useAdminPricing";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/admin/config/queryLimits";
import { normalizeApiError } from "@/utils/errors";
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
  TaxPayload,
  TaxType,
} from "@/features/admin/pricing/types";

type Tab = "products" | "rates" | "taxes" | "coupons";

const productSchema = z.object({
  name: z.string().trim().min(1),
  occupancy: z.number().int().min(1),
  hasAC: z.boolean(),
  category: z.enum(["NIGHTLY", "LONG_STAY", "CORPORATE"]),
});

const rateSchema = z
  .object({
    productId: z.string().min(1),
    targetType: z.enum(["PROPERTY", "UNIT", "ROOM"]),
    unitId: z.string().optional(),
    roomId: z.string().optional(),
    rateType: z.enum(["NIGHTLY", "WEEKLY", "MONTHLY"]),
    pricingTier: z.enum(["STANDARD", "CORPORATE", "SEASONAL"]),
    minNights: z.number().int().min(1),
    maxNights: z.number().int().min(1).optional(),
    taxInclusive: z.boolean(),
    price: z.number().positive(),
    validFrom: z.string().min(1),
    validTo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "UNIT" && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "Unit is required",
      });
    }

    if (data.targetType === "ROOM" && !data.roomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roomId"],
        message: "Room is required",
      });
    }

    if (data.maxNights !== undefined && data.maxNights < data.minNights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxNights"],
        message: "Max nights must be greater than min nights",
      });
    }
  });

const taxSchema = z.object({
  name: z.string().trim().min(1),
  rate: z.number().nonnegative(),
  taxType: z.enum(["PERCENTAGE", "FIXED"]),
  appliesTo: z.string().trim().min(1),
  isActive: z.boolean(),
});

const couponSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  minNights: z.number().int().positive().optional(),
  minAmount: z.number().positive().optional(),
  validFrom: z.string().min(1),
  validTo: z.string().optional(),
  isActive: z.boolean(),
});

type ProductForm = z.input<typeof productSchema>;
type RateForm = z.input<typeof rateSchema>;
type TaxForm = z.input<typeof taxSchema>;
type CouponForm = z.input<typeof couponSchema>;

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "products", label: "Rate Products" },
  { key: "rates", label: "Price Rules / Rates" },
  { key: "taxes", label: "Taxes" },
  { key: "coupons", label: "Coupons" },
];

const dateInput = (value: string | null) => value?.slice(0, 10) ?? "";

const emptyProduct: ProductForm = {
  name: "",
  occupancy: 1,
  hasAC: false,
  category: "NIGHTLY",
};

const emptyRate: RateForm = {
  productId: "",
  targetType: "PROPERTY",
  unitId: "",
  roomId: "",
  rateType: "NIGHTLY",
  pricingTier: "STANDARD",
  minNights: 1,
  maxNights: undefined,
  taxInclusive: false,
  price: 1,
  validFrom: "",
  validTo: "",
};

const emptyTax: TaxForm = {
  name: "",
  rate: 0,
  taxType: "PERCENTAGE",
  appliesTo: "ALL",
  isActive: true,
};

const emptyCoupon: CouponForm = {
  code: "",
  name: "",
  discountType: "PERCENTAGE",
  discountValue: 1,
  maxUses: undefined,
  minNights: undefined,
  minAmount: undefined,
  validFrom: "",
  validTo: "",
  isActive: true,
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Open";

const getRateTarget = (rate: AdminRoomPricing) => {
  if (rate.roomLabel) return `Room override: ${rate.roomLabel}`;
  if (rate.unitNumber) return `Unit override: ${rate.unitNumber}`;
  return "Property-wide";
};

export default function PricingPage() {
  const [propertyId, setPropertyId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("products");
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

  const { data: propertiesData } = useAdminProperties(1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const properties = useMemo(
    () => propertiesData?.items ?? [],
    [propertiesData?.items],
  );
  const selectedPropertyId = propertyId || properties[0]?.id || "";

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
    const payload = taxSchema.parse(taxForm) satisfies TaxPayload;
    try {
      if (editingTax) {
        await actions.updateTax({ taxId: editingTax.id, payload });
      } else {
        await actions.createTax(payload);
      }
      setTaxForm(emptyTax);
      setEditingTax(null);
    } catch {
      setError("Could not save tax");
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
        <div className="relative w-full max-w-sm rounded-md border border-slate-300 bg-white py-1 text-sm text-slate-700 focus-within:ring-2 focus-within:ring-slate-300">
          <select
            value={selectedPropertyId}
            onChange={(event) => {
              setError(null);
              setPropertyId(event.target.value);
            }}
            className="h-9 w-full cursor-pointer appearance-none bg-transparent px-3 outline-none"
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
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
          Select a property to manage pricing.
        </div>
      ) : (
        <>
          {activeTab === "products" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingProduct ? "Edit Rate Product" : "Create Rate Product"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define reusable internal pricing types such as Single AC,
                  Double Non-AC, or Whole Unit AC.
                </p>
                <div className="mt-4 space-y-4">
                  <input
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Rate product name"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        category: event.target.value as RoomProductCategory,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="NIGHTLY">Nightly</option>
                    <option value="LONG_STAY">Long stay</option>
                    <option value="CORPORATE">Corporate</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={productForm.hasAC}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          hasAC: event.target.checked,
                        }))
                      }
                    />
                    AC rate product
                  </label>
                  <div className="flex gap-2">
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
                  <tr key={product.id} className="border-t border-slate-100">
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
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingRate ? "Edit Price Rule" : "Create Price Rule"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create property-wide rates first. Use overrides only when a
                  specific unit or room has different pricing.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={rateForm.productId}
                    onChange={(event) =>
                      setRateForm((prev) => ({
                        ...prev,
                        productId: event.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                  >
                    <option value="">Select rate product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
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
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                  >
                    <option value="PROPERTY">Property-wide</option>
                    <option value="UNIT">Unit override</option>
                    <option value="ROOM">Room override</option>
                  </select>
                  {rateForm.targetType === "UNIT" && (
                    <select
                      value={rateForm.unitId}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          unitId: event.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                    >
                      <option value="">Select unit</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unitNumber}
                        </option>
                      ))}
                    </select>
                  )}
                  {rateForm.targetType === "ROOM" && (
                    <select
                      value={rateForm.roomId}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          roomId: event.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                    >
                      <option value="">Select room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.unitNumber} / {room.number} - {room.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    value={rateForm.rateType}
                    onChange={(event) =>
                      setRateForm((prev) => ({
                        ...prev,
                        rateType: event.target.value as RateType,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="NIGHTLY">Nightly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                  <select
                    value={rateForm.pricingTier}
                    onChange={(event) =>
                      setRateForm((prev) => ({
                        ...prev,
                        pricingTier: event.target.value as PricingTier,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="SEASONAL">Seasonal</option>
                  </select>
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
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
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
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
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
                    placeholder="Max nights"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={rateForm.validFrom}
                    onChange={(event) =>
                      setRateForm((prev) => ({
                        ...prev,
                        validFrom: event.target.value,
                      }))
                    }
                    type="date"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={rateForm.validTo ?? ""}
                    onChange={(event) =>
                      setRateForm((prev) => ({
                        ...prev,
                        validTo: event.target.value,
                      }))
                    }
                    type="date"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={rateForm.taxInclusive}
                      onChange={(event) =>
                        setRateForm((prev) => ({
                          ...prev,
                          taxInclusive: event.target.checked,
                        }))
                      }
                    />
                    Tax inclusive
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
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
                  <tr key={rate.id} className="border-t border-slate-100">
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
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingTax ? "Edit Tax" : "Create Tax"}
                </h2>
                <div className="mt-4 space-y-4">
                  <input
                    value={taxForm.name}
                    onChange={(event) =>
                      setTaxForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Tax name"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={taxForm.rate}
                    onChange={(event) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        rate: Number(event.target.value),
                      }))
                    }
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={taxForm.taxType}
                    onChange={(event) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        taxType: event.target.value as TaxType,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed</option>
                  </select>
                  <input
                    value={taxForm.appliesTo}
                    onChange={(event) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        appliesTo: event.target.value,
                      }))
                    }
                    placeholder="Applies to"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={taxForm.isActive}
                      onChange={(event) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    Enabled
                  </label>
                  <div className="flex gap-2">
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
                headers={["Name", "Rate", "Type", "Applies", "Active", "Action"]}
                loading={isFetching}
                empty={taxes.length === 0}
              >
                {taxes.map((tax) => (
                  <tr key={tax.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{tax.name}</td>
                    <td className="px-4 py-3">{tax.rate}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tax.taxType} />
                    </td>
                    <td className="px-4 py-3">{tax.appliesTo}</td>
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
                            appliesTo: tax.appliesTo,
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
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingCoupon ? "Edit Coupon" : "Create Coupon"}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={couponForm.code}
                    onChange={(event) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        code: event.target.value,
                      }))
                    }
                    placeholder="Code"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={couponForm.name}
                    onChange={(event) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Name"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={couponForm.discountType}
                    onChange={(event) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        discountType: event.target.value as DiscountType,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed</option>
                  </select>
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
                    placeholder="Discount"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
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
                    placeholder="Max uses"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
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
                    placeholder="Min nights"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
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
                    placeholder="Min amount"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={couponForm.validFrom}
                    onChange={(event) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        validFrom: event.target.value,
                      }))
                    }
                    type="date"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={couponForm.validTo ?? ""}
                    onChange={(event) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        validTo: event.target.value,
                      }))
                    }
                    type="date"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={couponForm.isActive}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    Enabled
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
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
                headers={["Code", "Name", "Discount", "Validity", "Active", "Action"]}
                loading={isFetching}
                empty={coupons.length === 0}
              >
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{coupon.code}</td>
                    <td className="px-4 py-3">{coupon.name}</td>
                    <td className="px-4 py-3">
                      {coupon.discountValue} {coupon.discountType}
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
    </div>
  );
}

function PricingTable({
  headers,
  loading,
  empty,
  children,
}: {
  headers: string[];
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={loading ? "opacity-70" : ""}>
          {empty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                No records found.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
