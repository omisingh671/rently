import type { PropertyClosureResponseDto } from "./property-closures.dto.js";
import type { PropertyClosureRecord } from "./property-closures.repository.js";

export const toPropertyClosureResponseDto = (
  closure: PropertyClosureRecord,
): PropertyClosureResponseDto => ({
  id: closure.id,
  propertyId: closure.propertyId,
  propertyName: closure.property.name,
  type: closure.type,
  status: closure.status,
  reason: closure.reason,
  startDate: closure.startDate,
  endDate: closure.endDate,
  createdByUserId: closure.createdByUserId,
  createdByName: closure.createdBy.fullName,
  cancelledByUserId: closure.cancelledByUserId ?? null,
  cancelledByName: closure.cancelledBy?.fullName ?? null,
  cancelledAt: closure.cancelledAt ?? null,
  cancellationReason: closure.cancellationReason ?? null,
  createdAt: closure.createdAt,
  updatedAt: closure.updatedAt,
});
