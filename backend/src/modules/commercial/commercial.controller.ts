import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import * as schemas from "./commercial.schema.js";
import * as service from "./commercial.service.js";

const userId = (req: AuthRequest) => req.user!.userId;

export const listCompanies = async (req: AuthRequest, res: Response) => {
  const { propertyId } = schemas.propertyParamsSchema.parse(req.params);
  res.json({ success: true, data: await service.listCompanies(userId(req), propertyId) });
};
export const createCompany = async (req: AuthRequest, res: Response) => {
  const { propertyId } = schemas.propertyParamsSchema.parse(req.params);
  const body = schemas.createCompanySchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.createCompany(userId(req), propertyId, body) });
};
export const updateCompany = async (req: AuthRequest, res: Response) => {
  const { companyId } = schemas.companyParamsSchema.parse(req.params);
  const body = schemas.updateCompanySchema.parse(req.body);
  res.json({ success: true, data: await service.updateCompany(userId(req), companyId, body) });
};
export const listGroups = async (req: AuthRequest, res: Response) => {
  const { propertyId } = schemas.propertyParamsSchema.parse(req.params);
  res.json({ success: true, data: await service.listGroups(userId(req), propertyId) });
};
export const getGroup = async (req: AuthRequest, res: Response) => {
  const { groupId } = schemas.groupParamsSchema.parse(req.params);
  res.json({ success: true, data: await service.getGroup(userId(req), groupId) });
};
export const createGroup = async (req: AuthRequest, res: Response) => {
  const { propertyId } = schemas.propertyParamsSchema.parse(req.params);
  const body = schemas.createGroupSchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.createGroup(userId(req), propertyId, body) });
};
export const updateGroupStatus = async (req: AuthRequest, res: Response) => {
  const { groupId } = schemas.groupParamsSchema.parse(req.params);
  const body = schemas.updateGroupSchema.parse(req.body);
  res.json({ success: true, data: await service.updateGroupStatus(userId(req), groupId, body.status, body.reason) });
};
export const updateGroupDetails = async (req: AuthRequest, res: Response) => {
  const { groupId } = schemas.groupParamsSchema.parse(req.params);
  const body = schemas.updateGroupDetailsSchema.parse(req.body);
  res.json({ success: true, data: await service.updateGroupDetails(userId(req), groupId, body) });
};
export const holdRooms = async (req: AuthRequest, res: Response) => {
  const { groupId } = schemas.groupParamsSchema.parse(req.params);
  const body = schemas.createGroupBlocksSchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.holdGroupRooms(userId(req), groupId, body.roomIds, body.releaseDate, body.reason) });
};
export const releaseRooms = async (req: AuthRequest, res: Response) => {
  const { groupId } = schemas.groupParamsSchema.parse(req.params);
  const body = schemas.releaseGroupBlocksSchema.parse(req.body);
  res.json({ success: true, data: await service.releaseGroupRooms(userId(req), groupId, body.roomIds, body.reason) });
};
export const addMember = async (req: AuthRequest, res: Response) => {
  const { groupId } = schemas.groupParamsSchema.parse(req.params);
  const body = schemas.addGroupMemberSchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.addGroupMember(userId(req), groupId, body.bookingId, body.reason) });
};
export const removeMember = async (req: AuthRequest, res: Response) => {
  const { groupId, bookingId } = schemas.groupMemberParamsSchema.parse(req.params);
  const body = schemas.voidGroupChargeSchema.parse(req.body);
  res.json({ success: true, data: await service.removeGroupMember(userId(req), groupId, bookingId, body.reason) });
};
export const addCharge = async (req: AuthRequest, res: Response) => {
  const { groupId } = schemas.groupParamsSchema.parse(req.params);
  const body = schemas.createGroupChargeSchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.addGroupCharge(userId(req), groupId, body) });
};
export const voidCharge = async (req: AuthRequest, res: Response) => {
  const { groupId, chargeId } = schemas.groupChargeParamsSchema.parse(req.params);
  const body = schemas.voidGroupChargeSchema.parse(req.body);
  res.json({ success: true, data: await service.voidGroupCharge(userId(req), groupId, chargeId, body.reason) });
};
