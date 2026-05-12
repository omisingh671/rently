import { z } from "zod";

/**
 * Login
 **/
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Registration (public)
 **/
export const registerSchema = z
  .object({
    fullName: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8),

    countryCode: z
      .string()
      .regex(/^\+\d{1,4}$/)
      .optional(),

    contactNumber: z
      .string()
      .regex(/^\d{6,15}$/)
      .optional(),
  })
  .refine(
    (d) =>
      (d.countryCode === undefined && d.contactNumber === undefined) ||
      (d.countryCode !== undefined && d.contactNumber !== undefined),
    { message: "Both countryCode and contactNumber are required together" },
  );

/**
 * Password reset
 **/
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});
