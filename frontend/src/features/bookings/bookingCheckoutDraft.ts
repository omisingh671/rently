import type { Location } from "react-router-dom";
import type { CreateBookingPayload } from "./api";
import type { ComfortOption } from "./types";

const BOOKING_CHECKOUT_DRAFT_STORAGE_KEY = "rently.bookingCheckoutDraft";

export interface BookingCheckoutDraftLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface BookingCheckoutDraftSummary {
  title: string;
  spaceName: string;
  from: string;
  to: string;
  guestCount: number;
  comfortOption: ComfortOption;
  nightlyTotal: number;
  stayTotal: number;
}

export interface BookingCheckoutDraft {
  payload: CreateBookingPayload;
  summary: BookingCheckoutDraftSummary;
  returnTo: BookingCheckoutDraftLocation;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isComfortOption = (value: unknown): value is ComfortOption =>
  value === "AC" || value === "NON_AC";

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isSafePathname = (value: string) =>
  value.startsWith("/") && !value.startsWith("//") && !value.includes("://");

const isLocation = (value: unknown): value is BookingCheckoutDraftLocation => {
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

  if (typeof value.bookingOptionId === "string") return true;

  if (value.bookingType === "MULTI_ROOM") {
    return (
      Array.isArray(value.spaceIds) &&
      value.spaceIds.every((spaceId) => typeof spaceId === "string") &&
      value.spaceIds.length > 1
    );
  }

  return (
    (value.bookingType === undefined || value.bookingType === "SINGLE_TARGET") &&
    typeof value.spaceId === "string"
  );
};

const isSummary = (value: unknown): value is BookingCheckoutDraftSummary => {
  if (!isRecord(value)) return false;

  return (
    typeof value.title === "string" &&
    typeof value.spaceName === "string" &&
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    isPositiveInteger(value.guestCount) &&
    isComfortOption(value.comfortOption) &&
    isPositiveNumber(value.nightlyTotal) &&
    isPositiveNumber(value.stayTotal)
  );
};

const parseDraft = (value: unknown): BookingCheckoutDraft | null => {
  if (!isRecord(value)) return null;

  if (
    !isCreateBookingPayload(value.payload) ||
    !isSummary(value.summary) ||
    !isLocation(value.returnTo)
  ) {
    return null;
  }

  return {
    payload: value.payload,
    summary: value.summary,
    returnTo: value.returnTo,
  };
};

export const toBookingCheckoutDraftLocation = (
  location: Pick<Location, "pathname" | "search" | "hash">,
): BookingCheckoutDraftLocation => ({
  pathname: location.pathname,
  search: location.search,
  hash: location.hash,
});

export const saveBookingCheckoutDraft = (draft: BookingCheckoutDraft) => {
  try {
    window.sessionStorage.setItem(
      BOOKING_CHECKOUT_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
    return true;
  } catch {
    return false;
  }
};

export const getBookingCheckoutDraft = (): BookingCheckoutDraft | null => {
  try {
    const stored = window.sessionStorage.getItem(
      BOOKING_CHECKOUT_DRAFT_STORAGE_KEY,
    );
    if (!stored) return null;

    return parseDraft(JSON.parse(stored));
  } catch {
    clearBookingCheckoutDraft();
    return null;
  }
};

export const clearBookingCheckoutDraft = () => {
  try {
    window.sessionStorage.removeItem(BOOKING_CHECKOUT_DRAFT_STORAGE_KEY);
  } catch {
    // Storage is best-effort; nothing else to clear.
  }
};
