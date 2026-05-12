import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import {
  createCouponApi,
  createProductApi,
  createRateApi,
  createTaxApi,
  deleteRateApi,
  listCouponsApi,
  listProductsApi,
  listRatesApi,
  listTaxesApi,
  updateCouponApi,
  updateProductApi,
  updateRateApi,
  updateTaxApi,
} from "../api";
import type {
  CouponPayload,
  ProductPayload,
  RatePayload,
  TaxPayload,
} from "../types";

const pageParams = {
  page: 1,
  limit: 100,
};

export const useAdminPricing = (propertyId: string | undefined) => {
  const queryClient = useQueryClient();
  const enabled = !!propertyId;

  const invalidatePricing = (nextPropertyId = propertyId) => {
    if (!nextPropertyId) return;
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.pricing.byProperty(nextPropertyId),
    });
  };

  const productsQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.pricing.products(propertyId)
      : ADMIN_KEYS.pricing.all(),
    queryFn: async () => {
      if (!propertyId) throw new Error("PropertyId required");
      return listProductsApi(propertyId, pageParams);
    },
    enabled,
  });

  const ratesQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.pricing.rates(propertyId)
      : ADMIN_KEYS.pricing.all(),
    queryFn: async () => {
      if (!propertyId) throw new Error("PropertyId required");
      return listRatesApi(propertyId, pageParams);
    },
    enabled,
  });

  const taxesQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.pricing.taxes(propertyId)
      : ADMIN_KEYS.pricing.all(),
    queryFn: async () => {
      if (!propertyId) throw new Error("PropertyId required");
      return listTaxesApi(propertyId, pageParams);
    },
    enabled,
  });

  const couponsQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.pricing.coupons(propertyId)
      : ADMIN_KEYS.pricing.all(),
    queryFn: async () => {
      if (!propertyId) throw new Error("PropertyId required");
      return listCouponsApi(propertyId, pageParams);
    },
    enabled,
  });

  const createProduct = useMutation({
    mutationFn: (payload: ProductPayload) => {
      if (!propertyId) throw new Error("PropertyId required");
      return createProductApi(propertyId, payload);
    },
    onSuccess: (product) => invalidatePricing(product.propertyId),
  });

  const updateProduct = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: ProductPayload;
    }) => updateProductApi(productId, payload),
    onSuccess: (product) => invalidatePricing(product.propertyId),
  });

  const createRate = useMutation({
    mutationFn: (payload: RatePayload) => {
      if (!propertyId) throw new Error("PropertyId required");
      return createRateApi(propertyId, payload);
    },
    onSuccess: (rate) => invalidatePricing(rate.propertyId),
  });

  const updateRate = useMutation({
    mutationFn: ({ rateId, payload }: { rateId: string; payload: RatePayload }) =>
      updateRateApi(rateId, payload),
    onSuccess: (rate) => invalidatePricing(rate.propertyId),
  });

  const deleteRate = useMutation({
    mutationFn: deleteRateApi,
    onSuccess: () => invalidatePricing(),
  });

  const createTax = useMutation({
    mutationFn: (payload: TaxPayload) => {
      if (!propertyId) throw new Error("PropertyId required");
      return createTaxApi(propertyId, payload);
    },
    onSuccess: (tax) => invalidatePricing(tax.propertyId),
  });

  const updateTax = useMutation({
    mutationFn: ({ taxId, payload }: { taxId: string; payload: Partial<TaxPayload> }) =>
      updateTaxApi(taxId, payload),
    onSuccess: (tax) => invalidatePricing(tax.propertyId),
  });

  const createCoupon = useMutation({
    mutationFn: (payload: CouponPayload) => {
      if (!propertyId) throw new Error("PropertyId required");
      return createCouponApi(propertyId, payload);
    },
    onSuccess: (coupon) => invalidatePricing(coupon.propertyId),
  });

  const updateCoupon = useMutation({
    mutationFn: ({
      couponId,
      payload,
    }: {
      couponId: string;
      payload: Partial<CouponPayload>;
    }) => updateCouponApi(couponId, payload),
    onSuccess: (coupon) => invalidatePricing(coupon.propertyId),
  });

  return {
    products: productsQuery.data?.items ?? [],
    rates: ratesQuery.data?.items ?? [],
    taxes: taxesQuery.data?.items ?? [],
    coupons: couponsQuery.data?.items ?? [],
    isLoading:
      productsQuery.isPending ||
      ratesQuery.isPending ||
      taxesQuery.isPending ||
      couponsQuery.isPending,
    isFetching:
      productsQuery.isFetching ||
      ratesQuery.isFetching ||
      taxesQuery.isFetching ||
      couponsQuery.isFetching,
    createProduct: createProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    createRate: createRate.mutateAsync,
    updateRate: updateRate.mutateAsync,
    deleteRate: deleteRate.mutateAsync,
    createTax: createTax.mutateAsync,
    updateTax: updateTax.mutateAsync,
    createCoupon: createCoupon.mutateAsync,
    updateCoupon: updateCoupon.mutateAsync,
    isMutating:
      createProduct.isPending ||
      updateProduct.isPending ||
      createRate.isPending ||
      updateRate.isPending ||
      deleteRate.isPending ||
      createTax.isPending ||
      updateTax.isPending ||
      createCoupon.isPending ||
      updateCoupon.isPending,
  };
};
