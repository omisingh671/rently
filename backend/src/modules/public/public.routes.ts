import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "@/common/middleware/auth.middleware.js";
import { paymentsController } from "@/modules/payments/index.js";
import * as controller from "./public.controller.js";

const router = Router();

router.get("/spaces", controller.listSpaces);
router.get("/tenant-config", controller.getTenantConfig);
router.get("/spaces/:id", controller.getSpaceById);
router.post("/availability/check", controller.checkAvailability);
router.post("/enquiries", controller.createEnquiry);
router.post(
  "/inventory-locks",
  optionalAuthenticate,
  controller.createInventoryLock,
);

router.get("/bookings", authenticate, controller.listBookings);
router.post("/bookings/quote", optionalAuthenticate, controller.getBookingQuote);
router.post("/bookings", optionalAuthenticate, controller.createBooking);
router.post(
  "/bookings/:id/checkout/quote",
  optionalAuthenticate,
  controller.getBookingCheckoutQuote,
);
router.patch(
  "/bookings/:id/checkout",
  optionalAuthenticate,
  controller.updateBookingCheckout,
);
router.post(
  "/bookings/:id/payments/manual",
  optionalAuthenticate,
  paymentsController.createManualPayment,
);
router.get("/bookings/:id", optionalAuthenticate, controller.getBookingById);
router.patch("/bookings/:id/cancel", authenticate, controller.cancelBooking);

export default router;
