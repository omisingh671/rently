import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./tenants.controller.js";

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN]),
  requirePasswordChangeComplete,
);

router.get("/options", controller.listActiveTenants);
router.get("/", controller.listTenants);
router.post("/", controller.createTenant);
router.get("/:id", controller.getTenantById);
router.patch("/:id", controller.updateTenant);

export default router;
