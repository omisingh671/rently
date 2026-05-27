import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type {
  BillingDocument,
  BillingDocumentListParams,
  BillingDocumentListResponse,
  BillingSetting,
  UpdateBillingSettingPayload,
} from "./types";

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const listBillingDocumentsApi = async (
  params: BillingDocumentListParams,
): Promise<BillingDocumentListResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<BillingDocumentListResponse>
  >(API_ENDPOINTS.billing.list, { params });

  return data.data;
};

export const generateInvoiceApi = async (
  bookingId: string,
): Promise<BillingDocument> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<BillingDocument>>(
    API_ENDPOINTS.billing.invoice,
    { bookingId },
  );

  return data.data;
};

export const generateReceiptApi = async (
  paymentId: string,
): Promise<BillingDocument> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<BillingDocument>>(
    API_ENDPOINTS.billing.receipt,
    { paymentId },
  );

  return data.data;
};

export const voidBillingDocumentApi = async (
  documentId: string,
  reason?: string,
): Promise<BillingDocument> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<BillingDocument>>(
    API_ENDPOINTS.billing.voidById(documentId),
    { ...(reason !== undefined && { reason }) },
  );

  return data.data;
};

export const downloadBillingDocumentApi = async (
  document: BillingDocument,
): Promise<void> => {
  const { data } = await axiosInstance.get<Blob>(
    API_ENDPOINTS.billing.download(document.id),
    { responseType: "blob" },
  );
  triggerBlobDownload(data, `${document.documentNumber}.pdf`);
};

export const getBillingSettingApi = async (
  propertyId: string,
): Promise<BillingSetting> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<BillingSetting>>(
    API_ENDPOINTS.billing.settingsByProperty(propertyId),
  );

  return data.data;
};

export const updateBillingSettingApi = async (
  propertyId: string,
  payload: UpdateBillingSettingPayload,
): Promise<BillingSetting> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<BillingSetting>>(
    API_ENDPOINTS.billing.settingsByProperty(propertyId),
    payload,
  );

  return data.data;
};
