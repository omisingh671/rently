import { HttpError } from "@/common/errors/http-error.js";
import {
  assertPropertyInScope,
  ensurePropertyExists,
  getActor,
  getPropertyScope,
  type DashboardActor,
  type DashboardPropertyScope,
} from "@/common/services/scoping.service.js";
import { UserRole } from "@/generated/prisma/client.js";
import * as repo from "./bookings.repository.js";

export {
  assertPropertyInScope,
  ensurePropertyExists,
  getActor,
  getPropertyScope,
  type DashboardActor,
  type DashboardPropertyScope,
};

export const ensureBookingExists = async (bookingId: string) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return booking;
};

export const assertRole = (
  actor: DashboardActor,
  roles: readonly UserRole[],
) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};
