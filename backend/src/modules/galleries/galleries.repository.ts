import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";

const galleryInclude = {
  property: { select: { name: true } },
  unit: { select: { unitNumber: true } },
  room: { select: { name: true, number: true } },
} satisfies Prisma.GalleryInclude;

export type GalleryRecord = Prisma.GalleryGetPayload<{
  include: typeof galleryInclude;
}>;

export const createGallery = (data: Prisma.GalleryUncheckedCreateInput) =>
  prisma.gallery.create({
    data,
    include: galleryInclude,
  });

export const findGalleryById = (id: string) =>
  prisma.gallery.findUnique({
    where: { id },
    include: galleryInclude,
  });

export const deleteGalleryById = (id: string) =>
  prisma.gallery.delete({
    where: { id },
  });

export const listGalleries = (filters: {
  propertyId?: string | string[];
  unitId?: string;
  roomId?: string;
}) => {
  const where: Prisma.GalleryWhereInput = {};

  if (filters.propertyId !== undefined) {
    if (Array.isArray(filters.propertyId)) {
      where.propertyId = { in: filters.propertyId };
    } else {
      where.propertyId = filters.propertyId;
    }
  }

  if (filters.unitId !== undefined) {
    where.unitId = filters.unitId;
  }

  if (filters.roomId !== undefined) {
    where.roomId = filters.roomId;
  }

  return prisma.gallery.findMany({
    where,
    include: galleryInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const findRoomById = (id: string) =>
  prisma.room.findUnique({
    where: { id },
    include: {
      unit: {
        include: {
          property: true,
        },
      },
      amenities: true,
    },
  });

export const findUnitById = (id: string) =>
  prisma.unit.findUnique({
    where: { id },
    include: {
      property: true,
      amenities: true,
    },
  });
