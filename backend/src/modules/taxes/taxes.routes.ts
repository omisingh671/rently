import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./taxes.controller.js";

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
  requirePasswordChangeComplete,
);

router.get("/properties/:propertyId/taxes", controller.listTaxes);
router.post("/properties/:propertyId/taxes", controller.createTax);
router.patch("/taxes/:id", controller.updateTax);

export default router;
