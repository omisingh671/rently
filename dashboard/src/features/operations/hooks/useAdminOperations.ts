import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  checkManualBookingAvailabilityApi,
  checkInBookingApi,
  checkOutBookingApi,
  previewCheckInPolicyApi,
  previewCheckOutPolicyApi,
  reverseBookingLifecycleApi,
  createFolioChargeApi,
  createManualBookingApi,
  getBookingApi,
  listBookingsApi,
  listEnquiriesApi,
  listQuotesApi,
  markBookingNoShowApi,
  moveBookingRoomsApi,
  previewBookingRoomMoveApi,
  previewStayExtensionApi,
  commitStayExtensionApi,
  recordBalancePaymentApi,
  recordRefundApi,
  updateRefundRequestApi,
  updateBookingStatusApi,
  updateEnquiryStatusApi,
  updateQuoteStatusApi,
  voidFolioChargeApi,
} from "../api";
import type {
  AdminBooking,
  BookingStatus,
  CheckInBookingPayload,
  CheckOutBookingPayload,
  CheckManualBookingAvailabilityPayload,
  CreateManualBookingPayload,
  CreateFolioChargePayload,
  LeadStatus,
  RecordBalancePaymentPayload,
  RecordRefundPayload,
  UpdateRefundRequestPayload,
  UpdateBookingPayload,
  VersionedBookingNotePayload,
  MoveRoomPayload,
  PreviewRoomMovePayload,
  PreviewStayExtensionPayload,
  CommitStayExtensionPayload,
} from "../types";

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
  page: number,
  limit: number,
  filters: Filters,
) => {
  const queryClient = useQueryClient();
  const enabled = !!propertyId;

  const query = useQuery({
    queryKey: propertyId
      ? [...moduleKey(module, propertyId), page, limit, filters] as const
      : ADMIN_KEYS.operations.all(),
    queryFn: async () => {
      if (!propertyId) throw new Error("PropertyId required");

      const params = {
        page,
        limit,
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

  const invalidateBookingState = (nextPropertyId = propertyId) => {
    if (!nextPropertyId) return;
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.operations.byProperty(nextPropertyId),
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
    onSuccess: (booking) => invalidateBookingState(booking.propertyId),
  });

  const createManualBooking = useMutation({
    mutationFn: ({
      propertyId: targetPropertyId,
      payload,
    }: {
      propertyId: string;
      payload: CreateManualBookingPayload;
    }) => createManualBookingApi(targetPropertyId, payload),
    onSuccess: (booking) => invalidateBookingState(booking.propertyId),
  });

  const checkManualBookingAvailability = useMutation({
    mutationFn: ({
      propertyId: targetPropertyId,
      payload,
    }: {
      propertyId: string;
      payload: CheckManualBookingAvailabilityPayload;
    }) => checkManualBookingAvailabilityApi(targetPropertyId, payload),
  });

  const checkInBooking = useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: CheckInBookingPayload;
    }) => checkInBookingApi(bookingId, payload),
    onSuccess: (booking) => invalidateBookingState(booking.propertyId),
  });

  const checkOutBooking = useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: CheckOutBookingPayload;
    }) => checkOutBookingApi(bookingId, payload),
    onSuccess: (booking) => invalidateBookingState(booking.propertyId),
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
    isError: query.isError,
    error: query.error,
    updateBooking: updateBooking.mutateAsync,
    createManualBooking: createManualBooking.mutateAsync,
    checkManualBookingAvailability:
      checkManualBookingAvailability.mutateAsync,
    checkInBooking: checkInBooking.mutateAsync,
    checkOutBooking: checkOutBooking.mutateAsync,
    updateEnquiry: updateEnquiry.mutateAsync,
    updateQuote: updateQuote.mutateAsync,
    isMutating:
      updateBooking.isPending ||
      createManualBooking.isPending ||
      checkManualBookingAvailability.isPending ||
      checkInBooking.isPending ||
      checkOutBooking.isPending ||
      updateEnquiry.isPending ||
      updateQuote.isPending,
  };
};

