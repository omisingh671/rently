import {
  BookingOperationEventType,
  BookingStatus,
  FolioChargeStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { billingService } from "@/modules/billing/index.js";
import type {
  BookingRoomMovePreviewDTO,
  BookingStayExtensionChargePreviewDTO,
} from "./bookings.dto.js";
import type {
  CreateBookingFolioChargeInput,
  MoveBookingRoomInput,
  VoidBookingFolioChargeInput,
} from "./bookings.inputs.js";
import type { DashboardActor } from "./bookings.access.js";
import {
  assertExpectedBookingVersion,
  createOperationEvent,
  findTransactionBooking,
  updateVersionedBooking,
} from "./bookings.lifecycle.js";
import * as repo from "./bookings.repository.js";
import {
  defaultBookingPolicyCreateData,
  parsePolicySnapshot,
} from "@/modules/booking-policy/booking-policy.policy.js";
import {
  buildStayPolicySnapshot,
  buildStayPolicySnapshotFromBooking,
} from "@/modules/booking-policy/stay-policy.js";
import { buildLateCheckoutPolicyPreview } from "./bookings.stay-policy.js";

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
        tariffType: input.preview.tariffType,
        tariffValue: input.preview.tariffValue,
        policySnapshot: input.preview.policySnapshot,
      },
    },
  });
};

export const postLateCheckoutExtensionCharge = async (
  bookingId: string,
  actor: DashboardActor,
  input: {
    expectedVersion?: number;
    note?: string;
  },
) =>
  repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    if (input.expectedVersion !== undefined) {
      assertExpectedBookingVersion(booking.version, input.expectedVersion);
    }
    if (booking.status !== BookingStatus.CHECKED_IN) {
      return {
        extensionChargeId: null,
        extensionPreview: null,
      };
    }
    const bookedPolicy = parsePolicySnapshot(booking.policySnapshot);
    const policySnapshot = bookedPolicy
      ? buildStayPolicySnapshotFromBooking(bookedPolicy)
      : buildStayPolicySnapshot(
          await tx.propertyBookingPolicy.upsert({
            where: { propertyId: booking.propertyId },
            create: {
              propertyId: booking.propertyId,
              ...defaultBookingPolicyCreateData,
            },
            update: {},
          }),
        );
    const extensionPreview = await buildLateCheckoutPolicyPreview(
      tx,
      booking,
      policySnapshot,
    );
    const extensionCharge = await ensureLateCheckoutExtensionCharge(tx, {
      booking,
      actorUserId: actor.id,
      preview: extensionPreview,
      ...(input.note !== undefined && { note: input.note }),
    });
    if (extensionCharge !== null) {
      await billingService.createDebitNoteForFolioCharge(
        booking.id,
        extensionCharge.id,
        tx,
      );
    }

    return {
      extensionChargeId: extensionCharge?.id ?? null,
      extensionPreview,
    };
  });

export const createRoomMoveAdjustmentCharge = async (
  tx: Prisma.TransactionClient,
  input: {
    booking: Awaited<ReturnType<typeof findTransactionBooking>>;
    actorUserId: string;
    roomMove: MoveBookingRoomInput;
    pricingPreview: BookingRoomMovePreviewDTO;
    oldRoomIds: string[];
  },
) => {
  if (
    !input.pricingPreview.pricingRequired ||
    (input.roomMove.pricingAction !== "CHARGE_DIFFERENCE" &&
      input.roomMove.pricingAction !== "APPLY_CREDIT")
  ) {
    return null;
  }

  const charge = await tx.bookingFolioCharge.create({
    data: {
      bookingId: input.booking.id,
      propertyId: input.booking.propertyId,
      createdByUserId: input.actorUserId,
      type: "ADJUSTMENT",
      description:
        input.roomMove.pricingAction === "APPLY_CREDIT"
          ? `Accommodation downgrade credit: ${input.pricingPreview.destinationAssignment}`
          : `Accommodation upgrade: ${input.pricingPreview.destinationAssignment}`,
      amount: input.pricingPreview.totalAdjustment,
      note: input.roomMove.note,
      metadata: {
        source: "PRICED_ROOM_MOVE",
        pricingAction: input.roomMove.pricingAction,
        currentAssignment: input.pricingPreview.currentAssignment,
        destinationAssignment: input.pricingPreview.destinationAssignment,
        effectiveDate: input.pricingPreview.effectiveDate,
        affectedNights: input.pricingPreview.affectedNights,
        currentNightlyRate: input.pricingPreview.currentNightlyRate,
        destinationNightlyRate: input.pricingPreview.destinationNightlyRate,
        baseDifference: input.pricingPreview.baseDifference,
        taxDifference: input.pricingPreview.taxDifference,
        totalAdjustment: input.pricingPreview.totalAdjustment,
        taxBreakdown: input.pricingPreview.taxBreakdown,
        pricingFingerprint: input.pricingPreview.pricingFingerprint,
        oldRoomIds: input.oldRoomIds,
        newRoomIds: input.roomMove.roomIds,
      },
    },
  });
  if (input.roomMove.pricingAction === "CHARGE_DIFFERENCE") {
    await billingService.createDebitNoteForFolioCharge(
      input.booking.id,
      charge.id,
      tx,
    );
  }

  return charge;
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
  await billingService.createDebitNoteForFolioCharge(
    booking.id,
    charge.id,
    tx,
  );
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
  const creditNote = await billingService.createCreditNoteForVoidedFolioCharge(
    booking.id,
    charge.id,
    input.voidCharge.reason,
    tx,
  );
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
    metadata: {
      chargeId: input.chargeId,
      amount: charge.amount.toString(),
      creditNoteId: creditNote?.id ?? null,
    },
  });
};
