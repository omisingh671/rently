import { z } from "zod";
import { optionalStringFromForm } from "@/common/validation/strings.js";

export const createAmenitySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),

  // Optional icon from HTML form
  icon: optionalStringFromForm(50),
});

export const updateAmenitySchema = z.object({
  name: z.string().min(2).optional(),

  // Optional icon update
  icon: optionalStringFromForm(50),

  isActive: z.boolean().optional(),
});
