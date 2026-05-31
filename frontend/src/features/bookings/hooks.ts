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

export const useBooking = (id?: string, enabled = true) => {
  return useQuery<Booking, Error>({
    queryKey: id ? BOOKING_KEYS.detail(id) : BOOKING_KEYS.detail(""),
    queryFn: async () => {
      if (!id) throw new Error("Missing booking id");
      return api.getBooking(id);
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
    }
  >({
    mutationFn: ({ bookingId, idempotencyKey, amount, purpose }) =>
      api.createManualPayment(bookingId, idempotencyKey, amount, purpose),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: BOOKING_KEYS.detail(data.booking.id),
      });
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
