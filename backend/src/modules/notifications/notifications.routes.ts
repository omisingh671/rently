import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./notifications.controller.js";

const router = Router();
const superAdminOnly = [
  authenticate,
  requirePasswordChangeComplete,
  authorize([UserRole.SUPER_ADMIN]),
] as const;
router.get("/notification-settings", ...superAdminOnly, controller.getSettings);
router.patch("/notification-settings/global", ...superAdminOnly, controller.updateGlobalSetting);
router.patch("/properties/:propertyId/notification-overrides", ...superAdminOnly, controller.updatePropertyOverride);
router.get("/notification-setting-audits", ...superAdminOnly, controller.getAudits);
router.get("/notification-deliveries", ...superAdminOnly, controller.getDeliveries);
router.post("/notification-deliveries/:id/retry", ...superAdminOnly, controller.retryDelivery);

export default router;
