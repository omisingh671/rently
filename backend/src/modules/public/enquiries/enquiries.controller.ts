import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { resolveTenantInput } from "@/modules/public/tenant/tenant.controller.js";
import { resolveTenant } from "@/modules/public/tenant/tenant.service.js";
import * as service from "./enquiries.service.js";
import { createEnquirySchema } from "./enquiries.schema.js";

export const createEnquiry = async (req: AuthRequest, res: Response) => {
  const body = createEnquirySchema.parse(req.body);
  const tenantInput = resolveTenantInput(req);
  const tenant = await resolveTenant(tenantInput);
  const data = await service.createEnquiry({
    tenantId: tenant.id,
    ...(tenantInput.propertySlug !== undefined && {
      propertySlug: tenantInput.propertySlug,
    }),
    ...(body.propertyId !== undefined && { propertyId: body.propertyId }),
    name: body.name,
    email: body.email,
    contactNumber: body.contactNumber,
    message: body.message,
    ...(body.source !== undefined && { source: body.source }),
  });

  res.status(201).json({ success: true, data });
};
