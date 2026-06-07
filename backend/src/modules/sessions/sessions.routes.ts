import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./sessions.controller.js";

const router = Router();

router.use(authenticate, authorize([UserRole.SUPER_ADMIN]));

router.get("/", controller.listSessions);
router.delete("/expired", controller.revokeExpiredSessions);
router.delete("/:id", controller.revokeSession);

export default router;
