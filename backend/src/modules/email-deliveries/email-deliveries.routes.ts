import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./email-deliveries.controller.js";

const router = Router();
const superAdminOnly = [authenticate, authorize([UserRole.SUPER_ADMIN])] as const;
router.get("/email-deliveries", ...superAdminOnly, controller.list);
router.post("/email-deliveries/:id/retry", ...superAdminOnly, controller.retry);

export default router;
