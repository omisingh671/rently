import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type {
  AdminBooking,
  AdminEnquiry,
  AdminQuote,
  BookingListResponse,
  BookingStatus,
  CashierSummaryResponse,
  CheckInBookingPayload,
  CheckOutBookingPayload,
  CheckManualBookingAvailabilityPayload,
  CreateManualBookingPayload,
  EnquiryListResponse,
  LeadStatus,
  ManualBookingAvailabilityResponse,
  RecordBalancePaymentPayload,
  RecordRefundPayload,
  QuoteListResponse,
  UpdateRefundRequestPayload,
  RoomBoardResponse,
  OperationsBoardResponse,
  CorrectBookingStatusPayload,
  CreateFolioChargePayload,
  RoomHousekeepingStatus,
  VersionedBookingNotePayload,
  UpdateBookingPayload,
  MoveRoomPayload,
  PreviewRoomMovePayload,
  RoomMovePreview,
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

export const recordBalancePaymentApi = async (
  bookingId: string,
  payload: RecordBalancePaymentPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingPaymentsById(bookingId),
    payload,
  );

  return data.data;
};

export const recordRefundApi = async (
  bookingId: string,
  payload: RecordRefundPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingRefundsById(bookingId),
    payload,
  );

  return data.data;
};

export const updateRefundRequestApi = async (
  bookingId: string,
  requestId: string,
  payload: UpdateRefundRequestPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingRefundRequestById(bookingId, requestId),
    payload,
  );

  return data.data;
};

export const checkInBookingApi = async (
  bookingId: string,
  payload: CheckInBookingPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingCheckInById(bookingId),
    payload,
  );
  return data.data;
};

export const checkOutBookingApi = async (
  bookingId: string,
  payload: CheckOutBookingPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingCheckOutById(bookingId),
    payload,
  );
  return data.data;
};

export const markBookingNoShowApi = async (
  bookingId: string,
  payload: VersionedBookingNotePayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingNoShowById(bookingId),
    payload,
  );
  return data.data;
};

export const moveBookingRoomsApi = async (
  bookingId: string,
  payload: MoveRoomPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingRoomMoveById(bookingId),
    payload,
  );
  return data.data;
};

export const previewBookingRoomMoveApi = async (
  bookingId: string,
  payload: PreviewRoomMovePayload,
): Promise<RoomMovePreview> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<RoomMovePreview>>(
    API_ENDPOINTS.operations.bookingRoomMovePreviewById(bookingId),
    payload,
  );
  return data.data;
};

export const correctBookingStatusApi = async (
  bookingId: string,
  payload: CorrectBookingStatusPayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingStatusCorrectionById(bookingId),
    payload,
  );
  return data.data;
};

export const createFolioChargeApi = async (
  bookingId: string,
  payload: CreateFolioChargePayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingFolioChargesById(bookingId),
    payload,
  );
  return data.data;
};

export const voidFolioChargeApi = async (
  bookingId: string,
  chargeId: string,
  payload: VersionedBookingNotePayload,
): Promise<AdminBooking> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminBooking>>(
    API_ENDPOINTS.operations.bookingFolioChargeById(bookingId, chargeId),
    { expectedVersion: payload.expectedVersion, reason: payload.note },
  );
  return data.data;
};

export const updateRoomHousekeepingApi = async (
  propertyId: string,
  roomId: string,
  payload: {
    expectedStatus: RoomHousekeepingStatus;
    status: RoomHousekeepingStatus;
    note?: string;
  },
): Promise<{
  roomId: string;
  status: RoomHousekeepingStatus;
  updatedAt: string;
}> => {
  const { data } = await axiosInstance.patch<
    ApiSuccessResponse<{
      roomId: string;
      status: RoomHousekeepingStatus;
      updatedAt: string;
    }>
  >(
    API_ENDPOINTS.operations.roomHousekeepingByProperty(propertyId, roomId),
    payload,
  );
  return data.data;
};

export const getOperationsBoardApi = async (
  propertyId: string,
  businessDate: string,
): Promise<OperationsBoardResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<OperationsBoardResponse>
  >(API_ENDPOINTS.operations.operationsBoardByProperty(propertyId), {
    params: { businessDate },
  });
  return data.data;
};

export const getCashierSummaryApi = async (
  propertyId: string,
  params: { from: string; to: string },
): Promise<CashierSummaryResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<CashierSummaryResponse>
  >(API_ENDPOINTS.operations.cashierSummaryByProperty(propertyId), { params });
  return {
    ...data.data,
    rows: data.data.rows.map((row) => ({
      ...row,
      history: Array.isArray(row.history) ? row.history : [],
    })),
  };
};

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
