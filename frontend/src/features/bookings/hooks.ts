import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import * as api from "./api";
import type { Booking, CreateManualPaymentResponse } from "./types";
import { useAuthStore } from "@/stores/authStore";

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
  return useMutation({
    mutationFn: async (payload: {
      spaceId: string;
      from: string;
      to: string;
    }) => {
      return api.createBooking(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
    },
  });
};

export const useCreateManualPayment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateManualPaymentResponse,
    Error,
    { bookingId: string; idempotencyKey: string }
  >({
    mutationFn: ({ bookingId, idempotencyKey }) =>
      api.createManualPayment(bookingId, idempotencyKey),
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
    },
  });
};
