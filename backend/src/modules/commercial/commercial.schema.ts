import { z } from "zod";
import { BookingGroupStatus } from "@/generated/prisma/enums.js";

const id = z.string().uuid();
const date = z.coerce.date();
const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
  .nullable()
  .optional();

export const propertyParamsSchema = z.object({ propertyId: id });
export const companyParamsSchema = z.object({ companyId: id });
export const groupParamsSchema = z.object({ groupId: id });
export const groupMemberParamsSchema = z.object({ groupId: id, bookingId: id });
export const groupChargeParamsSchema = z.object({ groupId: id, chargeId: id });

const companyFieldsSchema = z.object({
  legalName: z.string().trim().min(1).max(190),
  tradeName: z.string().trim().min(1).max(190).nullable().optional(),
  gstin,
  billingAddress: z.string().trim().min(1).max(2000).nullable().optional(),
  stateCode: z.string().trim().regex(/^\d{2}$/).nullable().optional(),
  contactName: z.string().trim().min(1).max(190).nullable().optional(),
  contactEmail: z.string().trim().email().max(190).nullable().optional(),
  contactNumber: z.string().trim().min(5).max(40).nullable().optional(),
  creditLimit: z.coerce.number().min(0).max(100_000_000).default(0),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(0),
});

const validateCompanyTaxIdentity = (
  value: {
    gstin?: string | null | undefined;
    stateCode?: string | null | undefined;
  },
  ctx: z.RefinementCtx,
) => {
  if (value.gstin && !value.stateCode) {
    ctx.addIssue({
      code: "custom",
      path: ["stateCode"],
      message: "State code is required when GSTIN is provided",
    });
  }
  if (value.gstin && value.stateCode && value.gstin.slice(0, 2) !== value.stateCode) {
    ctx.addIssue({
      code: "custom",
      path: ["stateCode"],
      message: "State code must match the first two digits of GSTIN",
    });
  }
};

export const createCompanySchema = companyFieldsSchema.superRefine(
  validateCompanyTaxIdentity,
);

export const updateCompanySchema = companyFieldsSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
    reason: z.string().trim().min(5).max(500),
  })
  .superRefine(validateCompanyTaxIdentity);

export const createGroupSchema = z
  .object({
    companyId: id.optional(),
    name: z.string().trim().min(1).max(190),
    checkIn: date,
    checkOut: date,
    expectedRooms: z.coerce.number().int().min(1).max(500),
    expectedGuests: z.coerce.number().int().min(1).max(5000),
    releaseDate: date.optional(),
    billingNotes: z.string().trim().max(5000).optional(),
  })
  .refine((value) => value.checkOut > value.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  })
  .refine(
    (value) => value.releaseDate === undefined || value.releaseDate <= value.checkIn,
    { message: "Release date cannot be after check-in", path: ["releaseDate"] },
  );

export const updateGroupSchema = z.object({
  status: z.nativeEnum(BookingGroupStatus),
  reason: z.string().trim().min(5).max(500),
});

export const updateGroupDetailsSchema = z
  .object({
    name: z.string().trim().min(1).max(190).optional(),
    checkIn: date.optional(),
    checkOut: date.optional(),
    expectedRooms: z.coerce.number().int().min(1).max(500).optional(),
    expectedGuests: z.coerce.number().int().min(1).max(5000).optional(),
    releaseDate: date.nullable().optional(),
    reason: z.string().trim().min(5).max(500),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.checkIn !== undefined ||
      value.checkOut !== undefined ||
      value.expectedRooms !== undefined ||
      value.expectedGuests !== undefined ||
      value.releaseDate !== undefined,
    {
      message: "Provide at least one group detail to update",
      path: ["name"],
    },
  );

export const createGroupBlocksSchema = z.object({
  roomIds: z.array(id).min(1).max(500).transform((values) => [...new Set(values)]),
  releaseDate: date,
  reason: z.string().trim().min(5).max(500),
});

export const releaseGroupBlocksSchema = z.object({
  roomIds: z.array(id).min(1).max(500).optional(),
  reason: z.string().trim().min(5).max(500),
});

export const addGroupMemberSchema = z.object({
  bookingId: id,
  reason: z.string().trim().min(5).max(500),
});

export const createGroupChargeSchema = z.object({
  description: z.string().trim().min(1).max(255),
  amount: z.coerce.number().positive().max(100_000_000),
  note: z.string().trim().max(2000).optional(),
});

export const voidGroupChargeSchema = z.object({
  reason: z.string().trim().min(5).max(2000),
});
