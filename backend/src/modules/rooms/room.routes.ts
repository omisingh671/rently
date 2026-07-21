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
);

// Rooms
router.get("/properties/:propertyId/rooms", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK]), controller.listRooms);
router.post("/properties/:propertyId/rooms", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.createRoom);
router.get("/rooms/:id", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK]), controller.getRoomById);
router.patch("/rooms/:id", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.updateRoom);
router.delete("/rooms/:id", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.deleteRoom);

export default router;
