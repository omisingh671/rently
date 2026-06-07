import { Router } from "express";
import * as controller from "./spaces.controller.js";

const router = Router();

router.get("/spaces", controller.listSpaces);
router.get("/spaces/:id", controller.getSpaceById);
router.get("/properties/:id/booking-policy", controller.getPropertyBookingPolicy);

export default router;
