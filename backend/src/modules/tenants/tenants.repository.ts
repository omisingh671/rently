import { prisma } from "@/db/prisma.js";
import { Prisma, type TenantStatus } from "@/generated/prisma/client.js";

interface TenantListFilters {
  page: number;
  limit: number;
  search?: string;
  status?: TenantStatus;
}

const buildTenantWhere = (filters: Omit<TenantListFilters, "page" | "limit">) =>
  ({
    ...(filters.search !== undefined && {
      OR: [
        { name: { contains: filters.search } },
        { slug: { contains: filters.search } },
        { brandName: { contains: filters.search } },
        { primaryDomain: { contains: filters.search } },
      ],
    }),
    ...(filters.status !== undefined && { status: filters.status }),
  }) satisfies Prisma.TenantWhereInput;

export const listTenantsPaginated = async (filters: TenantListFilters) => {
  const where = buildTenantWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.tenant.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.count({ where }),
  ]);

  return { items, total };
};

export const listActiveTenantOptions = () =>
  prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

export const findTenantById = (id: string) =>
  prisma.tenant.findUnique({
    where: { id },
  });

export const findTenantBySlug = (slug: string) =>
  prisma.tenant.findUnique({
    where: { slug },
  });

export const createTenant = (data: Prisma.TenantCreateInput) =>
  prisma.tenant.create({
    data,
  });

export const updateTenantById = (id: string, data: Prisma.TenantUpdateInput) =>
  prisma.tenant.update({
    where: { id },
    data,
  });
