import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import * as controller from "./amenities.controller.js";

const router = Router();

router.use(authenticate, requirePasswordChangeComplete);

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);
router.patch("/:id", controller.update);

export default router;
