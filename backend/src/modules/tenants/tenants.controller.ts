import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./tenants.service.js";
import {
  createTenantSchema,
  updateTenantSchema,
  listTenantsQuerySchema,
  idParamsSchema,
} from "./tenants.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return userId;
};

export const listTenants = async (req: AuthRequest, res: Response) => {
  const query = listTenantsQuerySchema.parse(req.query);
  const data = await service.listTenants(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
  });
  res.json({ success: true, data });
};

export const listActiveTenants = async (req: AuthRequest, res: Response) => {
  const data = await service.listActiveTenants(getUserId(req));
  res.json({ success: true, data });
};

export const getTenantById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getTenantById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createTenant = async (req: AuthRequest, res: Response) => {
  const body = createTenantSchema.parse(req.body);
  const data = await service.createTenant(getUserId(req), {
    name: body.name,
    ...(body.slug !== undefined && { slug: body.slug }),
    ...(body.primaryDomain !== undefined &&
      body.primaryDomain !== null && { primaryDomain: body.primaryDomain }),
    ...(body.status !== undefined && { status: body.status }),
    brandName: body.brandName,
    ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
    ...(body.secondaryColor !== undefined && {
      secondaryColor: body.secondaryColor,
    }),
    ...(body.supportEmail !== undefined &&
      body.supportEmail !== null && { supportEmail: body.supportEmail }),
    ...(body.supportPhone !== undefined &&
      body.supportPhone !== null && { supportPhone: body.supportPhone }),
    ...(body.defaultCurrency !== undefined && {
      defaultCurrency: body.defaultCurrency,
    }),
    ...(body.timezone !== undefined && { timezone: body.timezone }),
  });
  res.status(201).json({ success: true, data });
};

export const updateTenant = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateTenantSchema.parse(req.body);
  const data = await service.updateTenant(getUserId(req), params.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.slug !== undefined && { slug: body.slug }),
    ...(body.primaryDomain !== undefined && {
      primaryDomain: body.primaryDomain,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.brandName !== undefined && { brandName: body.brandName }),
    ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
    ...(body.secondaryColor !== undefined && {
      secondaryColor: body.secondaryColor,
    }),
    ...(body.supportEmail !== undefined && { supportEmail: body.supportEmail }),
    ...(body.supportPhone !== undefined && { supportPhone: body.supportPhone }),
    ...(body.defaultCurrency !== undefined && {
      defaultCurrency: body.defaultCurrency,
    }),
    ...(body.timezone !== undefined && { timezone: body.timezone }),
  });
  res.json({ success: true, data });
};

export const uploadTenantLogo = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  if (!req.file) {
    throw new HttpError(400, "LOGO_FILE_REQUIRED", "A tenant logo file is required");
  }

  const data = await service.uploadTenantLogo(
    getUserId(req),
    params.id,
    req.file,
  );
  res.json({ success: true, data });
};

export const removeTenantLogo = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.removeTenantLogo(getUserId(req), params.id);
  res.json({ success: true, data });
};
