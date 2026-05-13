import axiosInstance from "@/api/axios";
import type {
  Booking,
  ComfortOption,
  CreateOptionBookingPayload,
  CreateManualPaymentResponse,
} from "./types";

export type CreateBookingPayload =
  | CreateOptionBookingPayload
  | {
      bookingType?: "SINGLE_TARGET";
      spaceId: string;
      from: string;
      to: string;
      guests: number;
      comfortOption: ComfortOption;
    }
  | {
      bookingType: "MULTI_ROOM";
      spaceIds: string[];
      from: string;
      to: string;
      guests: number;
      comfortOption: ComfortOption;
    };

export const listBookings = async (): Promise<Booking[]> => {
  const res = await axiosInstance.get("/public/bookings");
  return res.data?.data ?? [];
};

export const createBooking = async (
  payload: CreateBookingPayload,
): Promise<Booking> => {
  const res = await axiosInstance.post("/public/bookings", payload);
  return res.data?.data;
};

export const getBooking = async (id: string): Promise<Booking> => {
  const res = await axiosInstance.get(`/public/bookings/${id}`);
  return res.data?.data;
};

export const cancelBooking = async (
  bookingId: string,
  reason?: string,
): Promise<Booking> => {
  const res = await axiosInstance.patch(`/public/bookings/${bookingId}/cancel`, {
    ...(reason !== undefined && { reason }),
  });
  return res.data?.data;
};

export const createManualPayment = async (
  bookingId: string,
  idempotencyKey: string,
): Promise<CreateManualPaymentResponse> => {
  const res = await axiosInstance.post(
    `/public/bookings/${bookingId}/payments/manual`,
    null,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );

  return res.data?.data;
};
