import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./notifications.controller.js";

const router = Router();
router.use(authenticate, requirePasswordChangeComplete, authorize([UserRole.SUPER_ADMIN]));
router.get("/notification-settings", controller.getSettings);
router.patch("/notification-settings/global", controller.updateGlobalSetting);
router.patch("/properties/:propertyId/notification-overrides", controller.updatePropertyOverride);
router.get("/notification-setting-audits", controller.getAudits);
router.get("/notification-deliveries", controller.getDeliveries);
router.post("/notification-deliveries/:id/retry", controller.retryDelivery);

export default router;
