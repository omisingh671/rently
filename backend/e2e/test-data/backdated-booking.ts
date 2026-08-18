import { randomUUID } from "node:crypto";
import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";

const atUtcMidnightDaysAgo = (daysAgo: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
};

export const createBackdatedCheckedInBooking = async (input: {
  roomId: string;
  scenario: string;
}) => {
  const [room, product, pricing] = await Promise.all([
    prisma.room.findUniqueOrThrow({
      where: { id: input.roomId },
      include: { unit: true },
    }),
    prisma.roomProduct.findUniqueOrThrow({
      where: { id: e2eFixture.productId },
    }),
    prisma.roomPricing.findFirstOrThrow({
      where: {
        roomId: input.roomId,
        productId: e2eFixture.productId,
      },
      orderBy: { validFrom: "desc" },
    }),
  ]);
  const checkIn = atUtcMidnightDaysAgo(2);
  const checkOut = atUtcMidnightDaysAgo(1);
  const fixtureId = randomUUID();
  const amount = pricing.price.toDecimalPlaces(2);
  const targetLabel = `${room.unit.unitNumber} / ${room.number} (${room.name})`;

  const booking = await prisma.booking.create({
    data: {
      bookingRef: `E2E-BACKDATED-${fixtureId}`,
      propertyId: e2eFixture.property.id,
      userId: e2eFixture.users.guest.id,
      productId: product.id,
      source: "WALK_IN",
      targetType: "ROOM",
      unitId: room.unitId,
      roomId: room.id,
      guestCount: 1,
      comfortOption: "NON_AC",
      guestNameSnapshot: `Backdated ${input.scenario}`,
      guestEmailSnapshot: `backdated-${fixtureId}@e2e.rently.test`,
      guestContactSnapshot: "+919000000099",
      targetLabel,
      productName: product.name,
      pricePerNight: amount,
      checkIn,
      checkOut,
      status: "CHECKED_IN",
      checkedInAt: checkIn,
      identityVerifiedAt: checkIn,
      identityDocumentType: "AADHAAR",
      identityDocumentReference: "XXXX-XXXX-0099",
      subtotalAmount: amount,
      taxableAmount: amount,
      totalAmount: amount,
      paymentStatus: "PAID",
      paymentPolicy: "NO_UPFRONT_PAYMENT",
      upfrontAmount: 0,
      internalNotes:
        "E2E-only backdated fixture. Production booking APIs remain date-guarded.",
      items: {
        create: {
          productId: product.id,
          targetType: "ROOM",
          unitId: room.unitId,
          roomId: room.id,
          guestCount: 1,
          comfortOption: "NON_AC",
          targetLabel,
          productName: product.name,
          capacity: room.maxOccupancy,
          pricePerNight: amount,
          pricingId: pricing.id,
          subtotalAmount: amount,
          taxableAmount: amount,
          totalAmount: amount,
          finalAmount: amount,
        },
      },
      statusHistory: {
        create: [
          {
            toStatus: "CONFIRMED",
            actorUserId: e2eFixture.users.frontDesk.id,
            note: "E2E fixture confirmed",
            createdAt: checkIn,
          },
          {
            fromStatus: "CONFIRMED",
            toStatus: "CHECKED_IN",
            actorUserId: e2eFixture.users.frontDesk.id,
            note: "E2E fixture checked in",
            createdAt: checkIn,
          },
        ],
      },
      payments: {
        create: {
          propertyId: e2eFixture.property.id,
          userId: e2eFixture.users.guest.id,
          provider: "MANUAL",
          status: "SUCCEEDED",
          purpose: "FULL_PAYMENT",
          method: "CASH",
          amount,
          idempotencyKey: `e2e-backdated-base-${fixtureId}`,
          receivedByUserId: e2eFixture.users.frontDesk.id,
          paidAt: checkIn,
          note: "E2E fixture base stay payment",
        },
      },
    },
    include: { items: true },
  });
  const bookingItem = booking.items[0];
  if (!bookingItem) {
    throw new Error("Backdated E2E fixture did not create a booking item");
  }

  await prisma.bookingRoomAllocation.create({
    data: {
      bookingId: booking.id,
      bookingItemId: bookingItem.id,
      propertyId: e2eFixture.property.id,
      roomId: room.id,
      actorUserId: e2eFixture.users.frontDesk.id,
      source: "CHECK_IN_ASSIGNED",
      effectiveFrom: checkIn,
    },
  });

  return {
    id: booking.id,
    amount: amount.toNumber(),
  };
};
