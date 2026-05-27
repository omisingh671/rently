import { Router } from "express";
import multer from "multer";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import { billingController } from "@/modules/billing/index.js";
import * as controller from "./dashboard.controller.js";
import * as galleryController from "./gallery.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new HttpError(400, "INVALID_FILE_TYPE", "Only image files are supported"));
      return;
    }

    callback(null, true);
  },
});

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
);

router.get("/me", controller.getMe);

router.use(requirePasswordChangeComplete);

router.get("/summary", controller.getSummary);

router.get("/tenants/options", controller.listActiveTenants);
router.get("/tenants", controller.listTenants);
router.post("/tenants", controller.createTenant);
router.get("/tenants/:id", controller.getTenantById);
router.patch("/tenants/:id", controller.updateTenant);

router.get("/properties", controller.listProperties);
router.post("/properties", controller.createProperty);
router.get(
  "/properties/:propertyId/booking-policy",
  controller.getBookingPolicy,
);
router.put(
  "/properties/:propertyId/booking-policy",
  controller.updateBookingPolicy,
);
router.get("/properties/:id", controller.getPropertyById);
router.patch("/properties/:id", controller.updateProperty);

router.get("/admins", controller.listAdmins);
router.post("/admins", controller.createAdmin);
router.patch("/admins/:id", controller.updateAdmin);

router.get("/managers", controller.listManagers);
router.post("/managers", controller.createManager);
router.patch("/managers/:id", controller.updateManager);

router.get("/users", controller.listUsers);
router.patch("/users/:id/status", controller.updateUserStatus);
router.patch("/users/:id/role", controller.updateUserRole);
router.post(
  "/users/:id/password-reset-email",
  controller.sendUserPasswordResetEmail,
);
router.patch(
  "/users/:id/force-password-change",
  controller.updateForcePasswordChange,
);
router.delete("/users/:id/sessions", controller.revokeUserSessions);

router.get("/sessions", controller.listSessions);
router.delete("/sessions/expired", controller.revokeExpiredSessions);
router.delete("/sessions/:id", controller.revokeSession);

router.get("/property-assignments", controller.listPropertyAssignments);
router.post("/property-assignments", controller.createPropertyAssignment);
router.delete("/property-assignments/:id", controller.deletePropertyAssignment);

router.get("/amenities", controller.listAmenities);
router.post("/amenities", controller.createAmenity);
router.get("/amenities/:id", controller.getAmenityById);
router.patch("/amenities/:id", controller.updateAmenity);
router.get(
  "/properties/:propertyId/amenity-assignments",
  controller.getPropertyAmenityAssignments,
);
router.put(
  "/properties/:propertyId/amenity-assignments",
  controller.replacePropertyAmenityAssignments,
);

router.get("/properties/:propertyId/units", controller.listUnits);
router.post("/properties/:propertyId/units", controller.createUnit);
router.get("/units/:id", controller.getUnitById);
router.patch("/units/:id", controller.updateUnit);
router.delete("/units/:id", controller.deleteUnit);

router.get("/properties/:propertyId/rooms", controller.listRooms);
router.post("/properties/:propertyId/rooms", controller.createRoom);
router.get("/rooms/:id", controller.getRoomById);
router.patch("/rooms/:id", controller.updateRoom);
router.delete("/rooms/:id", controller.deleteRoom);

router.get(
  "/properties/:propertyId/maintenance-blocks",
  controller.listMaintenanceBlocks,
);
router.post(
  "/properties/:propertyId/maintenance-blocks",
  controller.createMaintenanceBlock,
);
router.get(
  "/maintenance-blocks/:id",
  controller.getMaintenanceBlockById,
);
router.patch(
  "/maintenance-blocks/:id",
  controller.updateMaintenanceBlock,
);
router.delete(
  "/maintenance-blocks/:id",
  controller.deleteMaintenanceBlock,
);

router.get("/properties/:propertyId/room-products", controller.listRoomProducts);
router.post(
  "/properties/:propertyId/room-products",
  controller.createRoomProduct,
);
router.patch("/room-products/:id", controller.updateRoomProduct);

router.get("/properties/:propertyId/pricing", controller.listRoomPricing);
router.post("/properties/:propertyId/pricing", controller.createRoomPricing);
router.patch("/pricing/:id", controller.updateRoomPricing);
router.delete("/pricing/:id", controller.deleteRoomPricing);

router.get("/properties/:propertyId/taxes", controller.listTaxes);
router.post("/properties/:propertyId/taxes", controller.createTax);
router.patch("/taxes/:id", controller.updateTax);

router.get("/properties/:propertyId/coupons", controller.listCoupons);
router.post("/properties/:propertyId/coupons", controller.createCoupon);
router.patch("/coupons/:id", controller.updateCoupon);

router.get("/properties/:propertyId/bookings", controller.listBookings);
router.get("/properties/:propertyId/room-board", controller.getRoomBoard);
router.post(
  "/properties/:propertyId/bookings/availability",
  controller.checkManualBookingAvailability,
);
router.post("/properties/:propertyId/bookings", controller.createManualBooking);
router.get("/bookings/:id", controller.getBookingById);
router.patch("/bookings/:id", controller.updateBooking);
router.post("/bookings/:id/payments", controller.recordBookingPayment);
router.post("/bookings/:id/refunds", controller.recordBookingRefund);
router.patch(
  "/bookings/:id/refund-requests/:requestId",
  controller.updateRefundRequest,
);

router.get("/billing-documents", billingController.listDashboardDocuments);
router.post("/billing-documents/invoices", billingController.generateDashboardInvoice);
router.post("/billing-documents/receipts", billingController.generateDashboardReceipt);
router.get(
  "/billing-documents/:id/download",
  billingController.downloadDashboardDocument,
);
router.get("/billing-documents/:id", billingController.getDashboardDocument);
router.patch("/billing-documents/:id/void", billingController.voidDashboardDocument);
router.get(
  "/properties/:propertyId/billing-settings",
  billingController.getDashboardSetting,
);
router.patch(
  "/properties/:propertyId/billing-settings",
  billingController.updateDashboardSetting,
);

router.get("/properties/:propertyId/enquiries", controller.listEnquiries);
router.patch("/enquiries/:id", controller.updateEnquiry);

router.get("/properties/:propertyId/quotes", controller.listQuotes);
router.patch("/quotes/:id", controller.updateQuote);

router.post("/galleries", upload.single("image"), galleryController.createGallery);
router.get("/galleries", galleryController.listGalleries);
router.delete("/galleries/:id", galleryController.deleteGallery);

export default router;
