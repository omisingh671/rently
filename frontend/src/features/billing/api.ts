import axiosInstance from "@/api/axios";
import type { BillingDocument } from "./types";

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

export const listBookingBillingDocuments = async (
  bookingId: string,
  checkoutToken?: string,
): Promise<BillingDocument[]> => {
  const res = await axiosInstance.get(
    `/public/bookings/${bookingId}/billing-documents`,
    {
      params: {
        ...(checkoutToken !== undefined && { checkoutToken }),
      },
    },
  );
  return res.data?.data ?? [];
};

export const downloadBillingDocument = async (
  document: BillingDocument,
  checkoutToken?: string,
): Promise<void> => {
  const { data } = await axiosInstance.get<Blob>(
    `/public/billing-documents/${document.id}/download`,
    {
      params: {
        ...(checkoutToken !== undefined && { checkoutToken }),
      },
      responseType: "blob",
    },
  );
  triggerBlobDownload(data, `${document.documentNumber}.pdf`);
};
