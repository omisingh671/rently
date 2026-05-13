export const ADMIN_KEYS = {
  /* ------------------------------------------------ */
  /* ROOT                                             */
  /* ------------------------------------------------ */

  root: ["admin"] as const,

  dashboard: {
    me: () => [...ADMIN_KEYS.root, "dashboard", "me"] as const,
    summary: () => [...ADMIN_KEYS.root, "dashboard", "summary"] as const,
  },

  tenants: {
    all: () => [...ADMIN_KEYS.root, "tenants"] as const,

    list: (params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
    }) => [...ADMIN_KEYS.tenants.all(), "list", params] as const,

    options: () => [...ADMIN_KEYS.tenants.all(), "options"] as const,

    detail: (id: string) =>
      [...ADMIN_KEYS.tenants.all(), "detail", id] as const,
  },

  /* ------------------------------------------------ */
  /* USERS                                            */
  /* ------------------------------------------------ */

  users: {
    all: (scope: "admins" | "managers") =>
      [...ADMIN_KEYS.root, "users", scope] as const,

    list: (params: {
      scope: "admins" | "managers";
      page: number;
      limit: number;
      search?: string;
      isActive?: string;
    }) => [...ADMIN_KEYS.users.all(params.scope), "list", params] as const,

    detail: (scope: "admins" | "managers", id: string) =>
      [...ADMIN_KEYS.users.all(scope), "detail", id] as const,
  },

  assignments: {
    all: () => [...ADMIN_KEYS.root, "assignments"] as const,

    list: (params: {
      page: number;
      limit: number;
      propertyId?: string;
      role?: "ADMIN" | "MANAGER";
    }) => [...ADMIN_KEYS.assignments.all(), "list", params] as const,
  },

  /* ------------------------------------------------ */
  /* PROPERTIES                                       */
  /* ------------------------------------------------ */

  properties: {
    all: () => [...ADMIN_KEYS.root, "properties"] as const,

    list: (params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
      isActive?: boolean;
    }) => [...ADMIN_KEYS.properties.all(), "list", params] as const,

    detail: (id: string) =>
      [...ADMIN_KEYS.properties.all(), "detail", id] as const,
  },

  /* ------------------------------------------------ */
  /* AMENITIES                                        */
  /* ------------------------------------------------ */

  amenities: {
    all: () => [...ADMIN_KEYS.root, "amenities"] as const,

    byProperty: (propertyId: string) =>
      [...ADMIN_KEYS.amenities.all(), propertyId] as const,

    list: (params: {
      propertyId: string;
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
    }) =>
      [
        ...ADMIN_KEYS.amenities.byProperty(params.propertyId),
        "list",
        params,
      ] as const,

    detail: (id: string) =>
      [...ADMIN_KEYS.amenities.all(), "detail", id] as const,
  },

  /* ------------------------------------------------ */
  /* UNITS (Scoped by Property)                       */
  /* ------------------------------------------------ */

  units: {
    all: () => [...ADMIN_KEYS.root, "units"] as const,

    byProperty: (propertyId: string) =>
      [...ADMIN_KEYS.units.all(), propertyId] as const,

    list: (params: {
      propertyId: string;
      page: number;
      limit: number;
      search?: string;
      status?: string;
      isActive?: boolean;
    }) =>
      [
        ...ADMIN_KEYS.units.byProperty(params.propertyId),
        "list",
        {
          page: params.page,
          limit: params.limit,
          ...(params.search && { search: params.search }),
          ...(params.status && { status: params.status }),
          ...(params.isActive !== undefined && {
            isActive: params.isActive,
          }),
        },
      ] as const,

    detail: (id: string) => [...ADMIN_KEYS.units.all(), "detail", id] as const,
  },

  rooms: {
    all: () => [...ADMIN_KEYS.root, "rooms"] as const,

    byProperty: (propertyId: string) =>
      [...ADMIN_KEYS.rooms.all(), propertyId] as const,

    list: (params: {
      propertyId: string;
      page: number;
      limit: number;
      search?: string;
      status?: string;
      isActive?: boolean;
    }) =>
      [
        ...ADMIN_KEYS.rooms.byProperty(params.propertyId),
        "list",
        {
          page: params.page,
          limit: params.limit,
          ...(params.search && { search: params.search }),
          ...(params.status && { status: params.status }),
          ...(params.isActive !== undefined && {
            isActive: params.isActive,
          }),
        },
      ] as const,
  },

  maintenance: {
    all: () => [...ADMIN_KEYS.root, "maintenance"] as const,

    byProperty: (propertyId: string) =>
      [...ADMIN_KEYS.maintenance.all(), propertyId] as const,

    list: (params: {
      propertyId: string;
      page: number;
      limit: number;
      search?: string;
      targetType?: string;
    }) =>
      [
        ...ADMIN_KEYS.maintenance.byProperty(params.propertyId),
        "list",
        {
          page: params.page,
          limit: params.limit,
          ...(params.search && { search: params.search }),
          ...(params.targetType && { targetType: params.targetType }),
        },
      ] as const,
  },

  pricing: {
    all: () => [...ADMIN_KEYS.root, "pricing"] as const,

    byProperty: (propertyId: string) =>
      [...ADMIN_KEYS.pricing.all(), propertyId] as const,

    products: (propertyId: string) =>
      [...ADMIN_KEYS.pricing.byProperty(propertyId), "products"] as const,

    rates: (propertyId: string) =>
      [...ADMIN_KEYS.pricing.byProperty(propertyId), "rates"] as const,

    taxes: (propertyId: string) =>
      [...ADMIN_KEYS.pricing.byProperty(propertyId), "taxes"] as const,

    coupons: (propertyId: string) =>
      [...ADMIN_KEYS.pricing.byProperty(propertyId), "coupons"] as const,
  },

  operations: {
    all: () => [...ADMIN_KEYS.root, "operations"] as const,

    byProperty: (propertyId: string) =>
      [...ADMIN_KEYS.operations.all(), propertyId] as const,

    bookings: (propertyId: string) =>
      [...ADMIN_KEYS.operations.byProperty(propertyId), "bookings"] as const,

    roomBoard: (params: { propertyId: string; from: string; to: string }) =>
      [
        ...ADMIN_KEYS.operations.byProperty(params.propertyId),
        "room-board",
        {
          from: params.from,
          to: params.to,
        },
      ] as const,

    enquiries: (propertyId: string) =>
      [...ADMIN_KEYS.operations.byProperty(propertyId), "enquiries"] as const,

    quotes: (propertyId: string) =>
      [...ADMIN_KEYS.operations.byProperty(propertyId), "quotes"] as const,
  },
} as const;
