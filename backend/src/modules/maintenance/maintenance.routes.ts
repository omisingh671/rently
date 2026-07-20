import { Router } from "express";
import * as controller from "./maintenance.controller.js";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

const router = Router();

router.use(authenticate, requirePasswordChangeComplete);

const authorizeMaintenance = authorize([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
]);

router.get(
  "/properties/:propertyId/maintenance-blocks",
  authorizeMaintenance,
  controller.listMaintenanceBlocks,
);
router.post(
  "/properties/:propertyId/maintenance-blocks",
  authorizeMaintenance,
  controller.createMaintenanceBlock,
);
router.get(
  "/maintenance-blocks/:id",
  authorizeMaintenance,
  controller.getMaintenanceBlockById,
);
router.patch(
  "/maintenance-blocks/:id",
  authorizeMaintenance,
  controller.updateMaintenanceBlock,
);
router.delete(
  "/maintenance-blocks/:id",
  authorizeMaintenance,
  controller.deleteMaintenanceBlock,
);

export default router;
