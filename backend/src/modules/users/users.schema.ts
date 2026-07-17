import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const countryCodeSchema = z
  .string()
  .regex(/^\+\d{1,4}$/, "Invalid country code");

const contactNumberSchema = z
  .string()
  .regex(/^\d{6,15}$/, "Invalid contact number");

const optionalBooleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true")
  .optional();

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

/**
 * Pagination Query Schemas
 */
export const listUsersQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listAllUsersQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: optionalBooleanQuerySchema,
  mustChangePassword: optionalBooleanQuerySchema,
});

/**
 * Admin Action Schemas
 */
export const createUserSchema = z
  .object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.nativeEnum(UserRole),
    countryCode: countryCodeSchema.optional(),
    contactNumber: contactNumberSchema.optional(),
  })
  .refine(
    (d) =>
      (d.countryCode === undefined && d.contactNumber === undefined) ||
      (d.countryCode !== undefined && d.contactNumber !== undefined),
    { message: "Both countryCode and contactNumber are required together" },
  );

export const updateUserSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
    countryCode: countryCodeSchema.optional(),
    contactNumber: contactNumberSchema.optional(),
  })
  .refine(
    (d) =>
      (d.countryCode === undefined && d.contactNumber === undefined) ||
      (d.countryCode !== undefined && d.contactNumber !== undefined),
    { message: "Both countryCode and contactNumber are required together" },
  );

export const createDashboardUserSchema = contactFieldsRefine(
  z.object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    password: z.string().min(8),
    countryCode: countryCodeSchema.optional(),
    contactNumber: contactNumberSchema.optional(),
  }),
);

export const staffRoleSchema = z.enum([
  UserRole.FRONT_DESK,
  UserRole.ACCOUNTANT,
]);

export const listStaffQuerySchema = listUsersQuerySchema.extend({
  role: staffRoleSchema,
});

export const createDashboardStaffSchema = contactFieldsRefine(
  z.object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    password: z.string().min(8),
    role: staffRoleSchema,
    countryCode: countryCodeSchema.optional(),
    contactNumber: contactNumberSchema.optional(),
  }),
);

export const updateDashboardUserSchema = contactFieldsRefine(
  z
    .object({
      fullName: z.string().trim().min(1).max(120).optional(),
      isActive: z.boolean().optional(),
      countryCode: countryCodeSchema.optional(),
      contactNumber: contactNumberSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
);

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum([
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FRONT_DESK,
    UserRole.ACCOUNTANT,
    UserRole.GUEST,
  ]),
});

export const updateForcePasswordChangeSchema = z.object({
  mustChangePassword: z.boolean(),
});

/**
 * Self profile schemas
 */
export const updateProfileSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    countryCode: countryCodeSchema.optional(),
    contactNumber: contactNumberSchema.optional(),
  })
  .refine(
    (d) =>
      d.fullName !== undefined ||
      d.countryCode !== undefined ||
      d.contactNumber !== undefined,
    { message: "At least one field must be provided" },
  )
  .refine(
    (d) =>
      (d.countryCode === undefined && d.contactNumber === undefined) ||
      (d.countryCode !== undefined && d.contactNumber !== undefined),
    { message: "Both countryCode and contactNumber are required together" },
  );
