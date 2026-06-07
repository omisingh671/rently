import { PROPERTY_SLUG, TENANT_SLUG } from "./appConfig";

const publicScope = [
  "tenant",
  TENANT_SLUG,
  "property",
  PROPERTY_SLUG ?? "all",
] as const;
const availabilityScope = [...publicScope, "availability"] as const;

export const PUBLIC_QUERY_KEYS = {
  config: [...publicScope, "config"] as const,
  spaces: {
    all: (city?: string) => [...publicScope, "spaces", city ?? "all"] as const,
    detail: (id: string) => [...publicScope, "spaces", id] as const,
  },
  bookings: {
    all: [...publicScope, "bookings"] as const,
    detail: (id: string) => [...publicScope, "bookings", id] as const,
  },
  billing: {
    booking: (bookingId: string, checkoutToken?: string) =>
      [
        ...publicScope,
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
      city?: string;
    }) =>
      [
        ...availabilityScope,
        "check",
        criteria.checkIn,
        criteria.checkOut,
        criteria.guests,
        criteria.comfort,
        criteria.city ?? "all",
      ] as const,
  },
} as const;
