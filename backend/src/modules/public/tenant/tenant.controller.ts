import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./tenant.service.js";

export const resolveTenantInput = (req: AuthRequest) => {
  const querySlug =
    typeof req.query.tenantSlug === "string" ? req.query.tenantSlug : undefined;
  const queryPropertySlug =
    typeof req.query.propertySlug === "string"
      ? req.query.propertySlug
      : undefined;
  const queryCity =
    typeof req.query.city === "string" && req.query.city.trim()
      ? req.query.city.trim()
      : undefined;
  const headerSlug =
    typeof req.headers["x-tenant-slug"] === "string"
      ? req.headers["x-tenant-slug"]
      : undefined;
  const headerPropertySlug =
    typeof req.headers["x-property-slug"] === "string"
      ? req.headers["x-property-slug"]
      : undefined;

  const tenantSlug = querySlug ?? headerSlug;
  const propertySlug = queryPropertySlug ?? headerPropertySlug;
  return {
    ...(tenantSlug !== undefined ? { tenantSlug } : {}),
    ...(propertySlug !== undefined ? { propertySlug } : {}),
    ...(queryCity !== undefined ? { city: queryCity } : {}),
  };
};

export const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return userId;
};

export const getTenantConfig = async (req: AuthRequest, res: Response) => {
  const data = await service.getTenantConfig(resolveTenantInput(req));
  res.json({ success: true, data });
};
