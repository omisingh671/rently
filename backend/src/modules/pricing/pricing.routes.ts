import { Router } from "express";
import * as controller from "./pricing.controller.js";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

const router = Router();

router.use(
  authenticate,
  requirePasswordChangeComplete,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
);

router.get("/properties/:propertyId/pricing", controller.listRoomPricing);
router.post("/properties/:propertyId/pricing", controller.createRoomPricing);
router.patch("/pricing/:id", controller.updateRoomPricing);
router.delete("/pricing/:id", controller.deleteRoomPricing);

export default router;
