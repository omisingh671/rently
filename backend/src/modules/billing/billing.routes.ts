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
);

const billingReadRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK, UserRole.ACCOUNTANT];
const accountingRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT];

router.get("/billing-documents", authorize(billingReadRoles), controller.listDashboardDocuments);
router.post("/billing-documents/invoices", authorize(billingReadRoles), controller.generateDashboardInvoice);
router.post("/billing-documents/receipts", authorize(billingReadRoles), controller.generateDashboardReceipt);
router.get(
  "/billing-documents/:id/download",
  authorize(billingReadRoles),
  controller.downloadDashboardDocument,
);
router.post(
  "/billing-documents/:id/pdf/retry",
  authorize(accountingRoles),
  controller.retryDashboardDocumentPdf,
);
router.get("/billing-documents/:id", authorize(billingReadRoles), controller.getDashboardDocument);
router.patch("/billing-documents/:id/void", authorize(accountingRoles), controller.voidDashboardDocument);

router.get(
  "/properties/:propertyId/billing-settings",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  controller.getDashboardSetting,
);
router.get(
  "/properties/:propertyId/billing-settings/audits",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  controller.listDashboardSettingAudits,
);
router.patch(
  "/properties/:propertyId/billing-settings",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  controller.updateDashboardSetting,
);

export default router;
