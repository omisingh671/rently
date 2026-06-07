import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./reporting.controller.js";

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
);

router.get("/context", controller.getContext);

router.use(requirePasswordChangeComplete);

router.get("/summary", controller.getSummary);
router.get("/analytics", controller.getAnalytics);

export default router;
