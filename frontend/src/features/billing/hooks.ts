import { useMutation, useQuery } from "@tanstack/react-query";
import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import {
  downloadBillingDocument,
  listBookingBillingDocuments,
} from "./api";
import type { BillingDocument } from "./types";

export const useBookingBillingDocuments = (
  bookingId: string | undefined,
  checkoutToken?: string,
  enabled = true,
) =>
  useQuery({
    queryKey: bookingId
      ? PUBLIC_QUERY_KEYS.billing.booking(bookingId, checkoutToken)
      : PUBLIC_QUERY_KEYS.billing.booking(""),
    queryFn: () => {
      if (!bookingId) throw new Error("Booking id required");
      return listBookingBillingDocuments(bookingId, checkoutToken);
    },
    enabled: enabled && !!bookingId,
    retry: false,
  });

export const useDownloadBillingDocument = (checkoutToken?: string) =>
  useMutation({
    mutationFn: (document: BillingDocument) =>
      downloadBillingDocument(document, checkoutToken),
  });
