import { Router } from "express";
import * as controller from "./room-product.controller.js";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

const router = Router();

router.use(authenticate, requirePasswordChangeComplete);

const authorizeRoomProducts = authorize([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
]);

router.get(
  "/properties/:propertyId/room-products",
  authorizeRoomProducts,
  controller.listRoomProducts,
);
router.post(
  "/properties/:propertyId/room-products",
  authorizeRoomProducts,
  controller.createRoomProduct,
);
router.patch(
  "/room-products/:id",
  authorizeRoomProducts,
  controller.updateRoomProduct,
);

export default router;
