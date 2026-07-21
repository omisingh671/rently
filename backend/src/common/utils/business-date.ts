import { HttpError } from "@/common/errors/http-error.js";

export const getBusinessDateValue = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const getStayDateValue = (date: Date) =>
  date.toISOString().slice(0, 10);

export const assertStayStartsOnOrAfterBusinessDate = (
  checkIn: Date,
  timeZone: string,
  now = new Date(),
) => {
  if (getStayDateValue(checkIn) < getBusinessDateValue(now, timeZone)) {
    throw new HttpError(
      422,
      "PAST_CHECK_IN_NOT_ALLOWED",
      "Check-in date cannot be earlier than today",
    );
  }
};
