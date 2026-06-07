import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./property-assignments.controller.js";

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
);

router.get("/", controller.listPropertyAssignments);
router.post("/", controller.createPropertyAssignment);
router.delete("/:id", controller.deletePropertyAssignment);

export default router;
