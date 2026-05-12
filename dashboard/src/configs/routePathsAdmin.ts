export const ADMIN_ROUTES = {
  ROOT: "/",

  DASHBOARD: "dashboard",
  TENANTS: "tenants",
  ADMINS: "admins",
  MANAGERS: "managers",
  PROPERTY_ASSIGNMENTS: "property-assignments",

  PROPERTIES: "properties",
  PROPERTIES_CREATE: "properties/create",
  PROPERTY_EDIT: (id: string) => `properties/${id}/edit`,

  UNITS_BY_PROPERTY: (propertyId: string) => `properties/${propertyId}/units`,
  UNIT_CREATE: (propertyId: string) => `properties/${propertyId}/units/create`,
  UNIT_EDIT: (unitId: string) => `units/${unitId}/edit`,

  INVENTORY: "inventory",
  INVENTORY_CHILDREN: {
    PRICING: "pricing",
    AMENITIES: "amenities",
    UNITS: "units",
    ROOMS: "rooms",
    MAINTENANCE: "maintenance",
  },

  BOOKINGS: "bookings",
  ENQUIRIES: "enquiries",
  QUOTES: "quotes",
  SETTINGS: "settings",

  PROFILE: "profile",
  CHANGE_PASSWORD: "change-password",
} as const;

/**
 * Build absolute dashboard URLs (navigation only)
 */
export const adminPath = (...segments: string[]) =>
  `/${segments.filter(Boolean).join("/")}`;
