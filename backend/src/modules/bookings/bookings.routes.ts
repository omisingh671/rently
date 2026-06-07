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

export default router;
