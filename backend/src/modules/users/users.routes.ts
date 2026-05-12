import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./users.controller.js";

const router = Router();

router.use(authenticate);

/**
 * Self profile
 **/
router.get("/me", controller.getMe);
router.patch("/me", controller.updateMe);

/**
 * Admin
 **/
router.use(authorize([UserRole.SUPER_ADMIN]));
router.get("/", controller.list);
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

export default router;
