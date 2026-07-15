import { z } from "zod";
import {
  BookingRefundRequestStatus,
  BookingStatus,
  ComfortOption,
  PaymentMethod,
} from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const countryCodeSchema = z
  .string()
  .regex(/^\+\d{1,4}$/, "Invalid country code");

const contactNumberSchema = z
  .string()
  .regex(/^\d{6,15}$/, "Invalid contact number");

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const contactFieldsRefine = <
  T extends {
    countryCode?: string | undefined;
    contactNumber?: string | undefined;
  },
>(
  schema: z.ZodType<T>,
) =>
  schema.refine(
    (data) =>
      (data.countryCode === undefined && data.contactNumber === undefined) ||
      (data.countryCode !== undefined && data.contactNumber !== undefined),
    { message: "Both countryCode and contactNumber are required together" },
  );

export const idParamsSchema = z.object({
  id: idSchema,
});

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

export const listBookingsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
});

export const updateBookingStatusSchema = z
  .object({
    status: z.nativeEnum(BookingStatus).optional(),
    internalNotes: z.string().trim().max(5000).nullable().optional(),
    note: z.string().trim().max(1000).optional(),
    roomId: idSchema.optional(),
    roomIds: z.array(idSchema).optional(),
    statusOverride: z.boolean().optional(),
    allowBalanceDueCheckIn: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.internalNotes !== undefined ||
      data.roomId !== undefined ||
      data.roomIds !== undefined,
    {
      message: "Status, assignment, or internal notes are required",
    },
  );

const paymentMethodsRequiringReference = new Set<PaymentMethod>([
  PaymentMethod.UPI_MANUAL,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CARD_POS,
]);

export const recordBookingPaymentSchema = z
  .object({
    amount: z.coerce.number().positive(),
    method: z.nativeEnum(PaymentMethod),
    referenceId: z.string().trim().min(1).max(100).optional(),
    payerDetail: z.string().trim().min(1).max(100).optional(),
    note: z.string().trim().max(1000).optional(),
    paidAt: z.coerce.date().optional(),
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      paymentMethodsRequiringReference.has(data.method) &&
      data.referenceId === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referenceId"],
        message: "Reference ID is required for this payment method",
      });
    }
  });

export const recordBookingRefundSchema = z.object({
  paymentId: idSchema,
  amount: z.coerce.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  reason: z.string().trim().min(1).max(1000),
  refundRequestId: idSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const refundRequestParamsSchema = z.object({
  id: idSchema,
  requestId: idSchema,
});

export const updateRefundRequestSchema = z
  .object({
    status: z
      .enum([
        BookingRefundRequestStatus.IN_REVIEW,
        BookingRefundRequestStatus.REJECTED,
      ])
      .optional(),
    adminNote: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.adminNote !== undefined, {
    message: "Status or admin note is required",
  })
  .refine(
    (data) =>
      data.status !== BookingRefundRequestStatus.REJECTED ||
      Boolean(data.adminNote?.trim()),
    {
      message: "Admin note is required when rejecting a refund request",
      path: ["adminNote"],
    },
  );

export const createManualBookingSchema = contactFieldsRefine(
  z
    .object({
      bookingType: z.enum(["SINGLE_TARGET", "MULTI_ROOM"]).default("SINGLE_TARGET"),
      bookingOptionId: z.string().trim().min(1).max(128).optional(),
      spaceId: idSchema.optional(),
      spaceIds: z.array(idSchema).optional(),
      from: z.coerce.date(),
      to: z.coerce.date(),
      guests: z.coerce.number().int().min(1).max(20),
      comfortOption: z.nativeEnum(ComfortOption),
      couponCode: z.string().trim().min(1).max(20).optional(),
      guestName: z.string().trim().min(1).max(120),
      guestEmail: z.string().trim().email().max(190),
      countryCode: countryCodeSchema.optional(),
      contactNumber: contactNumberSchema.optional(),
      internalNotes: z.string().trim().max(5000).nullable().optional(),
    })
    .refine((data) => data.to > data.from, {
      message: "Check-out must be after check-in",
      path: ["to"],
    })
    .superRefine((data, ctx) => {
      if (data.bookingOptionId) {
        return;
      }

      if (data.bookingType === "MULTI_ROOM") {
        if (!data.spaceIds || data.spaceIds.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least two spaces are required for a multi-room booking",
            path: ["spaceIds"],
          });
        }
        return;
      }

      if (!data.spaceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "spaceId is required",
          path: ["spaceId"],
        });
      }
    }),
);

