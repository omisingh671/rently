import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import * as api from "./api";
import type {
  Booking,
  BookingPolicyPreview,
  BookingQuote,
  CreateManualPaymentResponse,
  PaymentPurpose,
} from "./types";
import { useAuthStore } from "@/stores/authStore";
import type { CreateBookingPayload } from "./api";

export const BOOKING_KEYS = {
  all: PUBLIC_QUERY_KEYS.bookings.all,
  detail: PUBLIC_QUERY_KEYS.bookings.detail,
};

export const useBookings = (enabled = true) => {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken && !!s.user);
  return useQuery<Booking[], Error>({
    queryKey: BOOKING_KEYS.all,
    queryFn: async () => api.listBookings(),
    enabled: enabled && isAuthenticated,
    retry: false,
  });
};

export const useBooking = (
  id?: string,
  enabled = true,
  checkoutToken?: string,
) => {
  return useQuery<Booking, Error>({
    queryKey: id
      ? BOOKING_KEYS.detail(id, checkoutToken)
      : BOOKING_KEYS.detail(""),
    queryFn: async () => {
      if (!id) throw new Error("Missing booking id");
      return api.getBooking(id, checkoutToken);
    },
    enabled: Boolean(id) && enabled,
    retry: false,
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  const invalidateBookingAvailability = () => {
    queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
    queryClient.invalidateQueries({
      queryKey: PUBLIC_QUERY_KEYS.availability.check,
    });
  };

  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      return api.createBooking(payload);
    },
    onSuccess: invalidateBookingAvailability,
  });
};

export const useBookingQuote = () =>
  useMutation<BookingQuote, Error, CreateBookingPayload>({
    mutationFn: async (payload) => api.getBookingQuote(payload),
  });

export const useBookingCheckoutQuote = () =>
  useMutation<
    BookingQuote,
    Error,
    { bookingId: string; payload: api.BookingCheckoutQuotePayload }
  >({
    mutationFn: async ({ bookingId, payload }) =>
      api.getBookingCheckoutQuote(bookingId, payload),
  });

export const useUpdateBookingCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Booking,
    Error,
    { bookingId: string; payload: api.UpdateBookingCheckoutPayload }
  >({
    mutationFn: async ({ bookingId, payload }) =>
      api.updateBookingCheckout(bookingId, payload),
    onSuccess: (booking, variables) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: BOOKING_KEYS.detail(booking.id),
      });
      if (variables.payload.editToken !== undefined) {
        queryClient.invalidateQueries({
          queryKey: BOOKING_KEYS.detail(booking.id, variables.payload.editToken),
        });
      }
      queryClient.invalidateQueries({
        queryKey: PUBLIC_QUERY_KEYS.availability.check,
      });
    },
  });
};

export const useCreateManualPayment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateManualPaymentResponse,
    Error,
    {
      bookingId: string;
      idempotencyKey: string;
      amount: number;
      purpose?: PaymentPurpose;
      status?: string;
      checkoutToken?: string;
    }
  >({
    mutationFn: ({
      bookingId,
      idempotencyKey,
      amount,
      purpose,
      status,
      checkoutToken,
    }) =>
      api.createManualPayment(
        bookingId,
        idempotencyKey,
        amount,
        purpose,
        status,
        checkoutToken,
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: BOOKING_KEYS.detail(data.booking.id, variables.checkoutToken),
      });
      queryClient.invalidateQueries({
        queryKey: PUBLIC_QUERY_KEYS.billing.booking(data.booking.id),
      });
      if (variables.checkoutToken !== undefined) {
        queryClient.invalidateQueries({
          queryKey: PUBLIC_QUERY_KEYS.billing.booking(
            data.booking.id,
            variables.checkoutToken,
          ),
        });
      }
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, { bookingId: string; reason?: string }>({
    mutationFn: ({ bookingId, reason }) => api.cancelBooking(bookingId, reason),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: BOOKING_KEYS.detail(booking.id),
      });
      queryClient.invalidateQueries({
        queryKey: PUBLIC_QUERY_KEYS.availability.check,
      });
    },
  });
};

export const useCancellationPreview = () =>
  useMutation<BookingPolicyPreview, Error, { bookingId: string }>({
    mutationFn: ({ bookingId }) => api.getCancellationPreview(bookingId),
  });

export const useRefundPreview = () =>
  useMutation<BookingPolicyPreview, Error, { bookingId: string }>({
    mutationFn: ({ bookingId }) => api.getRefundPreview(bookingId),
  });

export const useCreateRefundRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, { bookingId: string; reason: string }>({
    mutationFn: ({ bookingId, reason }) =>
      api.createRefundRequest(bookingId, reason),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: BOOKING_KEYS.detail(booking.id),
      });
    },
  });
};
