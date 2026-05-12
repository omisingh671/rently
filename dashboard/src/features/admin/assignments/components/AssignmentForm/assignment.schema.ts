import { z } from "zod";

export const assignmentFormSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  userId: z.string().min(1, "User is required"),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
