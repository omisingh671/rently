import type { AxiosError } from "axios";
import { normalizeApiError } from "@/utils/errors";

type MaintenanceConflict = {
  bookingRef: string;
  guestNameSnapshot: string;
  status: string;
  checkIn: string;
  checkOut: string;
};

type MaintenanceErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

const isMaintenanceConflict = (value: unknown): value is MaintenanceConflict =>
  typeof value === "object" &&
  value !== null &&
  "bookingRef" in value &&
  typeof value.bookingRef === "string" &&
  "guestNameSnapshot" in value &&
  typeof value.guestNameSnapshot === "string" &&
  "status" in value &&
  typeof value.status === "string" &&
  "checkIn" in value &&
  typeof value.checkIn === "string" &&
  "checkOut" in value &&
  typeof value.checkOut === "string";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

export const getMaintenanceErrorMessage = (error: unknown): string => {
  if (typeof error !== "object" || error === null || !("isAxiosError" in error)) {
    return normalizeApiError(error).message;
  }

  const responseError = (error as AxiosError<MaintenanceErrorResponse>).response
    ?.data.error;
  if (responseError?.code !== "MAINTENANCE_BOOKING_CONFLICT") {
    return normalizeApiError(error).message;
  }

  const conflicts = Array.isArray(responseError.details)
    ? responseError.details.filter(isMaintenanceConflict)
    : [];
  if (conflicts.length === 0) {
    return normalizeApiError(error).message;
  }

  const visibleConflicts = conflicts.slice(0, 3).map(
    (conflict) =>
      `${conflict.bookingRef} - ${conflict.guestNameSnapshot} (${conflict.status}, ${formatDate(conflict.checkIn)} to ${formatDate(conflict.checkOut)})`,
  );
  const remainingCount = conflicts.length - visibleConflicts.length;
  const remainingLabel =
    remainingCount > 0 ? `; plus ${remainingCount} more conflict${remainingCount === 1 ? "" : "s"}` : "";

  return `${responseError.message ?? "Maintenance overlaps active bookings"}. Conflicting bookings: ${visibleConflicts.join("; ")}${remainingLabel}. Change the dates, or use Emergency override with a required audit reason.`;
};
