import { z } from "zod";

const baseUserFormSchema = z.object({
    fullName: z.string().trim().min(2, "Full name is required"),
    email: z.string().trim().email("Valid email is required"),
    countryCode: z
      .literal("+91", "Country code is fixed to +91 for now"),
    contactNumber: z.union([
      z.string().trim().regex(/^\d{6,15}$/, "Use 6 to 15 digits"),
      z.literal(""),
    ]),
  });

export const createUserFormSchema = baseUserFormSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const editUserFormSchema = baseUserFormSchema.extend({
  password: z.string(),
});

export type UserFormValues = {
  fullName: string;
  email: string;
  password: string;
  countryCode: "+91";
  contactNumber: string;
};
