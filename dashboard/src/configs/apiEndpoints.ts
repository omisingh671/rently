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
    me: "/dashboard/me",
    summary: "/dashboard/summary",
  },

  tenants: {
    list: "/dashboard/tenants",
    options: "/dashboard/tenants/options",
    create: "/dashboard/tenants",
    byId: (tenantId: string) => `/dashboard/tenants/${tenantId}`,
    updateById: (tenantId: string) => `/dashboard/tenants/${tenantId}`,
  },

  admins: {
    list: "/dashboard/admins",
    create: "/dashboard/admins",
    updateById: (userId: string) => `/dashboard/admins/${userId}`,
  },

  managers: {
    list: "/dashboard/managers",
    create: "/dashboard/managers",
    updateById: (userId: string) => `/dashboard/managers/${userId}`,
  },

  propertyAssignments: {
    list: "/dashboard/property-assignments",
    create: "/dashboard/property-assignments",
    deleteById: (assignmentId: string) =>
      `/dashboard/property-assignments/${assignmentId}`,
  },

  properties: {
    list: "/dashboard/properties",
    create: "/dashboard/properties",
    byId: (propertyId: string) => `/dashboard/properties/${propertyId}`,
    updateById: (propertyId: string) => `/dashboard/properties/${propertyId}`,
  },

  amenities: {
    byProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/amenities`,
    create: (propertyId: string) => `/dashboard/properties/${propertyId}/amenities`,
    byId: (amenityId: string) => `/dashboard/amenities/${amenityId}`,
    updateById: (amenityId: string) => `/dashboard/amenities/${amenityId}`,
  },

  units: {
    byProperty: (propertyId: string) => `/dashboard/properties/${propertyId}/units`,
    byId: (unitId: string) => `/dashboard/units/${unitId}`,
  },

  rooms: {
    byProperty: (propertyId: string) => `/dashboard/properties/${propertyId}/rooms`,
    byId: (roomId: string) => `/dashboard/rooms/${roomId}`,
  },

  maintenance: {
    byProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/maintenance-blocks`,
    byId: (maintenanceId: string) =>
      `/dashboard/maintenance-blocks/${maintenanceId}`,
  },

  pricing: {
    productsByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/room-products`,
    productById: (productId: string) => `/dashboard/room-products/${productId}`,
    ratesByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/pricing`,
    rateById: (pricingId: string) => `/dashboard/pricing/${pricingId}`,
    taxesByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/taxes`,
    taxById: (taxId: string) => `/dashboard/taxes/${taxId}`,
    couponsByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/coupons`,
    couponById: (couponId: string) => `/dashboard/coupons/${couponId}`,
  },

  operations: {
    bookingsByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/bookings`,
    bookingById: (bookingId: string) => `/dashboard/bookings/${bookingId}`,
    bookingPaymentsById: (bookingId: string) =>
      `/dashboard/bookings/${bookingId}/payments`,
    roomBoardByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/room-board`,
    bookingAvailabilityByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/bookings/availability`,
    enquiriesByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/enquiries`,
    enquiryById: (enquiryId: string) => `/dashboard/enquiries/${enquiryId}`,
    quotesByProperty: (propertyId: string) =>
      `/dashboard/properties/${propertyId}/quotes`,
    quoteById: (quoteId: string) => `/dashboard/quotes/${quoteId}`,
  },
} as const;
