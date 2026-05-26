import { z } from "zod";

const passwordSchema = z.string().superRefine((value, ctx) => {
  const messages = [
    value.length < 8 ? "Password must be at least 8 characters" : null,
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

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        message: "Passwords do not match",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