export const checkManualBookingAvailabilitySchema = z
  .object({
    spaceIds: z.array(idSchema).optional(),
    from: z.coerce.date(),
    to: z.coerce.date(),
    guests: z.coerce.number().int().min(1).max(20),
    comfortOption: z.nativeEnum(ComfortOption),
  })
  .refine((data) => data.to > data.from, {
    message: "Check-out must be after check-in",
    path: ["to"],
  });

export const roomBoardQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((data) => data.to > data.from, {
    message: "End date must be after start date",
    path: ["to"],
  });

const expectedVersionSchema = z.number().int().positive();

export const checkInBookingSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    roomIds: z.array(idSchema).min(1).optional(),
    identityVerified: z.literal(true),
    identityDocumentType: z.string().trim().min(1).max(50).optional(),
    identityDocumentReference: z.string().trim().min(1).max(100).optional(),
    allowBalanceDueCheckIn: z.boolean().optional(),
    note: z.string().trim().max(1000).optional(),
    policyFingerprint: z.string().trim().length(64).optional(),
    allowPolicyOverride: z.boolean().optional(),
    overrideReason: z.string().trim().min(1).max(1000).optional(),
  })
  .refine(
    (data) =>
      (data.identityDocumentType === undefined &&
        data.identityDocumentReference === undefined) ||
      (data.identityDocumentType !== undefined &&
        data.identityDocumentReference !== undefined),
    {
      message:
        "Identity document type and masked reference must be provided together",
    },
  );

export const checkOutBookingSchema = z.object({
  expectedVersion: expectedVersionSchema,
  allowBalanceDueCheckout: z.boolean().optional(),
  note: z.string().trim().max(1000).optional(),
  policyFingerprint: z.string().trim().length(64).optional(),
});

export const previewBookingLifecyclePolicySchema = z.object({
  expectedVersion: expectedVersionSchema,
});

export const noShowBookingSchema = z.object({
  expectedVersion: expectedVersionSchema,
  note: z.string().trim().min(1).max(1000),
});

export const previewBookingRoomMoveSchema = z.object({
  expectedVersion: expectedVersionSchema,
  roomIds: z.array(idSchema).min(1),
});

export const moveBookingRoomSchema = previewBookingRoomMoveSchema.extend({
  note: z.string().trim().min(1).max(1000),
  pricingFingerprint: z.string().trim().min(1).max(128),
  expectedAdjustmentAmount: z.coerce.number(),
  pricingAction: z.enum([
    "CHARGE_DIFFERENCE",
    "COMPLIMENTARY_UPGRADE",
    "APPLY_CREDIT",
    "NO_CREDIT",
  ]),
});

export const previewStayExtensionSchema = z.object({
  expectedVersion: expectedVersionSchema,
  newCheckOut: z.coerce.date().refine(
    (date) =>
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0 &&
      date.getUTCMilliseconds() === 0,
    "New check-out must be a date-only UTC value",
  ),
});

export const commitStayExtensionSchema = previewStayExtensionSchema.extend({
  pricingFingerprint: z.string().trim().length(64),
  note: z.string().trim().min(1).max(1000),
  overrideReason: z.string().trim().min(1).max(1000).optional(),
});

export const correctBookingStatusSchema = z.object({
  expectedVersion: expectedVersionSchema,
  status: z.nativeEnum(BookingStatus),
  note: z.string().trim().min(1).max(1000),
});

export const updateRoomHousekeepingSchema = z.object({
  expectedStatus: z.enum(["DIRTY", "CLEANING", "CLEAN", "INSPECTED"]),
  status: z.enum(["DIRTY", "CLEANING", "CLEAN", "INSPECTED"]),
  note: z.string().trim().max(1000).optional(),
});

export const createBookingFolioChargeSchema = z.object({
  expectedVersion: expectedVersionSchema,
  type: z.enum(["INCIDENTAL", "PENALTY", "EXTENSION", "ADJUSTMENT"]),
  description: z.string().trim().min(1).max(255),
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(1000).optional(),
});

export const voidBookingFolioChargeSchema = z.object({
  expectedVersion: expectedVersionSchema,
  reason: z.string().trim().min(1).max(1000),
});

export const operationsBoardQuerySchema = z.object({
  businessDate: z.coerce.date(),
});

export const cashierSummaryQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((data) => data.to > data.from, {
    message: "End date must be after start date",
    path: ["to"],
  });
