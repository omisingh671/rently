import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums.js";

const countryCodeSchema = z
  .string()
  .regex(/^\+\d{1,4}$/, "Invalid country code");

const contactNumberSchema = z
  .string()
  .regex(/^\d{6,15}$/, "Invalid contact number");

/**
 * Admin schemas
 **/
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

/**
 * Self profile
 **/
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
