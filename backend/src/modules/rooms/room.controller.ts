import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./room.service.js";
import {
  idParamsSchema,
  propertyIdParamsSchema,
  listRoomsQuerySchema,
  createRoomSchema,
  updateRoomSchema,
} from "./room.validation.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

// Rooms Controllers
export const listRooms = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listRoomsQuerySchema.parse(req.query);
  const data = await service.listRooms(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const getRoomById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getRoomById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createRoom = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createRoomSchema.parse(req.body);
  const data = await service.createRoom(getUserId(req), params.propertyId, {
    unitId: body.unitId,
    name: body.name,
    number: body.number,
    ...(body.hasAC !== undefined && { hasAC: body.hasAC }),
    ...(body.maxOccupancy !== undefined && {
      maxOccupancy: body.maxOccupancy,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.amenityIds !== undefined && { amenityIds: body.amenityIds }),
  });
  res.status(201).json({ success: true, data });
};

export const updateRoom = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateRoomSchema.parse(req.body);
  const data = await service.updateRoom(getUserId(req), params.id, {
    ...(body.unitId !== undefined && { unitId: body.unitId }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.number !== undefined && { number: body.number }),
    ...(body.hasAC !== undefined && { hasAC: body.hasAC }),
    ...(body.maxOccupancy !== undefined && {
      maxOccupancy: body.maxOccupancy,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.amenityIds !== undefined && { amenityIds: body.amenityIds }),
  });
  res.json({ success: true, data });
};

export const deleteRoom = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  await service.deleteRoom(getUserId(req), params.id);
  res.status(204).send();
};


