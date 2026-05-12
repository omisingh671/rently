import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./amenities.controller.js";

const router = Router();

router.use(authenticate, authorize([UserRole.ADMIN]));

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);

export default router;
