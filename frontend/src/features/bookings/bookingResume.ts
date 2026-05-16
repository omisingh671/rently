import type { Location } from "react-router-dom";
import type { CreateBookingPayload } from "./api";

const BOOKING_RESUME_STORAGE_KEY = "rently.pendingBookingResume";
const BOOKING_RESUME_TTL_MS = 15 * 60 * 1000;

export interface BookingResumeLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface BookingResumeIntent {
  payload: CreateBookingPayload;
  returnTo: BookingResumeLocation;
  expiresAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isComfortOption = (value: unknown): value is "AC" | "NON_AC" =>
  value === "AC" || value === "NON_AC";

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isSafePathname = (value: string) =>
  value.startsWith("/") && !value.startsWith("//") && !value.includes("://");

const isBookingResumeLocation = (
  value: unknown,
): value is BookingResumeLocation => {
  if (!isRecord(value)) return false;

  return (
    typeof value.pathname === "string" &&
    isSafePathname(value.pathname) &&
    typeof value.search === "string" &&
    typeof value.hash === "string"
  );
};

const isCreateBookingPayload = (
  value: unknown,
): value is CreateBookingPayload => {
  if (!isRecord(value)) return false;

  if (
    typeof value.from !== "string" ||
    typeof value.to !== "string" ||
    !isPositiveInteger(value.guests) ||
    !isComfortOption(value.comfortOption)
  ) {
    return false;
  }

  if (typeof value.bookingOptionId === "string") {
    return true;
  }

  if (value.bookingType === "MULTI_ROOM") {
    return isStringArray(value.spaceIds) && value.spaceIds.length > 1;
  }

  return (
    (value.bookingType === undefined || value.bookingType === "SINGLE_TARGET") &&
    typeof value.spaceId === "string"
  );
};

const parseBookingResumeIntent = (
  value: unknown,
): BookingResumeIntent | null => {
  if (!isRecord(value)) return null;

  if (
    !isCreateBookingPayload(value.payload) ||
    !isBookingResumeLocation(value.returnTo) ||
    typeof value.expiresAt !== "number"
  ) {
    return null;
  }

  if (value.expiresAt <= Date.now()) {
    clearBookingResumeIntent();
    return null;
  }

  return {
    payload: value.payload,
    returnTo: value.returnTo,
    expiresAt: value.expiresAt,
  };
};

export const toBookingResumeLocation = (
  location: Pick<Location, "pathname" | "search" | "hash">,
): BookingResumeLocation => ({
  pathname: location.pathname,
  search: location.search,
  hash: location.hash,
});

export const sameBookingResumeLocation = (
  left: BookingResumeLocation,
  right: BookingResumeLocation,
) =>
  left.pathname === right.pathname &&
  left.search === right.search &&
  left.hash === right.hash;

export const saveBookingResumeIntent = (
  payload: CreateBookingPayload,
  returnTo: BookingResumeLocation,
) => {
  const intent: BookingResumeIntent = {
    payload,
    returnTo,
    expiresAt: Date.now() + BOOKING_RESUME_TTL_MS,
  };

  try {
    window.sessionStorage.setItem(
      BOOKING_RESUME_STORAGE_KEY,
      JSON.stringify(intent),
    );
  } catch {
    // If storage is unavailable, normal route state still preserves the login return.
  }
};

export const getBookingResumeIntent = (): BookingResumeIntent | null => {
  try {
    const stored = window.sessionStorage.getItem(BOOKING_RESUME_STORAGE_KEY);
    if (!stored) return null;

    return parseBookingResumeIntent(JSON.parse(stored));
  } catch {
    clearBookingResumeIntent();
    return null;
  }
};

export const clearBookingResumeIntent = () => {
  try {
    window.sessionStorage.removeItem(BOOKING_RESUME_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
};
