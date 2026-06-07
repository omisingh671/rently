import { prisma } from "@/db/prisma.js";
import type { Prisma } from "@/generated/prisma/client.js";

export const findBookingPolicyByPropertyId = (propertyId: string) =>
  prisma.propertyBookingPolicy.findUnique({
    where: { propertyId },
  });

export const upsertBookingPolicyByPropertyId = (
  propertyId: string,
  data: Omit<
    Prisma.PropertyBookingPolicyCreateWithoutPropertyInput,
    "id" | "createdAt" | "updatedAt"
  >,
) =>
  prisma.propertyBookingPolicy.upsert({
    where: { propertyId },
    create: {
      property: { connect: { id: propertyId } },
      ...data,
    },
    update: data,
  });

export const upsertDefaultBookingPolicyByPropertyId = (
  propertyId: string,
  data: Omit<
    Prisma.PropertyBookingPolicyCreateWithoutPropertyInput,
    "id" | "createdAt" | "updatedAt"
  >,
) =>
  prisma.propertyBookingPolicy.upsert({
    where: { propertyId },
    create: {
      property: { connect: { id: propertyId } },
      ...data,
    },
    update: {},
  });
