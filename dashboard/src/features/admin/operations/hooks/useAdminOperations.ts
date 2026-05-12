import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import {
  checkInBookingApi,
  checkOutBookingApi,
  listBookingsApi,
  listEnquiriesApi,
  listQuotesApi,
  updateBookingStatusApi,
  updateEnquiryStatusApi,
  updateQuoteStatusApi,
} from "../api";
import type { BookingStatus, LeadStatus, UpdateBookingPayload } from "../types";

type Module = "bookings" | "enquiries" | "quotes";
type Filters = {
  search: string;
  status: string;
  source: string;
};

const moduleKey = (module: Module, propertyId: string) => {
  if (module === "bookings") return ADMIN_KEYS.operations.bookings(propertyId);
  if (module === "enquiries") return ADMIN_KEYS.operations.enquiries(propertyId);
  return ADMIN_KEYS.operations.quotes(propertyId);
};

export const useAdminOperations = (
  module: Module,
  propertyId: string | undefined,
  filters: Filters,
) => {
  const queryClient = useQueryClient();
  const enabled = !!propertyId;

  const query = useQuery({
    queryKey: propertyId
      ? [...moduleKey(module, propertyId), filters] as const
      : ADMIN_KEYS.operations.all(),
    queryFn: async () => {
      if (!propertyId) throw new Error("PropertyId required");

      const params = {
        page: 1,
        limit: 100,
        search: filters.search || undefined,
        status: filters.status || undefined,
        source: filters.source || undefined,
      };

      if (module === "bookings") {
        return listBookingsApi(propertyId, {
          page: params.page,
          limit: params.limit,
          search: params.search,
          status: params.status as BookingStatus | undefined,
        });
      }

      if (module === "enquiries") {
        return listEnquiriesApi(propertyId, {
          ...params,
          status: params.status as LeadStatus | undefined,
        });
      }

      return listQuotesApi(propertyId, {
        page: params.page,
        limit: params.limit,
        search: params.search,
        status: params.status as LeadStatus | undefined,
      });
    },
    enabled,
  });

  const invalidate = (nextPropertyId = propertyId) => {
    if (!nextPropertyId) return;
    queryClient.invalidateQueries({
      queryKey: moduleKey(module, nextPropertyId),
    });
  };

  const updateBooking = useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: UpdateBookingPayload;
    }) => updateBookingStatusApi(bookingId, payload),
    onSuccess: (booking) => invalidate(booking.propertyId),
  });

  const checkInBooking = useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: Omit<UpdateBookingPayload, "status">;
    }) => checkInBookingApi(bookingId, payload),
    onSuccess: (booking) => invalidate(booking.propertyId),
  });

  const checkOutBooking = useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: Omit<UpdateBookingPayload, "status">;
    }) => checkOutBookingApi(bookingId, payload),
    onSuccess: (booking) => invalidate(booking.propertyId),
  });

  const updateEnquiry = useMutation({
    mutationFn: ({
      enquiryId,
      status,
    }: {
      enquiryId: string;
      status: LeadStatus;
    }) => updateEnquiryStatusApi(enquiryId, status),
    onSuccess: (enquiry) => invalidate(enquiry.propertyId),
  });

  const updateQuote = useMutation({
    mutationFn: ({ quoteId, status }: { quoteId: string; status: LeadStatus }) =>
      updateQuoteStatusApi(quoteId, status),
    onSuccess: (quote) => invalidate(quote.propertyId),
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    updateBooking: updateBooking.mutateAsync,
    checkInBooking: checkInBooking.mutateAsync,
    checkOutBooking: checkOutBooking.mutateAsync,
    updateEnquiry: updateEnquiry.mutateAsync,
    updateQuote: updateQuote.mutateAsync,
    isMutating:
      updateBooking.isPending ||
      checkInBooking.isPending ||
      checkOutBooking.isPending ||
      updateEnquiry.isPending ||
      updateQuote.isPending,
  };
};
