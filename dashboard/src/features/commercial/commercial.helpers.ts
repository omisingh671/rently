import type { BookingGroupStatus } from "./types";

export const money = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

export const dateOnly = (value: string) => value.slice(0, 10);

export const toDateTimeLocalValue = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateOnly(value)}T00:00:00Z`));

export const groupStatusClass: Record<BookingGroupStatus, string> = {
  PROSPECT: "bg-slate-100 text-slate-700",
  TENTATIVE: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  IN_HOUSE: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const groupStatusTransitions: Record<
  BookingGroupStatus,
  BookingGroupStatus[]
> = {
  PROSPECT: ["TENTATIVE", "CONFIRMED", "CANCELLED"],
  TENTATIVE: ["PROSPECT", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["TENTATIVE", "IN_HOUSE", "CANCELLED"],
  IN_HOUSE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const groupStatuses = Object.keys(
  groupStatusClass,
) as BookingGroupStatus[];

export type GroupStatusFilter =
  | BookingGroupStatus
  | "ALL";
