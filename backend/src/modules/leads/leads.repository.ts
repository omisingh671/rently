import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { DashboardLeadListInput } from "./leads.inputs.js";

const dashboardEnquiryInclude = {
  property: true,
} satisfies Prisma.EnquiryInclude;

const dashboardQuoteInclude = {
  property: true,
  user: true,
  product: true,
} satisfies Prisma.QuoteRequestInclude;

export type DashboardEnquiryRecord = Prisma.EnquiryGetPayload<{
  include: typeof dashboardEnquiryInclude;
}>;
export type DashboardQuoteRecord = Prisma.QuoteRequestGetPayload<{
  include: typeof dashboardQuoteInclude;
}>;

const buildEnquiryWhere = (
  filters: Omit<DashboardLeadListInput, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.source !== undefined && { source: filters.source }),
    ...(filters.search !== undefined && {
      OR: [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { contactNumber: { contains: filters.search } },
        { message: { contains: filters.search } },
      ],
    }),
  }) satisfies Prisma.EnquiryWhereInput;

const buildQuoteWhere = (
  filters: Omit<DashboardLeadListInput, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.search !== undefined && {
      OR: [
        { notes: { contains: filters.search } },
        {
          user: {
            is: {
              OR: [
                { fullName: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            },
          },
        },
        {
          product: {
            is: {
              name: { contains: filters.search },
            },
          },
        },
      ],
    }),
  }) satisfies Prisma.QuoteRequestWhereInput;

export const listEnquiriesPaginated = async (filters: DashboardLeadListInput) => {
  const where = buildEnquiryWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.enquiry.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardEnquiryInclude,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return { items, total };
};

export const findEnquiryById = (id: string) =>
  prisma.enquiry.findUnique({
    where: { id },
    include: dashboardEnquiryInclude,
  });

export const updateEnquiryById = (
  id: string,
  data: Prisma.EnquiryUpdateInput,
) =>
  prisma.enquiry.update({
    where: { id },
    data,
    include: dashboardEnquiryInclude,
  });

export const listQuotesPaginated = async (filters: DashboardLeadListInput) => {
  const where = buildQuoteWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.quoteRequest.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardQuoteInclude,
    }),
    prisma.quoteRequest.count({ where }),
  ]);

  return { items, total };
};

export const findQuoteById = (id: string) =>
  prisma.quoteRequest.findUnique({
    where: { id },
    include: dashboardQuoteInclude,
  });

export const updateQuoteById = (
  id: string,
  data: Prisma.QuoteRequestUpdateInput,
) =>
  prisma.quoteRequest.update({
    where: { id },
    data,
    include: dashboardQuoteInclude,
  });
