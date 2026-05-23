import { z } from "zod";

const passwordSchema = z.string().superRefine((value, ctx) => {
  const messages = [
    value.length < 10 ? "Password must be at least 10 characters" : null,
    value.length > 128 ? "Password must be at most 128 characters" : null,
    /[a-z]/.test(value) ? null : "Password must contain a lowercase letter",
    /[A-Z]/.test(value) ? null : "Password must contain an uppercase letter",
    /\d/.test(value) ? null : "Password must contain a number",
    /[^A-Za-z0-9]/.test(value) ? null : "Password must contain a symbol",
  ].filter((message): message is string => message !== null);

  if (messages.length === 0) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: messages.join(". "),
  });
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),

    email: z.string().email("Enter a valid email address"),

    password: passwordSchema,

    confirmPassword: z.string().min(1, "Confirm password is required"),

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
