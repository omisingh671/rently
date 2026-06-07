import { prisma } from "@/db/prisma.js";
import {
  Prisma,
  TaxCalculationMode,
  TaxCategory,
  TaxScope,
  TaxTargetType,
} from "@/generated/prisma/client.js";
import type { DashboardTaxListInput } from "./taxes.inputs.js";

export const dashboardTaxInclude = {
  property: true,
} satisfies Prisma.TaxInclude;

const buildTaxWhere = (filters: Omit<DashboardTaxListInput, "page" | "limit">) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      name: { contains: filters.search },
    }),
    ...(filters.taxType !== undefined && { taxType: filters.taxType }),
    ...(filters.category !== undefined && { category: filters.category }),
    ...(filters.scope !== undefined && { scope: filters.scope }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.TaxWhereInput;

export const listTaxesPaginated = async (filters: DashboardTaxListInput) => {
  const where = buildTaxWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.tax.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardTaxInclude,
    }),
    prisma.tax.count({ where }),
  ]);

  return { items, total };
};

export const findTaxById = (id: string) =>
  prisma.tax.findUnique({
    where: { id },
    include: dashboardTaxInclude,
  });

export const listActiveTaxesForConflictCheck = (filters: {
  propertyId: string;
  category?: TaxCategory;
  scope?: TaxScope;
  targetType?: TaxTargetType;
  calculationMode?: TaxCalculationMode;
  excludeTaxId?: string;
}) =>
  prisma.tax.findMany({
    where: {
      propertyId: filters.propertyId,
      isActive: true,
      ...(filters.category !== undefined && { category: filters.category }),
      ...(filters.scope !== undefined && { scope: filters.scope }),
      ...(filters.targetType !== undefined && {
        targetType: filters.targetType,
      }),
      ...(filters.calculationMode !== undefined && {
        calculationMode: filters.calculationMode,
      }),
      ...(filters.excludeTaxId !== undefined && {
        id: { not: filters.excludeTaxId },
      }),
    },
    include: dashboardTaxInclude,
  });

export const createTax = (data: Prisma.TaxCreateInput) =>
  prisma.tax.create({
    data,
    include: dashboardTaxInclude,
  });

export const updateTaxById = (id: string, data: Prisma.TaxUpdateInput) =>
  prisma.tax.update({
    where: { id },
    data,
    include: dashboardTaxInclude,
  });
