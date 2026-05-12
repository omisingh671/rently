import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),

    email: z.string().email("Enter a valid email address"),

    password: z.string().min(8, "Password must be at least 8 characters"),

    confirmPassword: z.string(),

    // Optional fields
    countryCode: z.string().optional(),
    contactNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^[0-9]{6,15}$/.test(val),
        "Enter a valid contact number",
      ),
  })
  .superRefine((data, ctx) => {
    const hasContactNumber =
      !!data.contactNumber && data.contactNumber.trim() !== "";

    if (hasContactNumber && !data.countryCode) {
      ctx.addIssue({
        path: ["countryCode"],
        message: "Country code is required when contact number is provided",
        code: z.ZodIssueCode.custom,
      });
    }

    if (!hasContactNumber) {
      // Normalize: remove countryCode when contact number is absent
      data.countryCode = undefined;
      data.contactNumber = undefined;
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        message: "Passwords do not match",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
