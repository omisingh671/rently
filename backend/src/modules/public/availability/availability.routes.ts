import { Router } from "express";
import { optionalAuthenticate } from "@/common/middleware/auth.middleware.js";
import * as controller from "./availability.controller.js";

const router = Router();

router.post("/availability/check", controller.checkAvailability);
router.post(
  "/inventory-locks",
  optionalAuthenticate,
  controller.createInventoryLock,
);

export default router;
