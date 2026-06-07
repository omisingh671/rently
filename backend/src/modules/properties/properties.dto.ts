import type { PropertyStatus } from "@/generated/prisma/enums.js";

export interface PropertyDTO {
  id: string;
  tenantId: string;
  tenantName: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  supportEmail: string | null;
  supportPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: PropertyStatus;
  amenityIds?: string[];
  isActive: boolean;
  createdAt: Date;
}
