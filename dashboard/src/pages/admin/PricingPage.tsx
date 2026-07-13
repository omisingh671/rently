import { useState } from "react";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { HiChevronDown } from "react-icons/hi2";
import { useAdminRooms } from "@/features/rooms/hooks/useAdminRooms";
import { useAdminUnits } from "@/features/units/hooks/useAdminUnits";
import { useAdminPricing } from "@/features/pricing/hooks/useAdminPricing";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import { normalizeApiError } from "@/utils/errors";
import { PricingCouponsSection } from "@/features/pricing/components/PricingCouponsSection";
import { PricingGuideModal } from "@/features/pricing/components/PricingGuideModal";
import { PricingProductsSection } from "@/features/pricing/components/PricingProductsSection";
import { PricingRatesSection } from "@/features/pricing/components/PricingRatesSection";
import { PricingTaxesSection } from "@/features/pricing/components/PricingTaxesSection";
import {
  couponSchema,
  dateInput,
  emptyCoupon,
  emptyProduct,
  emptyRate,
  emptyTax,
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
  ProductPayload,
  RatePayload,
  TaxPayload,
} from "@/features/pricing/types";

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
  const submitProduct = async () => {
    setError(null);
    const result = productSchema.safeParse(productForm);
    if (!result.success) {
      setError(result.error.issues.map((e) => e.message).join(", "));
      return;
    }
    const payload = result.data satisfies ProductPayload;
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
    } catch (error) {
      setError(normalizeApiError(error).message);
    }
  };

  const submitRate = async () => {
    setError(null);
    const result = rateSchema.safeParse(rateForm);
    if (!result.success) {
      setError(result.error.issues.map((e) => e.message).join(", "));
      return;
    }
    const parsed = result.data;
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
      setError(result.error.issues.map((e) => e.message).join(", "));
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
      isRefundable: parsed.isRefundable,
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
    const result = couponSchema.safeParse(couponForm);
    if (!result.success) {
      setError(result.error.issues.map((e) => e.message).join(", "));
      return;
    }
    const parsed = result.data;
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
    } catch (error) {
      setError(normalizeApiError(error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full rounded-md border border-slate-300 bg-white py-1 text-sm text-slate-700 transition-all duration-300 focus-within:ring-2 focus-within:ring-slate-300 sm:w-64 xl:w-[30%]">
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
            <PricingProductsSection
              form={productForm}
              editingProduct={editingProduct}
              products={products}
              isFetching={isFetching}
              isMutating={isMutating}
              onGuide={() => setHelpTopic("products")}
              onNameChange={(name) =>
                setProductForm((prev) => ({ ...prev, name }))
              }
              onOccupancyChange={(occupancy) =>
                setProductForm((prev) => ({ ...prev, occupancy }))
              }
              onCategoryChange={(category) =>
                setProductForm((prev) => ({ ...prev, category }))
              }
              onHasACChange={(hasAC) =>
                setProductForm((prev) => ({ ...prev, hasAC }))
              }
              onSubmit={submitProduct}
              onCancel={() => {
                setEditingProduct(null);
                setProductForm(emptyProduct);
              }}
              onEdit={(product) => {
                setEditingProduct(product);
                setProductForm({
                  name: product.name,
                  occupancy: product.occupancy,
                  hasAC: product.hasAC,
                  category: product.category,
                });
              }}
            />
          )}

          {activeTab === "rates" && (
            <PricingRatesSection
              form={rateForm}
              editingRate={editingRate}
              products={products}
              units={units}
              rooms={rooms}
              rates={rates}
              isFetching={isFetching}
              isMutating={isMutating}
              onGuide={() => setHelpTopic("rates")}
              onFormChange={(patch) =>
                setRateForm((prev) => ({ ...prev, ...patch }))
              }
              onTargetTypeChange={(targetType) =>
                setRateForm((prev) => ({
                  ...prev,
                  targetType,
                  unitId: "",
                  roomId: "",
                }))
              }
              onSubmit={submitRate}
              onCancel={() => {
                setEditingRate(null);
                setRateForm(emptyRate);
              }}
              onEdit={(rate) => {
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
              onDelete={(rateId) => {
                void actions.deleteRate(rateId);
              }}
            />
          )}

          {activeTab === "taxes" && (
            <PricingTaxesSection
              form={taxForm}
              editingTax={editingTax}
              taxes={taxes}
              isFetching={isFetching}
              isMutating={isMutating}
              onGuide={() => setHelpTopic("taxes")}
              onFormChange={(patch) =>
                setTaxForm((prev) => ({ ...prev, ...patch }))
              }
              onCalculationModeChange={(calculationMode) =>
                setTaxForm((prev) => ({
                  ...prev,
                  calculationMode,
                  minTariff:
                    calculationMode === "FLAT" ? null : prev.minTariff ?? 0,
                  maxTariff:
                    calculationMode === "FLAT" ? null : prev.maxTariff,
                }))
              }
              onSubmit={submitTax}
              onCancel={() => {
                setEditingTax(null);
                setTaxForm(emptyTax);
              }}
              onEdit={(tax) => {
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
                    tax.calculationMode === "FLAT" || tax.minTariff === null
                      ? null
                      : Number(tax.minTariff),
                  maxTariff:
                    tax.calculationMode === "FLAT" || tax.maxTariff === null
                      ? null
                      : Number(tax.maxTariff),
                  validFrom: dateInput(tax.validFrom),
                  validTo: dateInput(tax.validTo),
                  priority: tax.priority,
                  appliesTo: tax.targetType,
                  isRefundable: tax.isRefundable,
                  isActive: tax.isActive,
                });
              }}
              onActiveChange={(taxId, isActive) => {
                void actions.updateTax({
                  taxId,
                  payload: { isActive },
                });
              }}
            />
          )}

          {activeTab === "coupons" && (
            <PricingCouponsSection
              form={couponForm}
              editingCoupon={editingCoupon}
              coupons={coupons}
              isFetching={isFetching}
              isMutating={isMutating}
              onGuide={() => setHelpTopic("coupons")}
              onFormChange={(patch) =>
                setCouponForm((prev) => ({ ...prev, ...patch }))
              }
              onSubmit={submitCoupon}
              onCancel={() => {
                setEditingCoupon(null);
                setCouponForm(emptyCoupon);
              }}
              onEdit={(coupon) => {
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
              onActiveChange={(couponId, isActive) => {
                void actions.updateCoupon({
                  couponId,
                  payload: { isActive },
                });
              }}
            />
          )}
        </>
      )}
      <PricingGuideModal
        topic={helpTopic}
        onClose={() => setHelpTopic(null)}
      />
    </div>
  );
}
