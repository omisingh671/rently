import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { DashboardCouponListInput } from "./coupons.inputs.js";

export const dashboardCouponInclude = {
  property: true,
} satisfies Prisma.CouponInclude;

const buildCouponWhere = (
  filters: Omit<DashboardCouponListInput, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      OR: [
        { code: { contains: filters.search } },
        { name: { contains: filters.search } },
      ],
    }),
    ...(filters.discountType !== undefined && {
      discountType: filters.discountType,
    }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.CouponWhereInput;

export const listCouponsPaginated = async (filters: DashboardCouponListInput) => {
  const where = buildCouponWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.coupon.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardCouponInclude,
    }),
    prisma.coupon.count({ where }),
  ]);

  return { items, total };
};

export const findCouponById = (id: string) =>
  prisma.coupon.findUnique({
    where: { id },
    include: dashboardCouponInclude,
  });

export const createCoupon = (data: Prisma.CouponCreateInput) =>
  prisma.coupon.create({
    data,
    include: dashboardCouponInclude,
  });

export const updateCouponById = (
  id: string,
  data: Prisma.CouponUpdateInput,
) =>
  prisma.coupon.update({
    where: { id },
    data,
    include: dashboardCouponInclude,
  });
