import { Router } from "express";
import * as controller from "./room.controller.js";
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

// Rooms
router.get("/properties/:propertyId/rooms", controller.listRooms);
router.post("/properties/:propertyId/rooms", controller.createRoom);
router.get("/rooms/:id", controller.getRoomById);
router.patch("/rooms/:id", controller.updateRoom);
router.delete("/rooms/:id", controller.deleteRoom);

export default router;
