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
 * Dashboard team-user management routes (SUPER_ADMIN and ADMIN)
 */
router.get("/team", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.listTeamUsers);
router.post("/team", authorize([UserRole.ADMIN]), controller.createTeamUser);
router.patch("/team/:id", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]), controller.updateTeamUser);

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
