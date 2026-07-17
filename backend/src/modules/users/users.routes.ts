import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./users.controller.js";

const router = Router();

router.use(authenticate);

/**
 * Self profile routes
 */
router.get("/me", controller.getMe);
router.patch("/me", controller.updateMe);

/**
 * Dashboard Admin management routes (SUPER_ADMIN only)
 */
router.get("/admins", authorize([UserRole.SUPER_ADMIN]), controller.listAdmins);
router.post("/admins", authorize([UserRole.SUPER_ADMIN]), controller.createAdmin);
router.patch("/admins/:id", authorize([UserRole.SUPER_ADMIN]), controller.updateAdmin);

/**
 * Dashboard Manager management routes (SUPER_ADMIN and ADMIN)
 */
router.get("/managers", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.listManagers);
router.post("/managers", authorize([UserRole.ADMIN]), controller.createManager);
router.patch("/managers/:id", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.updateManager);

router.get("/staff", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.listStaff);
router.post("/staff", authorize([UserRole.ADMIN]), controller.createStaff);
router.patch("/staff/:id", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.updateStaff);

/**
 * Dashboard Operator / User management routes (SUPER_ADMIN only)
 */
router.use(authorize([UserRole.SUPER_ADMIN]));

router.get("/", controller.listUsersForDashboard);
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

router.patch("/:id/status", controller.updateUserStatus);
router.patch("/:id/role", controller.updateUserRole);
router.post("/:id/password-reset-email", controller.sendUserPasswordResetEmail);
router.patch("/:id/force-password-change", controller.updateForcePasswordChange);
router.delete("/:id/sessions", controller.revokeUserSessions);

export default router;
