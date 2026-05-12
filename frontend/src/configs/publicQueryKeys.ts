import { TENANT_SLUG } from "./appConfig";

const tenantScope = ["tenant", TENANT_SLUG] as const;

export const PUBLIC_QUERY_KEYS = {
  spaces: {
    all: [...tenantScope, "spaces"] as const,
    detail: (id: string) => [...tenantScope, "spaces", id] as const,
  },
  bookings: {
    all: [...tenantScope, "bookings"] as const,
    detail: (id: string) => [...tenantScope, "bookings", id] as const,
  },
  availability: {
    check: [...tenantScope, "availability", "check"] as const,
  },
} as const;
