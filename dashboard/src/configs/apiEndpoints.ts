/**
 * API Endpoints
 * ------------------------------------------------------------------------
 * Axios baseURL already includes: `${API_BASE_URL}${API_PREFIX}` → /api/v1
 * ------------------------------------------------------------------------
 */

export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refreshToken: "/auth/refresh",
    me: "/auth/me",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
  },

  profile: {
    me: "/users/me",
    updateMe: "/users/me",
  },

  dashboard: {
    me: "/reporting/context",
    summary: "/reporting/summary",
    analytics: "/reporting/analytics",
  },

  tenants: {
    list: "/tenants",
    options: "/tenants/options",
    create: "/tenants",
    byId: (tenantId: string) => `/tenants/${tenantId}`,
    updateById: (tenantId: string) => `/tenants/${tenantId}`,
    logo: (tenantId: string) => `/tenants/${tenantId}/logo`,
  },

  admins: {
    list: "/users/admins",
    create: "/users/admins",
    updateById: (userId: string) => `/users/admins/${userId}`,
  },

  managers: {
    list: "/users/managers",
    create: "/users/managers",
    updateById: (userId: string) => `/users/managers/${userId}`,
  },

  users: {
    list: "/users",
    byId: (userId: string) => `/users/${userId}`,
    statusById: (userId: string) => `/users/${userId}/status`,
    roleById: (userId: string) => `/users/${userId}/role`,
    passwordResetEmailById: (userId: string) =>
      `/users/${userId}/password-reset-email`,
    forcePasswordChangeById: (userId: string) =>
      `/users/${userId}/force-password-change`,
    sessionsByUserId: (userId: string) => `/users/${userId}/sessions`,
  },

  sessions: {
    list: "/sessions",
    deleteById: (sessionId: string) => `/sessions/${sessionId}`,
    deleteExpired: "/sessions/expired",
  },

  emailDeliveries: {
    list: "/email-deliveries",
    retry: (deliveryId: string) => `/email-deliveries/${deliveryId}/retry`,
  },

  notifications: {
    settings: "/notification-settings",
    globalSetting: "/notification-settings/global",
    propertyOverride: (propertyId: string) =>
      `/properties/${propertyId}/notification-overrides`,
    audits: "/notification-setting-audits",
    deliveries: "/notification-deliveries",
    retryDelivery: (deliveryId: string) =>
      `/notification-deliveries/${deliveryId}/retry`,
  },

  propertyAssignments: {
    list: "/property-assignments",
    create: "/property-assignments",
    deleteById: (assignmentId: string) =>
      `/property-assignments/${assignmentId}`,
  },

  properties: {
    list: "/properties",
    create: "/properties",
    byId: (propertyId: string) => `/properties/${propertyId}`,
    updateById: (propertyId: string) => `/properties/${propertyId}`,
  },

  amenities: {
    list: "/amenities",
    create: "/amenities",
    byId: (amenityId: string) => `/amenities/${amenityId}`,
    updateById: (amenityId: string) => `/amenities/${amenityId}`,
    assignmentsByProperty: (propertyId: string) =>
      `/properties/${propertyId}/amenity-assignments`,
  },

  units: {
    byProperty: (propertyId: string) => `/properties/${propertyId}/units`,
    byId: (unitId: string) => `/units/${unitId}`,
  },

  rooms: {
    byProperty: (propertyId: string) => `/properties/${propertyId}/rooms`,
    byId: (roomId: string) => `/rooms/${roomId}`,
  },

  maintenance: {
    byProperty: (propertyId: string) =>
      `/properties/${propertyId}/maintenance-blocks`,
    byId: (maintenanceId: string) =>
      `/maintenance-blocks/${maintenanceId}`,
  },

  pricing: {
    productsByProperty: (propertyId: string) =>
      `/properties/${propertyId}/room-products`,
    productById: (productId: string) => `/room-products/${productId}`,
    ratesByProperty: (propertyId: string) =>
      `/properties/${propertyId}/pricing`,
    rateById: (pricingId: string) => `/pricing/${pricingId}`,
    taxesByProperty: (propertyId: string) =>
      `/properties/${propertyId}/taxes`,
    taxById: (taxId: string) => `/taxes/${taxId}`,
    couponsByProperty: (propertyId: string) =>
      `/properties/${propertyId}/coupons`,
    couponById: (couponId: string) => `/coupons/${couponId}`,
  },

  bookingPolicy: {
    byProperty: (propertyId: string) =>
      `/properties/${propertyId}/booking-policy`,
  },

  operations: {
    bookingsByProperty: (propertyId: string) =>
      `/properties/${propertyId}/bookings`,
    bookingById: (bookingId: string) => `/bookings/${bookingId}`,
    bookingPaymentsById: (bookingId: string) =>
      `/bookings/${bookingId}/payments`,
    bookingRefundsById: (bookingId: string) =>
      `/bookings/${bookingId}/refunds`,
    bookingRefundRequestById: (bookingId: string, requestId: string) =>
      `/bookings/${bookingId}/refund-requests/${requestId}`,
    bookingCheckInById: (bookingId: string) =>
      `/bookings/${bookingId}/check-in`,
    bookingCheckInPreviewById: (bookingId: string) =>
      `/bookings/${bookingId}/check-in/preview`,
    bookingCheckOutById: (bookingId: string) =>
      `/bookings/${bookingId}/check-out`,
    bookingCheckOutPreviewById: (bookingId: string) =>
      `/bookings/${bookingId}/check-out/preview`,
    bookingNoShowById: (bookingId: string) =>
      `/bookings/${bookingId}/no-show`,
    bookingRoomMoveById: (bookingId: string) =>
      `/bookings/${bookingId}/room-move`,
    bookingRoomMovePreviewById: (bookingId: string) =>
      `/bookings/${bookingId}/room-move/preview`,
    bookingStayExtensionById: (bookingId: string) =>
      `/bookings/${bookingId}/stay-extension`,
    bookingStayExtensionPreviewById: (bookingId: string) =>
      `/bookings/${bookingId}/stay-extension/preview`,
    bookingStatusCorrectionById: (bookingId: string) =>
      `/bookings/${bookingId}/status-correction`,
    bookingFolioChargesById: (bookingId: string) =>
      `/bookings/${bookingId}/folio-charges`,
    bookingFolioChargeById: (bookingId: string, chargeId: string) =>
      `/bookings/${bookingId}/folio-charges/${chargeId}/void`,
    roomBoardByProperty: (propertyId: string) =>
      `/properties/${propertyId}/room-board`,
    roomHousekeepingByProperty: (propertyId: string, roomId: string) =>
      `/properties/${propertyId}/rooms/${roomId}/housekeeping`,
    operationsBoardByProperty: (propertyId: string) =>
      `/properties/${propertyId}/operations/board`,
    cashierSummaryByProperty: (propertyId: string) =>
      `/properties/${propertyId}/operations/cashier-summary`,
    bookingAvailabilityByProperty: (propertyId: string) =>
      `/properties/${propertyId}/bookings/availability`,
    enquiriesByProperty: (propertyId: string) =>
      `/properties/${propertyId}/enquiries`,
    enquiryById: (enquiryId: string) => `/enquiries/${enquiryId}`,
    quotesByProperty: (propertyId: string) =>
      `/properties/${propertyId}/quotes`,
    quoteById: (quoteId: string) => `/quotes/${quoteId}`,
  },

  billing: {
    list: "/billing-documents",
    byId: (documentId: string) => `/billing-documents/${documentId}`,
    invoice: "/billing-documents/invoices",
    receipt: "/billing-documents/receipts",
    download: (documentId: string) =>
      `/billing-documents/${documentId}/download`,
    retryPdf: (documentId: string) =>
      `/billing-documents/${documentId}/pdf/retry`,
    voidById: (documentId: string) =>
      `/billing-documents/${documentId}/void`,
    settingsByProperty: (propertyId: string) =>
      `/properties/${propertyId}/billing-settings`,
  },

  galleries: {
    list: "/galleries",
    upload: "/galleries/upload",
    create: "/galleries",
    deleteById: (galleryId: string) => `/galleries/${galleryId}`,
  },
} as const;
