export const ROUTES = {
  HOME: "/",

  APARTMENTS: "/apartments",
  ROOMS_TARIFFS: "/rooms-tariffs",
  AMENITIES: "/amenities",
  GALLERY: "/gallery",
  LOCATION: "/location",
  LONG_STAYS: "/long-stays",
  FAQ: "/faq",
  CONTACT: "/contact",

  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: (token = ":token") => `/reset-password/${token}`,

  ACCOUNT: "/account",
  BOOKINGS: "/bookings",
  BOOKING_CHECKOUT: "/bookings/checkout",
  BOOKING_PAYMENT: (id = ":id") => `/bookings/${id}/payment`,

  SPACES: "/spaces",
  SPACE_DETAIL: (id = ":id") => `/spaces/${id}`,
  AVAILABILITY_RESULT: "/availability-result",

  PRIVACY: "/privacy",
  TERMS: "/terms",

  NOT_FOUND: "*",
} as const;

export type RouteKey = keyof typeof ROUTES;
