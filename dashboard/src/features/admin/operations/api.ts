import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type {
  AdminBooking,
  AdminEnquiry,
  AdminQuote,
  BookingListResponse,
  BookingStatus,
  CheckManualBookingAvailabilityPayload,
  CreateManualBookingPayload,
  EnquiryListResponse,
  LeadStatus,
  ManualBookingAvailabilityResponse,
  QuoteListResponse,
  RoomBoardResponse,
  UpdateBookingPayload,
} from "./types";

type PageParams = {
  page: number;
  limit: number;
  search?: string;
};

export const listBookingsApi = async (
  propertyId: string,
  params: PageParams & { status?: BookingStatus },
): Promise<BookingListResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<BookingListResponse>
  >(API_ENDPOINTS.operations.bookingsByProperty(propertyId), { params });

  return data.data;
};

export const getBookingApi = async (
  bookingId: string,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingById(bookingId),
  );

  return data.data;
};

export const checkManualBookingAvailabilityApi = async (
  propertyId: string,
  payload: CheckManualBookingAvailabilityPayload,
): Promise<ManualBookingAvailabilityResponse> => {
  const { data } = await axiosInstance.post<
    ApiSuccessResponse<ManualBookingAvailabilityResponse>
  >(API_ENDPOINTS.operations.bookingAvailabilityByProperty(propertyId), payload);

  return data.data;
};

export const getRoomBoardApi = async (
  propertyId: string,
  params: { from: string; to: string },
): Promise<RoomBoardResponse> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<RoomBoardResponse>>(
    API_ENDPOINTS.operations.roomBoardByProperty(propertyId),
    { params },
  );

  return data.data;
};

export const createManualBookingApi = async (
  propertyId: string,
  payload: CreateManualBookingPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingsByProperty(propertyId),
    payload,
  );

  return data.data;
};

export const updateBookingStatusApi = async (
  bookingId: string,
  payload: UpdateBookingPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingById(bookingId),
    payload,
  );

  return data.data;
};

export const checkInBookingApi = async (
  bookingId: string,
  payload: Omit<UpdateBookingPayload, "status">,
): Promise<AdminBooking> =>
  updateBookingStatusApi(bookingId, {
    ...payload,
    status: "CHECKED_IN",
  });

export const checkOutBookingApi = async (
  bookingId: string,
  payload: Omit<UpdateBookingPayload, "status">,
): Promise<AdminBooking> =>
  updateBookingStatusApi(bookingId, {
    ...payload,
    status: "CHECKED_OUT",
  });

export const listEnquiriesApi = async (
  propertyId: string,
  params: PageParams & { status?: LeadStatus; source?: string },
): Promise<EnquiryListResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<EnquiryListResponse>
  >(API_ENDPOINTS.operations.enquiriesByProperty(propertyId), { params });

  return data.data;
};

export const updateEnquiryStatusApi = async (
  enquiryId: string,
  status: LeadStatus,
): Promise<AdminEnquiry> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminEnquiry>>(
    API_ENDPOINTS.operations.enquiryById(enquiryId),
    { status },
  );

  return data.data;
};

export const listQuotesApi = async (
  propertyId: string,
  params: PageParams & { status?: LeadStatus },
): Promise<QuoteListResponse> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<QuoteListResponse>>(
    API_ENDPOINTS.operations.quotesByProperty(propertyId),
    { params },
  );

  return data.data;
};

export const updateQuoteStatusApi = async (
  quoteId: string,
  status: LeadStatus,
): Promise<AdminQuote> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminQuote>>(
    API_ENDPOINTS.operations.quoteById(quoteId),
    { status },
  );

  return data.data;
};
