import type {
  PropertyClosureStatus,
  PropertyClosureType,
} from "@/generated/prisma/enums.js";

export interface PropertyClosureResponseDto {
  id: string;
  propertyId: string;
  propertyName: string;
  type: PropertyClosureType;
  status: PropertyClosureStatus;
  reason: string;
  startDate: Date;
  endDate: Date;
  createdByUserId: string;
  createdByName: string;
  cancelledByUserId: string | null;
  cancelledByName: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
