import type { MaintenanceBlockRecord } from "./maintenance.repository.js";
import type { MaintenanceBlockResponseDto } from "./maintenance.dto.js";

export const toMaintenanceBlockResponseDto = (
  block: MaintenanceBlockRecord,
): MaintenanceBlockResponseDto => ({
  id: block.id,
  propertyId: block.propertyId,
  propertyName: block.property.name,
  targetType: block.targetType,
  unitId: block.unitId ?? block.room?.unitId ?? null,
  unitNumber: block.unit?.unitNumber ?? block.room?.unit.unitNumber ?? null,
  roomId: block.roomId ?? null,
  roomLabel: block.room
    ? `${block.room.number} (${block.room.name})`
    : null,
  reason: block.reason ?? null,
  status: block.status,
  priority: block.priority,
  assignedToUserId: block.assignedToUserId ?? null,
  assignedToName: block.assignedTo?.fullName ?? null,
  resolutionNote: block.resolutionNote ?? null,
  resolvedAt: block.resolvedAt ?? null,
  emergencyOverride: block.emergencyOverride,
  startDate: block.startDate,
  endDate: block.endDate,
  createdByUserId: block.createdByUserId,
  createdByName: block.createdBy.fullName,
  createdAt: block.createdAt,
  updatedAt: block.updatedAt,
});
