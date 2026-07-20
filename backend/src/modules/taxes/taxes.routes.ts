import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./taxes.controller.js";

const router = Router();

router.use(authenticate, requirePasswordChangeComplete);

const authorizeTaxes = authorize([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
]);

router.get(
  "/properties/:propertyId/taxes",
  authorizeTaxes,
  controller.listTaxes,
);
router.post(
  "/properties/:propertyId/taxes",
  authorizeTaxes,
  controller.createTax,
);
router.patch("/taxes/:id", authorizeTaxes, controller.updateTax);

export default router;
