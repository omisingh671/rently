import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./reporting.controller.js";

const router = Router();
const reportingRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.ACCOUNTANT,
];

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK, UserRole.ACCOUNTANT]),
);

router.get("/context", controller.getContext);

router.use(requirePasswordChangeComplete);

router.get("/summary", controller.getSummary);
router.get("/analytics", authorize(reportingRoles), controller.getAnalytics);
router.get(
  "/properties/:propertyId/daily-closes",
  authorize(reportingRoles),
  controller.listDailyCloses,
);
router.post(
  "/properties/:propertyId/daily-closes",
  authorize(reportingRoles),
  controller.createDailyClose,
);

export default router;
