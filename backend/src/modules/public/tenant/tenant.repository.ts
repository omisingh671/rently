import { prisma } from "@/db/prisma.js";
import { PropertyStatus } from "@/generated/prisma/client.js";

export const findActiveTenantBySlug = (slug: string) =>
  prisma.tenant.findFirst({
    where: {
      slug,
      status: "ACTIVE",
    },
  });

export const findActiveTenantById = (id: string) =>
  prisma.tenant.findFirst({
    where: {
      id,
      status: "ACTIVE",
    },
  });

export const findActiveTenantByDomain = (domain: string) =>
  prisma.tenant.findFirst({
    where: {
      primaryDomain: domain,
      status: "ACTIVE",
    },
  });

export const findDefaultTenant = () =>
  prisma.tenant.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });

export const listActivePublicProperties = (
  tenantId: string,
  city?: string,
) =>
  prisma.property.findMany({
    where: {
      tenantId,
      ...(city !== undefined && { city }),
      isActive: true,
      status: PropertyStatus.ACTIVE,
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

export const findActivePropertyById = (id: string, tenantId?: string) =>
  prisma.property.findFirst({
    where: {
      id,
      ...(tenantId !== undefined && { tenantId }),
      isActive: true,
      status: PropertyStatus.ACTIVE,
    },
  });

export const findActivePropertyBySlug = (tenantId: string, slug: string) =>
  prisma.property.findFirst({
    where: {
      tenantId,
      slug,
      isActive: true,
      status: PropertyStatus.ACTIVE,
    },
  });

export const findDefaultProperty = (tenantId?: string) =>
  prisma.property.findFirst({
    where: {
      ...(tenantId !== undefined && { tenantId }),
      isActive: true,
      status: PropertyStatus.ACTIVE,
    },
    orderBy: { createdAt: "asc" },
  });

