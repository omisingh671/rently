import { Router } from "express";
import * as controller from "./booking-policy.controller.js";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

const router = Router();

router.use(
  authenticate,
  requirePasswordChangeComplete,
);

router.get(
  "/properties/:propertyId/booking-policy",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
  controller.getBookingPolicy,
);

router.get(
  "/properties/:propertyId/booking-policy/audits",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
  controller.listBookingPolicyAudits,
);

router.put(
  "/properties/:propertyId/booking-policy",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  controller.updateBookingPolicy,
);

export default router;
