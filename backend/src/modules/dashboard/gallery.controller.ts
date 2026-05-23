import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./gallery.service.js";
import { createGallerySchema } from "./gallery.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const createGallery = async (req: AuthRequest, res: Response) => {
  const body = createGallerySchema.parse(req.body);
  if (!req.file) {
    throw new HttpError(400, "FILE_REQUIRED", "No image file provided");
  }

  const data = await service.createGallery(getUserId(req), body, req.file);
  res.status(201).json({ success: true, data });
};

export const listGalleries = async (req: AuthRequest, res: Response) => {
  const { propertyId, unitId, roomId } = req.query;

  const data = await service.listGalleries(getUserId(req), {
    ...(typeof propertyId === "string" && { propertyId }),
    ...(typeof unitId === "string" && { unitId }),
    ...(typeof roomId === "string" && { roomId }),
  });

  res.json({ success: true, data });
};

export const deleteGallery = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!id) {
    throw new HttpError(400, "GALLERY_ID_REQUIRED", "Gallery item ID is required");
  }

  await service.deleteGallery(getUserId(req), id);
  res.json({ success: true, message: "Gallery image deleted successfully" });
};
