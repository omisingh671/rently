export const ADMIN_ROUTES = {
  ROOT: "/",

  DASHBOARD: "dashboard",
  TENANTS: "tenants",
  USERS: "users",
  SESSIONS: "sessions",
  ADMINS: "admins",
  MANAGERS: "managers",
  STAFF: "staff",
  PROPERTY_ASSIGNMENTS: "property-assignments",

  PROPERTIES: "properties",
  PROPERTIES_CREATE: "properties/create",
  PROPERTY_VIEW: (id: string) => `properties/${id}`,
  PROPERTY_EDIT: (id: string) => `properties/${id}/edit`,
  AMENITIES: "amenities",

  UNITS_BY_PROPERTY: (propertyId: string) => `properties/${propertyId}/units`,
  UNIT_CREATE: (propertyId: string) => `properties/${propertyId}/units/create`,
  UNIT_EDIT: (unitId: string) => `units/${unitId}/edit`,

  INVENTORY: "inventory",
  INVENTORY_CHILDREN: {
    PRICING: "pricing",
    UNITS: "units",
    ROOMS: "rooms",
    MAINTENANCE: "maintenance",
    GALLERY: "gallery",
  },

  BOOKINGS: "bookings",
  BOOKING_POLICY: "booking-policy",
  BILLING: "billing",
  REPORTS: "reports",
  BOOKING_DETAIL: (id: string) => `bookings/${id}`,
  FRONT_DESK: "front-desk",
  ROOM_BOARD: "room-board",
  WALK_IN_BOOKING: "bookings/walk-in",
  ENQUIRIES: "enquiries",
  QUOTES: "quotes",
  SETTINGS: "settings",
  NOTIFICATIONS: "notifications",

  PROFILE: "profile",
  CHANGE_PASSWORD: "change-password",
  SYSTEM_GUIDE: "system-guide",
} as const;

/**
 * Build absolute dashboard URLs (navigation only)
 */
export const adminPath = (...segments: string[]) =>
  `/${segments.filter(Boolean).join("/")}`;