export const useAdminBooking = (bookingId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: bookingId
      ? ADMIN_KEYS.operations.bookingDetail(bookingId)
      : ADMIN_KEYS.operations.all(),
    queryFn: async () => {
      if (!bookingId) throw new Error("BookingId required");
      return getBookingApi(bookingId);
    },
    enabled: !!bookingId,
  });

  const refreshBookingDetail = () => {
    if (!bookingId) return;
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.operations.bookingDetail(bookingId),
    });
  };

  const syncBooking = (booking: AdminBooking) => {
    if (!bookingId) return;
    queryClient.setQueryData(
      ADMIN_KEYS.operations.bookingDetail(bookingId),
      booking,
    );
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.operations.byProperty(booking.propertyId),
    });
  };

  const updateBooking = useMutation({
    mutationFn: (payload: UpdateBookingPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return updateBookingStatusApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const checkInBooking = useMutation({
    mutationFn: (payload: CheckInBookingPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return checkInBookingApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const checkOutBooking = useMutation({
    mutationFn: (payload: CheckOutBookingPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return checkOutBookingApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const markNoShow = useMutation({
    mutationFn: (payload: VersionedBookingNotePayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return markBookingNoShowApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const moveRooms = useMutation({
    mutationFn: (payload: MoveRoomPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return moveBookingRoomsApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const previewRoomMove = useMutation({
    mutationFn: (payload: PreviewRoomMovePayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return previewBookingRoomMoveApi(bookingId, payload);
    },
  });

  const previewCheckInPolicy = useMutation({
    mutationFn: (expectedVersion: number) => {
      if (!bookingId) throw new Error("BookingId required");
      return previewCheckInPolicyApi(bookingId, expectedVersion);
    },
  });

  const previewCheckOutPolicy = useMutation({
    mutationFn: (expectedVersion: number) => {
      if (!bookingId) throw new Error("BookingId required");
      return previewCheckOutPolicyApi(bookingId, expectedVersion);
    },
  });

  const previewStayExtension = useMutation({
    mutationFn: (payload: PreviewStayExtensionPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return previewStayExtensionApi(bookingId, payload);
    },
  });

  const extendStay = useMutation({
    mutationFn: (payload: CommitStayExtensionPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return commitStayExtensionApi(bookingId, payload);
    },
    onSuccess: (booking) => {
      syncBooking(booking);
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.billing.all() });
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_KEYS.root, "dashboard"],
      });
    },
    onError: refreshBookingDetail,
  });

  const reverseLifecycle = useMutation({
    mutationFn: (payload: VersionedBookingNotePayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return reverseBookingLifecycleApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const createFolioCharge = useMutation({
    mutationFn: (payload: CreateFolioChargePayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return createFolioChargeApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const voidFolioCharge = useMutation({
    mutationFn: ({
      chargeId,
      payload,
    }: {
      chargeId: string;
      payload: VersionedBookingNotePayload;
    }) => {
      if (!bookingId) throw new Error("BookingId required");
      return voidFolioChargeApi(bookingId, chargeId, payload);
    },
    onSuccess: syncBooking,
  });

  const recordBalancePayment = useMutation({
    mutationFn: (payload: RecordBalancePaymentPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return recordBalancePaymentApi(bookingId, payload);
    },
    onSuccess: syncBooking,
    onError: refreshBookingDetail,
  });

  const recordRefund = useMutation({
    mutationFn: (payload: RecordRefundPayload) => {
      if (!bookingId) throw new Error("BookingId required");
      return recordRefundApi(bookingId, payload);
    },
    onSuccess: syncBooking,
  });

  const updateRefundRequest = useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: UpdateRefundRequestPayload;
    }) => {
      if (!bookingId) throw new Error("BookingId required");
      return updateRefundRequestApi(bookingId, requestId, payload);
    },
    onSuccess: syncBooking,
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    updateBooking: updateBooking.mutateAsync,
    checkInBooking: checkInBooking.mutateAsync,
    checkOutBooking: checkOutBooking.mutateAsync,
    previewCheckInPolicy: previewCheckInPolicy.mutateAsync,
    previewCheckOutPolicy: previewCheckOutPolicy.mutateAsync,
    markNoShow: markNoShow.mutateAsync,
    moveRooms: moveRooms.mutateAsync,
    previewRoomMove: previewRoomMove.mutateAsync,
    isPreviewingRoomMove: previewRoomMove.isPending,
    previewStayExtension: previewStayExtension.mutateAsync,
    isPreviewingStayExtension: previewStayExtension.isPending,
    extendStay: extendStay.mutateAsync,
    reverseLifecycle: reverseLifecycle.mutateAsync,
    createFolioCharge: createFolioCharge.mutateAsync,
    voidFolioCharge: voidFolioCharge.mutateAsync,
    recordBalancePayment: recordBalancePayment.mutateAsync,
    recordRefund: recordRefund.mutateAsync,
    updateRefundRequest: updateRefundRequest.mutateAsync,
    isMutating:
      updateBooking.isPending ||
      checkInBooking.isPending ||
      checkOutBooking.isPending ||
      markNoShow.isPending ||
      moveRooms.isPending ||
      extendStay.isPending ||
      reverseLifecycle.isPending ||
      createFolioCharge.isPending ||
      voidFolioCharge.isPending ||
      recordBalancePayment.isPending ||
      recordRefund.isPending ||
      updateRefundRequest.isPending,
  };
};
