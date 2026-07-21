import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  downloadBillingDocumentApi,
  generateInvoiceApi,
  generateReceiptApi,
  getBillingSettingApi,
  listBillingDocumentsApi,
  listBillingSettingAuditsApi,
  retryBillingDocumentPdfApi,
  updateBillingSettingApi,
  voidBillingDocumentApi,
} from "./api";
import type {
  BillingDocument,
  BillingDocumentListParams,
  UpdateBillingSettingPayload,
} from "./types";

export const useBillingDocuments = (params: BillingDocumentListParams) =>
  useQuery({
    queryKey: ADMIN_KEYS.billing.list(params),
    queryFn: () => listBillingDocumentsApi(params),
  });

export const useBookingBillingDocuments = (
  bookingId: string | undefined,
  propertyId: string | undefined,
) =>
  useQuery({
    queryKey: bookingId
      ? ADMIN_KEYS.billing.booking(bookingId)
      : ADMIN_KEYS.billing.all(),
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking id required");
      const data = await listBillingDocumentsApi({
        page: 1,
        limit: 50,
        ...(propertyId !== undefined && { propertyId }),
      });
      return data.items.filter((document) => document.bookingId === bookingId);
    },
    enabled: !!bookingId,
  });

export const useBillingActions = () => {
  const queryClient = useQueryClient();

  const invalidateBilling = (document?: BillingDocument) => {
    queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.billing.all() });
    if (document) {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.billing.booking(document.bookingId),
      });
    }
  };

  const generateInvoice = useMutation({
    mutationFn: generateInvoiceApi,
    onSuccess: invalidateBilling,
  });

  const generateReceipt = useMutation({
    mutationFn: generateReceiptApi,
    onSuccess: invalidateBilling,
  });

  const voidDocument = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason?: string }) =>
      voidBillingDocumentApi(documentId, reason),
    onSuccess: invalidateBilling,
  });

  const downloadDocument = useMutation({
    mutationFn: downloadBillingDocumentApi,
  });

  const retryDocumentPdf = useMutation({
    mutationFn: retryBillingDocumentPdfApi,
    onSuccess: invalidateBilling,
  });

  return {
    generateInvoice: generateInvoice.mutateAsync,
    generateReceipt: generateReceipt.mutateAsync,
    voidDocument: voidDocument.mutateAsync,
    downloadDocument: downloadDocument.mutateAsync,
    retryDocumentPdf: retryDocumentPdf.mutateAsync,
    isMutating:
      generateInvoice.isPending ||
      generateReceipt.isPending ||
      voidDocument.isPending ||
      retryDocumentPdf.isPending ||
      downloadDocument.isPending,
  };
};

export const useBillingSetting = (propertyId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.billing.setting(propertyId)
      : ADMIN_KEYS.billing.all(),
    queryFn: () => {
      if (!propertyId) throw new Error("Property id required");
      return getBillingSettingApi(propertyId);
    },
    enabled: !!propertyId,
  });

  const auditsQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.billing.settingAudits(propertyId)
      : ADMIN_KEYS.billing.all(),
    queryFn: () => {
      if (!propertyId) throw new Error("Property id required");
      return listBillingSettingAuditsApi(propertyId);
    },
    enabled: !!propertyId,
  });

  const update = useMutation({
    mutationFn: (payload: UpdateBillingSettingPayload) => {
      if (!propertyId) throw new Error("Property id required");
      return updateBillingSettingApi(propertyId, payload);
    },
    onSuccess: (setting) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.billing.setting(setting.propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.billing.settingAudits(setting.propertyId),
      });
    },
  });

  return {
    ...query,
    updateSetting: update.mutateAsync,
    isUpdating: update.isPending,
    audits: auditsQuery.data ?? [],
    areAuditsLoading: auditsQuery.isPending,
    auditsError: auditsQuery.error,
  };
};
