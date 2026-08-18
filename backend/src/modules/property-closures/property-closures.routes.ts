import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./property-closures.controller.js";

const router = Router();
router.use(authenticate, requirePasswordChangeComplete);

const propertyClosureRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

router.get(
  "/properties/:propertyId/property-closures",
  authorize(propertyClosureRoles),
  controller.listPropertyClosures,
);
router.post(
  "/properties/:propertyId/property-closures",
  authorize(propertyClosureRoles),
  controller.createPropertyClosure,
);
router.patch(
  "/property-closures/:id/cancel",
  authorize(propertyClosureRoles),
  controller.cancelPropertyClosure,
);

export default router;
