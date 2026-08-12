import { getCorrelationId } from "@/common/observability/request-context.js";
import { prisma } from "@/db/prisma.js";
import type {
  Prisma,
  PropertyAuditAction,
  PropertyAuditEntityType,
} from "@/generated/prisma/client.js";

type DatabaseClient = typeof prisma | Prisma.TransactionClient;

const auditJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export const recordPropertyAudit = (
  input: {
    propertyId: string;
    actorUserId?: string;
    entityType: PropertyAuditEntityType;
    entityId: string;
    action: PropertyAuditAction;
    reason?: string;
    previousData?: unknown;
    nextData?: unknown;
    metadata?: unknown;
  },
  tx?: Prisma.TransactionClient,
) => {
  const db: DatabaseClient = tx ?? prisma;
  return db.propertyAuditEvent.create({
    data: {
      propertyId: input.propertyId,
      ...(input.actorUserId !== undefined && {
        actorUserId: input.actorUserId,
      }),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      ...(input.reason !== undefined && { reason: input.reason }),
      ...(input.previousData !== undefined && {
        previousData: auditJson(input.previousData),
      }),
      ...(input.nextData !== undefined && {
        nextData: auditJson(input.nextData),
      }),
      ...(input.metadata !== undefined && {
        metadata: auditJson(input.metadata),
      }),
      correlationId: getCorrelationId(),
    },
  });
};

export const listPropertyAudits = (
  propertyId: string,
  options: {
    entityType?: PropertyAuditEntityType;
    entityId?: string;
    take?: number;
  } = {},
) =>
  prisma.propertyAuditEvent.findMany({
    where: {
      propertyId,
      ...(options.entityType !== undefined && {
        entityType: options.entityType,
      }),
      ...(options.entityId !== undefined && { entityId: options.entityId }),
    },
    include: {
      actor: { select: { id: true, fullName: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options.take ?? 100,
  });
