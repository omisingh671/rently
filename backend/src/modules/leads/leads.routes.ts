import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./leads.controller.js";

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
  requirePasswordChangeComplete,
);

router.get("/properties/:propertyId/enquiries", controller.listEnquiries);
router.patch("/enquiries/:id", controller.updateEnquiry);

router.get("/properties/:propertyId/quotes", controller.listQuotes);
router.patch("/quotes/:id", controller.updateQuote);

export default router;
