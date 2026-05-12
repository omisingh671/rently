import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type {
  AdminCoupon,
  AdminRoomPricing,
  AdminRoomProduct,
  AdminTax,
  CouponListResponse,
  CouponPayload,
  DiscountType,
  PricingTier,
  ProductListResponse,
  ProductPayload,
  RateListResponse,
  RatePayload,
  RateType,
  RoomProductCategory,
  TaxListResponse,
  TaxPayload,
  TaxType,
} from "./types";

type PageParams = {
  page: number;
  limit: number;
};

export const listProductsApi = async (
  propertyId: string,
  params: PageParams & {
    search?: string;
    category?: RoomProductCategory;
  },
): Promise<ProductListResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<ProductListResponse>
  >(API_ENDPOINTS.pricing.productsByProperty(propertyId), { params });

  return data.data;
};

export const createProductApi = async (
  propertyId: string,
  payload: ProductPayload,
): Promise<AdminRoomProduct> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminRoomProduct>>(
    API_ENDPOINTS.pricing.productsByProperty(propertyId),
    payload,
  );

  return data.data;
};

export const updateProductApi = async (
  productId: string,
  payload: ProductPayload,
): Promise<AdminRoomProduct> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminRoomProduct>>(
    API_ENDPOINTS.pricing.productById(productId),
    payload,
  );

  return data.data;
};

export const listRatesApi = async (
  propertyId: string,
  params: PageParams & {
    productId?: string;
    rateType?: RateType;
    pricingTier?: PricingTier;
  },
): Promise<RateListResponse> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<RateListResponse>>(
    API_ENDPOINTS.pricing.ratesByProperty(propertyId),
    { params },
  );

  return data.data;
};

export const createRateApi = async (
  propertyId: string,
  payload: RatePayload,
): Promise<AdminRoomPricing> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminRoomPricing>>(
    API_ENDPOINTS.pricing.ratesByProperty(propertyId),
    payload,
  );

  return data.data;
};

export const updateRateApi = async (
  rateId: string,
  payload: RatePayload,
): Promise<AdminRoomPricing> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminRoomPricing>>(
    API_ENDPOINTS.pricing.rateById(rateId),
    payload,
  );

  return data.data;
};

export const deleteRateApi = async (rateId: string): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.pricing.rateById(rateId));
};

export const listTaxesApi = async (
  propertyId: string,
  params: PageParams & {
    search?: string;
    taxType?: TaxType;
    isActive?: boolean;
  },
): Promise<TaxListResponse> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<TaxListResponse>>(
    API_ENDPOINTS.pricing.taxesByProperty(propertyId),
    { params },
  );

  return data.data;
};

export const createTaxApi = async (
  propertyId: string,
  payload: TaxPayload,
): Promise<AdminTax> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminTax>>(
    API_ENDPOINTS.pricing.taxesByProperty(propertyId),
    payload,
  );

  return data.data;
};

export const updateTaxApi = async (
  taxId: string,
  payload: Partial<TaxPayload>,
): Promise<AdminTax> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminTax>>(
    API_ENDPOINTS.pricing.taxById(taxId),
    payload,
  );

  return data.data;
};

export const listCouponsApi = async (
  propertyId: string,
  params: PageParams & {
    search?: string;
    discountType?: DiscountType;
    isActive?: boolean;
  },
): Promise<CouponListResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<CouponListResponse>
  >(API_ENDPOINTS.pricing.couponsByProperty(propertyId), { params });

  return data.data;
};

export const createCouponApi = async (
  propertyId: string,
  payload: CouponPayload,
): Promise<AdminCoupon> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminCoupon>>(
    API_ENDPOINTS.pricing.couponsByProperty(propertyId),
    payload,
  );

  return data.data;
};

export const updateCouponApi = async (
  couponId: string,
  payload: Partial<CouponPayload>,
): Promise<AdminCoupon> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminCoupon>>(
    API_ENDPOINTS.pricing.couponById(couponId),
    payload,
  );

  return data.data;
};
