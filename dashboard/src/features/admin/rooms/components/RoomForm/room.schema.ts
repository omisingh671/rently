import { z } from "zod";

export const roomSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().min(1, "Unit is required"),
  name: z.string().trim().min(1, "Room name is required").max(120),
  number: z.string().trim().min(1, "Room number is required").max(50),
  rent: z.number().positive("Rent must be greater than zero"),
  hasAC: z.boolean(),
  maxOccupancy: z.number().int().min(1).max(10),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]),
  isActive: z.boolean(),
  amenityIds: z.array(z.string()).optional(),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
