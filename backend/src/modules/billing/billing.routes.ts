import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./billing.controller.js";

const router = Router();

router.use(
  authenticate,
  requirePasswordChangeComplete,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
);

router.get("/billing-documents", controller.listDashboardDocuments);
router.post("/billing-documents/invoices", controller.generateDashboardInvoice);
router.post("/billing-documents/receipts", controller.generateDashboardReceipt);
router.get(
  "/billing-documents/:id/download",
  controller.downloadDashboardDocument,
);
router.get("/billing-documents/:id", controller.getDashboardDocument);
router.patch("/billing-documents/:id/void", controller.voidDashboardDocument);

router.get(
  "/properties/:propertyId/billing-settings",
  controller.getDashboardSetting,
);
router.patch(
  "/properties/:propertyId/billing-settings",
  controller.updateDashboardSetting,
);

export default router;
