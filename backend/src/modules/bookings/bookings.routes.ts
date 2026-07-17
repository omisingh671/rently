import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./bookings.controller.js";

const router = Router();

const bookingReadRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FRONT_DESK,
  UserRole.ACCOUNTANT,
];
const operationalRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FRONT_DESK,
];
const financialRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.ACCOUNTANT,
];

router.use(authenticate, requirePasswordChangeComplete);

router.get("/properties/:propertyId/bookings", authorize(bookingReadRoles), controller.listBookings);
router.get("/properties/:propertyId/room-board", authorize(operationalRoles), controller.getRoomBoard);
router.get(
  "/properties/:propertyId/operations/board",
  authorize(operationalRoles),
  controller.getOperationsBoard,
);
router.get(
  "/properties/:propertyId/operations/cashier-summary",
  authorize(bookingReadRoles),
  controller.getCashierSummary,
);
router.patch(
  "/properties/:propertyId/rooms/:roomId/housekeeping",
  authorize(operationalRoles),
  controller.updateRoomHousekeeping,
);
router.post(
  "/properties/:propertyId/bookings/availability",
  authorize(operationalRoles),
  controller.checkManualBookingAvailability,
);
router.post("/properties/:propertyId/bookings", authorize(operationalRoles), controller.createManualBooking);
router.get("/bookings/:id", authorize(bookingReadRoles), controller.getBookingById);
router.patch("/bookings/:id", authorize(operationalRoles), controller.updateBooking);
router.post("/bookings/:id/check-in", authorize(operationalRoles), controller.checkInBooking);
router.post("/bookings/:id/check-in/preview", authorize(operationalRoles), controller.previewCheckInPolicy);
router.post("/bookings/:id/check-out", authorize(operationalRoles), controller.checkOutBooking);
router.post("/bookings/:id/check-out/preview", authorize(operationalRoles), controller.previewCheckOutPolicy);
router.post("/bookings/:id/no-show", authorize(operationalRoles), controller.markBookingNoShow);
router.post("/bookings/:id/room-move", authorize(operationalRoles), controller.moveBookingRooms);
router.post("/bookings/:id/room-move/preview", authorize(operationalRoles), controller.previewBookingRoomMove);
router.post(
  "/bookings/:id/stay-extension/preview",
  authorize(operationalRoles),
  controller.previewStayExtension,
);
router.post("/bookings/:id/stay-extension", authorize(operationalRoles), controller.extendStay);
router.post(
  "/bookings/:id/lifecycle-reversal",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  controller.reverseBookingLifecycle,
);
router.post("/bookings/:id/folio-charges", authorize(bookingReadRoles), controller.createBookingFolioCharge);
router.post(
  "/bookings/:id/folio-charges/:chargeId/void",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]),
  controller.voidBookingFolioCharge,
);
router.post("/bookings/:id/payments", authorize(bookingReadRoles), controller.recordBookingPayment);
router.post("/bookings/:id/refunds", authorize(financialRoles), controller.recordBookingRefund);
router.patch(
  "/bookings/:id/refund-requests/:requestId",
  authorize(financialRoles),
  controller.updateRefundRequest,
);

export default router;
