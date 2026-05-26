import { TENANT_SLUG } from "./appConfig";

const tenantScope = ["tenant", TENANT_SLUG] as const;
const availabilityScope = [...tenantScope, "availability"] as const;

export const PUBLIC_QUERY_KEYS = {
  spaces: {
    all: [...tenantScope, "spaces"] as const,
    detail: (id: string) => [...tenantScope, "spaces", id] as const,
  },
  bookings: {
    all: [...tenantScope, "bookings"] as const,
    detail: (id: string) => [...tenantScope, "bookings", id] as const,
  },
  billing: {
    booking: (bookingId: string, checkoutToken?: string) =>
      [
        ...tenantScope,
        "billing-documents",
        bookingId,
        checkoutToken ?? "auth",
      ] as const,
  },
  availability: {
    all: availabilityScope,
    check: [...availabilityScope, "check"] as const,
    byCriteria: (criteria: {
      checkIn: string;
      checkOut: string;
      guests: number;
      comfort: string;
    }) =>
      [
        ...availabilityScope,
        "check",
        criteria.checkIn,
        criteria.checkOut,
        criteria.guests,
        criteria.comfort,
      ] as const,
  },
} as const;
