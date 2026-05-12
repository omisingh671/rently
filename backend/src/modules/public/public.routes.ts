import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { paymentsController } from "@/modules/payments/index.js";
import * as controller from "./public.controller.js";

const router = Router();

router.get("/spaces", controller.listSpaces);
router.get("/tenant-config", controller.getTenantConfig);
router.get("/spaces/:id", controller.getSpaceById);
router.post("/availability/check", controller.checkAvailability);
router.post("/enquiries", controller.createEnquiry);

router.get("/bookings", authenticate, controller.listBookings);
router.post("/bookings", authenticate, controller.createBooking);
router.post(
  "/bookings/:id/payments/manual",
  authenticate,
  paymentsController.createManualPayment,
);
router.get("/bookings/:id", authenticate, controller.getBookingById);
router.patch("/bookings/:id/cancel", authenticate, controller.cancelBooking);

export default router;
