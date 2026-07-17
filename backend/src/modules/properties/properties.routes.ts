import { Router, type RequestHandler } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./properties.controller.js";
import {
  getPropertyAmenityAssignments,
  replacePropertyAmenityAssignments,
} from "../amenities/amenities.controller.js";

const router = Router();

router.use(authenticate, requirePasswordChangeComplete);

// Properties CRUD
router.get("/", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK, UserRole.ACCOUNTANT]), controller.list);
router.post("/", authorize([UserRole.SUPER_ADMIN]), controller.create);
router.get("/:id", authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK, UserRole.ACCOUNTANT]), controller.getById as unknown as RequestHandler);
router.patch("/:id", authorize([UserRole.SUPER_ADMIN]), controller.update as unknown as RequestHandler);

// Property Amenity Assignments
router.get(
  "/:propertyId/amenity-assignments",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  getPropertyAmenityAssignments
);
router.put(
  "/:propertyId/amenity-assignments",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  replacePropertyAmenityAssignments
);

export default router;
