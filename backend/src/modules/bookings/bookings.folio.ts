import {
  BookingOperationEventType,
  BookingStatus,
  FolioChargeStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type {
  BookingStayExtensionChargePreviewDTO,
} from "./bookings.dto.js";
import type {
  CreateBookingFolioChargeInput,
  VoidBookingFolioChargeInput,
} from "./bookings.inputs.js";
import {
  assertExpectedBookingVersion,
  createOperationEvent,
  findTransactionBooking,
  updateVersionedBooking,
} from "./bookings.lifecycle.js";

const getJsonString = (value: Prisma.JsonValue, key: string) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const item = value[key];
  return typeof item === "string" ? item : null;
};

const getJsonNumber = (value: Prisma.JsonValue, key: string) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const item = value[key];
  return typeof item === "number" ? item : null;
};

export const ensureLateCheckoutExtensionCharge = async (
  tx: Prisma.TransactionClient,
  input: {
    booking: Awaited<ReturnType<typeof findTransactionBooking>>;
    actorUserId: string;
    preview: BookingStayExtensionChargePreviewDTO | null;
    note?: string;
  },
) => {
  if (input.preview === null) {
    return null;
  }

  const existing = input.booking.folioCharges.find((charge) => {
    if (
      charge.status !== FolioChargeStatus.ACTIVE ||
      charge.type !== "EXTENSION"
    ) {
      return false;
    }

    return (
      getJsonString(charge.metadata, "source") === "LATE_CHECKOUT_EXTENSION" &&
      getJsonString(charge.metadata, "originalCheckOutDate") ===
        input.preview?.originalCheckOutDate &&
      getJsonString(charge.metadata, "actualCheckOutDate") ===
        input.preview?.actualCheckOutDate &&
      getJsonNumber(charge.metadata, "extraNights") === input.preview?.extraNights
    );
  });

  if (existing) {
    return existing;
  }

  return tx.bookingFolioCharge.create({
    data: {
      bookingId: input.booking.id,
      propertyId: input.booking.propertyId,
      createdByUserId: input.actorUserId,
      type: "EXTENSION",
      description: `Late checkout extension: ${input.preview.extraNights} night${input.preview.extraNights === 1 ? "" : "s"}`,
      amount: input.preview.totalAmount,
      ...(input.note !== undefined && { note: input.note }),
      metadata: {
        source: "LATE_CHECKOUT_EXTENSION",
        currentAssignment: input.preview.currentAssignment,
        effectiveDate: input.preview.effectiveDate,
        originalCheckOutDate: input.preview.originalCheckOutDate,
        actualCheckOutDate: input.preview.actualCheckOutDate,
        extraNights: input.preview.extraNights,
        nightlyRate: input.preview.nightlyRate,
        baseDifference: input.preview.baseAmount,
        taxDifference: input.preview.taxAmount,
        totalAdjustment: input.preview.totalAmount,
        baseAmount: input.preview.baseAmount,
        taxAmount: input.preview.taxAmount,
        totalAmount: input.preview.totalAmount,
        taxBreakdown: input.preview.taxBreakdown,
        pricingSnapshot: input.preview.pricingSnapshot,
      },
    },
  });
};

export const createBookingFolioChargeInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorUserId: string;
    charge: CreateBookingFolioChargeInput;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.charge.expectedVersion,
  );
  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    throw new HttpError(
      409,
      "FOLIO_CLOSED",
      "Charges cannot be added to a cancelled or no-show booking",
    );
  }
  const charge = await tx.bookingFolioCharge.create({
    data: {
      bookingId: input.bookingId,
      propertyId: booking.propertyId,
      createdByUserId: input.actorUserId,
      type: input.charge.type,
      description: input.charge.description,
      amount: input.charge.amount,
      ...(input.charge.note !== undefined && { note: input.charge.note }),
    },
  });
  await updateVersionedBooking(
    tx,
    input.bookingId,
    input.charge.expectedVersion,
    {},
  );
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actorUserId,
    eventType: BookingOperationEventType.FOLIO_CHARGE,
    ...(input.charge.note !== undefined && { note: input.charge.note }),
    metadata: {
      chargeId: charge.id,
      type: input.charge.type,
      amount: input.charge.amount,
      description: input.charge.description,
    },
  });
};

export const voidBookingFolioChargeInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    chargeId: string;
    actorUserId: string;
    voidCharge: VoidBookingFolioChargeInput;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.voidCharge.expectedVersion,
  );
  const charge = await tx.bookingFolioCharge.findFirst({
    where: {
      id: input.chargeId,
      bookingId: input.bookingId,
      status: FolioChargeStatus.ACTIVE,
    },
  });
  if (!charge) {
    throw new HttpError(
      404,
      "FOLIO_CHARGE_NOT_FOUND",
      "Active folio charge not found",
    );
  }
  await tx.bookingFolioCharge.update({
    where: { id: input.chargeId },
    data: {
      status: FolioChargeStatus.VOID,
      voidReason: input.voidCharge.reason,
      voidedAt: new Date(),
      voidedByUserId: input.actorUserId,
    },
  });
  await updateVersionedBooking(
    tx,
    input.bookingId,
    input.voidCharge.expectedVersion,
    {},
  );
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actorUserId,
    eventType: BookingOperationEventType.FOLIO_CHARGE_VOID,
    note: input.voidCharge.reason,
    metadata: { chargeId: input.chargeId, amount: charge.amount.toString() },
  });
};
