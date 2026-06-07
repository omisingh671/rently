import axiosInstance from "@/api/axios";
import type {
  Booking,
  BookingGuestDetails,
  BookingQuote,
  BookingPolicyPreview,
  ComfortOption,
  CreateOptionBookingPayload,
  InventoryLock,
  CreateManualPaymentResponse,
  PaymentPurpose,
} from "./types";

type GuestDetailsPayload = {
  guestDetails?: BookingGuestDetails;
  couponCode?: string;
};

export interface BookingCheckoutQuotePayload {
  couponCode?: string | null;
  editToken?: string;
}

export interface UpdateBookingCheckoutPayload extends BookingCheckoutQuotePayload {
  guestDetails: BookingGuestDetails;
}

export type CreateBookingPayload =
  | (CreateOptionBookingPayload & GuestDetailsPayload)
  | ({
      bookingType?: "SINGLE_TARGET";
      spaceId: string;
      inventoryLockToken?: string;
      from: string;
      to: string;
      guests: number;
      comfortOption: ComfortOption;
    } & GuestDetailsPayload)
  | ({
      bookingType: "MULTI_ROOM";
      spaceIds: string[];
      inventoryLockToken?: string;
      from: string;
      to: string;
      guests: number;
      comfortOption: ComfortOption;
    } & GuestDetailsPayload);

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

export const getBookingQuote = async (
  payload: CreateBookingPayload,
): Promise<BookingQuote> => {
  const quotePayload = { ...payload };
  delete quotePayload.guestDetails;
  const res = await axiosInstance.post("/public/bookings/quote", quotePayload);
  return res.data?.data;
};

export const getBookingCheckoutQuote = async (
  bookingId: string,
  payload: BookingCheckoutQuotePayload,
): Promise<BookingQuote> => {
  const res = await axiosInstance.post(
    `/public/bookings/${bookingId}/checkout/quote`,
    payload,
  );
  return res.data?.data;
};

export const updateBookingCheckout = async (
  bookingId: string,
  payload: UpdateBookingCheckoutPayload,
): Promise<Booking> => {
  const res = await axiosInstance.patch(
    `/public/bookings/${bookingId}/checkout`,
    payload,
  );
  return res.data?.data;
};

export const createInventoryLock = async (
  payload: CreateBookingPayload,
): Promise<InventoryLock> => {
  const lockPayload = { ...payload };
  delete lockPayload.guestDetails;
  delete lockPayload.couponCode;
  const res = await axiosInstance.post("/public/inventory-locks", lockPayload);
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

export const createRefundRequest = async (
  bookingId: string,
  reason: string,
): Promise<Booking> => {
  const res = await axiosInstance.post(
    `/public/bookings/${bookingId}/refund-requests`,
    { reason },
  );
  return res.data?.data;
};

export const getCancellationPreview = async (
  bookingId: string,
): Promise<BookingPolicyPreview> => {
  const res = await axiosInstance.post(
    `/public/bookings/${bookingId}/cancellation-preview`,
  );
  return res.data?.data;
};

export const getRefundPreview = async (
  bookingId: string,
): Promise<BookingPolicyPreview> => {
  const res = await axiosInstance.post(
    `/public/bookings/${bookingId}/refund-preview`,
  );
  return res.data?.data;
};

export const createManualPayment = async (
  bookingId: string,
  idempotencyKey: string,
  amount: number,
  purpose?: PaymentPurpose,
  status?: string,
): Promise<CreateManualPaymentResponse> => {
  const res = await axiosInstance.post(
    `/public/bookings/${bookingId}/payments/manual`,
    {
      amount,
      ...(purpose !== undefined && { purpose }),
      ...(status !== undefined && { status }),
    },
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );

  return res.data?.data;
};
