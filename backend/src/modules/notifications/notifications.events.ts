import { prisma } from "@/db/prisma.js";
import type { NotificationEventKey } from "@/generated/prisma/enums.js";
import { publishBusinessNotification } from "./notifications.delivery.service.js";
import { logError } from "@/common/observability/logger.js";

export const publishBookingNotification = async (input: {
  eventKey: NotificationEventKey;
  businessEventId: string;
  bookingId: string;
  amount?: string;
  currency?: string;
}) => {
  try {
    const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      bookingRef: true,
      propertyId: true,
      guestNameSnapshot: true,
      guestEmailSnapshot: true,
      checkIn: true,
      checkOut: true,
      property: { select: { name: true } },
    },
  });
    if (!booking?.guestEmailSnapshot) return;

    await publishBusinessNotification({
      eventKey: input.eventKey,
      propertyId: booking.propertyId,
      recipient: booking.guestEmailSnapshot,
      businessEventId: input.businessEventId,
      payload: {
        recipientName: booking.guestNameSnapshot,
        propertyName: booking.property.name,
        bookingReference: booking.bookingRef,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.currency !== undefined && { currency: input.currency }),
      },
    });
  } catch (error) {
    logError("Booking notification preparation failed", error, {
      bookingId: input.bookingId,
      eventKey: input.eventKey,
      businessEventId: input.businessEventId,
    });
  }
};
