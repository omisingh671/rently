import { Router } from "express";

import * as controller from "./unit.controller.js";

import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";

const router = Router();

/**
 * All Unit routes require authentication
 */
router.use(authenticate);

/**
 * Admin-only routes
 * Adjust roles later if MANAGER should be allowed
 */
router.use(authorize(["ADMIN"]));

/**
 * Nested under Property
 * GET    /admin/properties/:propertyId/units
 * POST   /admin/properties/:propertyId/units
 */
router.get("/properties/:propertyId/units", controller.list);

router.post("/properties/:propertyId/units", controller.create);

/**
 * Unit by ID
 * GET    /admin/units/:id
 * PATCH  /admin/units/:id
 * DELETE /admin/units/:id
 */
router.get("/units/:id", controller.getById);

router.patch("/units/:id", controller.update);

router.delete("/units/:id", controller.remove);

export default router;
