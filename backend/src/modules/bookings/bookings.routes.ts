import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./bookings.controller.js";

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
);

router.use(requirePasswordChangeComplete);

router.get("/properties/:propertyId/bookings", controller.listBookings);
router.get("/properties/:propertyId/room-board", controller.getRoomBoard);
router.get(
  "/properties/:propertyId/operations/board",
  controller.getOperationsBoard,
);
router.get(
  "/properties/:propertyId/operations/cashier-summary",
  controller.getCashierSummary,
);
router.patch(
  "/properties/:propertyId/rooms/:roomId/housekeeping",
  controller.updateRoomHousekeeping,
);
router.post(
  "/properties/:propertyId/bookings/availability",
  controller.checkManualBookingAvailability,
);
router.post("/properties/:propertyId/bookings", controller.createManualBooking);
router.get("/bookings/:id", controller.getBookingById);
router.patch("/bookings/:id", controller.updateBooking);
router.post("/bookings/:id/check-in", controller.checkInBooking);
router.post("/bookings/:id/check-in/preview", controller.previewCheckInPolicy);
router.post("/bookings/:id/check-out", controller.checkOutBooking);
router.post("/bookings/:id/check-out/preview", controller.previewCheckOutPolicy);
router.post("/bookings/:id/no-show", controller.markBookingNoShow);
router.post("/bookings/:id/room-move", controller.moveBookingRooms);
router.post("/bookings/:id/room-move/preview", controller.previewBookingRoomMove);
router.post(
  "/bookings/:id/stay-extension/preview",
  controller.previewStayExtension,
);
router.post("/bookings/:id/stay-extension", controller.extendStay);
router.post("/bookings/:id/status-correction", controller.correctBookingStatus);
router.post("/bookings/:id/folio-charges", controller.createBookingFolioCharge);
router.post(
  "/bookings/:id/folio-charges/:chargeId/void",
  controller.voidBookingFolioCharge,
);
router.post("/bookings/:id/payments", controller.recordBookingPayment);
router.post("/bookings/:id/refunds", controller.recordBookingRefund);
router.patch(
  "/bookings/:id/refund-requests/:requestId",
  controller.updateRefundRequest,
);

export default router;
