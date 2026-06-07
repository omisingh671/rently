import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");
const optionalIdSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  idSchema.nullable().optional(),
);

export const createGallerySchema = z.object({
  propertyId: idSchema,
  unitId: optionalIdSchema,
  roomId: optionalIdSchema,
});

export type CreateGalleryInput = z.infer<typeof createGallerySchema>;
