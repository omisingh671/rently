export const ADMIN_KEYS = {
  /* ------------------------------------------------ */
  /* ROOT                                             */
  /* ------------------------------------------------ */

  root: ["admin"] as const,

  dashboard: {
    me: () => [...ADMIN_KEYS.root, "dashboard", "me"] as const,
    summary: () => [...ADMIN_KEYS.root, "dashboard", "summary"] as const,
    analytics: (params: { startDate: string; endDate: string; propertyId?: string }) =>
      [...ADMIN_KEYS.root, "dashboard", "analytics", params] as const,
    dailyCloses: (params: {
      propertyId: string;
      startDate: string;
      endDate: string;
    }) => [...ADMIN_KEYS.root, "dashboard", "daily-closes", params] as const,
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
      all: (scope: "admins" | "team") =>
      [...ADMIN_KEYS.root, "users", scope] as const,

    list: (params: {
        scope: "admins" | "team";
      page: number;
      limit: number;
      search?: string;
        isActive?: string;
        role?: string;
    }) => [...ADMIN_KEYS.users.all(params.scope), "list", params] as const,

      detail: (scope: "admins" | "team", id: string) =>
      [...ADMIN_KEYS.users.all(scope), "detail", id] as const,
  },

  managedUsers: {
    all: () => [...ADMIN_KEYS.root, "managed-users"] as const,

    list: (params: {
      page: number;
      limit: number;
      search?: string;
      role?: string;
      isActive?: string;
      mustChangePassword?: string;
    }) => [...ADMIN_KEYS.managedUsers.all(), "list", params] as const,
  },

  sessions: {
    all: () => [...ADMIN_KEYS.root, "sessions"] as const,

    list: (params: {
      page: number;
      limit: number;
      search?: string;
      userId?: string;
      role?: string;
      status?: string;
    }) => [...ADMIN_KEYS.sessions.all(), "list", params] as const,
  },

  assignments: {
    all: () => [...ADMIN_KEYS.root, "assignments"] as const,

    list: (params: {
      page: number;
      limit: number;
      propertyId?: string;
      role?: "ADMIN" | "MANAGER" | "FRONT_DESK" | "ACCOUNTANT";
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

    list: (params: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
    }) => [...ADMIN_KEYS.amenities.all(), "list", params] as const,

    active: () => [...ADMIN_KEYS.amenities.all(), "active"] as const,

    assignments: (propertyId: string) =>
      [...ADMIN_KEYS.amenities.all(), "assignments", propertyId] as const,

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

  emailDeliveries: {
    all: () => [...ADMIN_KEYS.root, "email-deliveries"] as const,
  },

  notifications: {
    all: () => [...ADMIN_KEYS.root, "notifications"] as const,
    settings: (propertyId?: string) =>
      [...ADMIN_KEYS.notifications.all(), "settings", propertyId ?? "global"] as const,
    audits: () => [...ADMIN_KEYS.notifications.all(), "audits"] as const,
    deliveries: () => [...ADMIN_KEYS.notifications.all(), "deliveries"] as const,
  },

  galleries: {
    all: () => [...ADMIN_KEYS.root, "galleries"] as const,

    list: (params: {
      propertyId?: string;
      unitId?: string;
      roomId?: string;
    }) => [...ADMIN_KEYS.galleries.all(), "list", params] as const,
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

  bookingPolicy: {
    all: () => [...ADMIN_KEYS.root, "booking-policy"] as const,

    detail: (propertyId: string) =>
      [...ADMIN_KEYS.bookingPolicy.all(), propertyId] as const,
  },

  operations: {
    all: () => [...ADMIN_KEYS.root, "operations"] as const,

    byProperty: (propertyId: string) =>
      [...ADMIN_KEYS.operations.all(), propertyId] as const,

    bookings: (propertyId: string) =>
      [...ADMIN_KEYS.operations.byProperty(propertyId), "bookings"] as const,

    bookingDetail: (bookingId: string) =>
      [...ADMIN_KEYS.operations.all(), "bookings", "detail", bookingId] as const,

    roomBoards: (propertyId: string) =>
      [...ADMIN_KEYS.operations.byProperty(propertyId), "room-board"] as const,

    roomBoard: (params: { propertyId: string; from: string; to: string }) =>
      [
        ...ADMIN_KEYS.operations.roomBoards(params.propertyId),
        {
          from: params.from,
          to: params.to,
        },
      ] as const,

    operationsBoard: (propertyId: string, businessDate: string) =>
      [
        ...ADMIN_KEYS.operations.byProperty(propertyId),
        "operations-board",
        businessDate,
      ] as const,

    cashierSummary: (propertyId: string, from: string, to: string) =>
      [
        ...ADMIN_KEYS.operations.byProperty(propertyId),
        "cashier-summary",
        { from, to },
      ] as const,

    enquiries: (propertyId: string) =>
      [...ADMIN_KEYS.operations.byProperty(propertyId), "enquiries"] as const,

    quotes: (propertyId: string) =>
      [...ADMIN_KEYS.operations.byProperty(propertyId), "quotes"] as const,
  },

  billing: {
    all: () => [...ADMIN_KEYS.root, "billing"] as const,

    list: (params: {
      page: number;
      limit: number;
      propertyId?: string;
      type?: string;
      status?: string;
      bookingRef?: string;
      guest?: string;
      from?: string;
      to?: string;
    }) => [...ADMIN_KEYS.billing.all(), "list", params] as const,

    booking: (bookingId: string) =>
      [...ADMIN_KEYS.billing.all(), "booking", bookingId] as const,

    detail: (documentId: string) =>
      [...ADMIN_KEYS.billing.all(), "detail", documentId] as const,

    setting: (propertyId: string) =>
      [...ADMIN_KEYS.billing.all(), "settings", propertyId] as const,

    settingAudits: (propertyId: string) =>
      [...ADMIN_KEYS.billing.setting(propertyId), "audits"] as const,
  },
} as const;
