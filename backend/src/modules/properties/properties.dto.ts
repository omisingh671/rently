import type { PropertyStatus } from "@/generated/prisma/enums.js";

export interface PropertyDTO {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: PropertyStatus;
  amenityIds?: string[];
  isActive: boolean;
  createdAt: Date;
}
