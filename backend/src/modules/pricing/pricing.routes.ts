import { Router } from "express";
import * as controller from "./pricing.controller.js";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

const router = Router();

router.use(authenticate, requirePasswordChangeComplete);

const authorizePricing = authorize([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
]);

router.get(
  "/properties/:propertyId/pricing",
  authorizePricing,
  controller.listRoomPricing,
);
router.post(
  "/properties/:propertyId/pricing",
  authorizePricing,
  controller.createRoomPricing,
);
router.patch("/pricing/:id", authorizePricing, controller.updateRoomPricing);
router.delete("/pricing/:id", authorizePricing, controller.deleteRoomPricing);

export default router;
