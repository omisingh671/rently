import { HttpError } from "@/common/errors/http-error.js";
import { storageProvider } from "@/common/services/storage.js";
import * as repo from "./dashboard.repository.js";
import {
  getActor,
  getPropertyScope,
  assertCanManageInventory,
  ensurePropertyExists,
} from "./dashboard.service.js";
import type { CreateGalleryInput } from "./gallery.schema.js";
import type { DashboardGalleryDTO } from "./dashboard.dto.js";
import { mapGallery } from "./dashboard.mapper.js";

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export const createGallery = async (
  userId: string,
  input: CreateGalleryInput,
  file: Express.Multer.File,
): Promise<DashboardGalleryDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, input.propertyId);
  const property = await ensurePropertyExists(input.propertyId);
  let resolvedUnitId = input.unitId ?? null;
  const resolvedRoomId = input.roomId ?? null;

  if (resolvedRoomId) {
    const room = await repo.findRoomById(resolvedRoomId);
    if (!room) {
      throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
    }

    if (resolvedUnitId && room.unitId !== resolvedUnitId) {
      throw new HttpError(400, "INVALID_ROOM_UNIT", "Room does not belong to the selected unit");
    }

    if (room.unit.propertyId !== input.propertyId) {
      throw new HttpError(400, "INVALID_ROOM_PROPERTY", "Room does not belong to the selected property");
    }

    resolvedUnitId = room.unitId;
  } else if (resolvedUnitId) {
    const unit = await repo.findUnitById(resolvedUnitId);
    if (!unit || unit.propertyId !== input.propertyId) {
      throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found or does not belong to this property");
    }
  }

  const url = await storageProvider.uploadFile(file, slugify(property.name));
  let gallery: repo.DashboardGalleryRecord;
  try {
    gallery = await repo.createGallery({
      propertyId: input.propertyId,
      unitId: resolvedUnitId,
      roomId: resolvedRoomId,
      url,
    });
  } catch (error) {
    await storageProvider.deleteFile(url);
    throw error;
  }

  return mapGallery(gallery);
};

export const deleteGallery = async (
  userId: string,
  id: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const gallery = await repo.findGalleryById(id);
  if (!gallery) {
    throw new HttpError(404, "GALLERY_NOT_FOUND", "Gallery record not found");
  }

  await assertCanManageInventory(actor, gallery.propertyId);

  // Delete from storage first
  await storageProvider.deleteFile(gallery.url);

  // Delete from DB
  await repo.deleteGalleryById(id);
};

export const listGalleries = async (
  userId: string,
  filters: {
    propertyId?: string;
    unitId?: string;
    roomId?: string;
  },
): Promise<DashboardGalleryDTO[]> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);

  let finalPropertyId: string | string[] | undefined = filters.propertyId;

  if (!scope.isGlobal) {
    if (filters.propertyId) {
      if (!scope.propertyIds.includes(filters.propertyId)) {
        throw new HttpError(403, "FORBIDDEN", "Access denied to this property");
      }
    } else {
      finalPropertyId = scope.propertyIds;
    }
  }

  const galleries = await repo.listGalleries({
    ...(finalPropertyId !== undefined && { propertyId: finalPropertyId }),
    ...(filters.unitId !== undefined && { unitId: filters.unitId }),
    ...(filters.roomId !== undefined && { roomId: filters.roomId }),
  });

  return galleries.map(mapGallery);
};
