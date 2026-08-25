import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./accounting.controller.js";

const router = Router();
const readRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.MANAGER,
];
router.use(authenticate, requirePasswordChangeComplete, authorize(readRoles));
router.get("/journal", controller.listJournal);
router.get("/journal/:id", controller.getJournalEntry);
router.get("/reconciliation", controller.reconcile);
export default router;
