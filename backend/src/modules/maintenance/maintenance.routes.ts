import { Router } from "express";
import * as controller from "./maintenance.controller.js";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

const router = Router();

// Apply global auth middlewares
router.use(
  authenticate,
  requirePasswordChangeComplete,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
);

router.get(
  "/properties/:propertyId/maintenance-blocks",
  controller.listMaintenanceBlocks,
);
router.post(
  "/properties/:propertyId/maintenance-blocks",
  controller.createMaintenanceBlock,
);
router.get("/maintenance-blocks/:id", controller.getMaintenanceBlockById);
router.patch("/maintenance-blocks/:id", controller.updateMaintenanceBlock);
router.delete("/maintenance-blocks/:id", controller.deleteMaintenanceBlock);

export default router;
