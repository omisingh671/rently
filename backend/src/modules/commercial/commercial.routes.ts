import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./commercial.controller.js";

const router = Router();
router.use(authenticate, requirePasswordChangeComplete);

const read = authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK, UserRole.ACCOUNTANT]);
const manage = authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);
const operate = authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK]);
const finance = authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT]);

router.get("/properties/:propertyId/companies", read, controller.listCompanies);
router.post("/properties/:propertyId/companies", manage, controller.createCompany);
router.patch("/companies/:companyId", manage, controller.updateCompany);
router.get("/properties/:propertyId/booking-groups", read, controller.listGroups);
router.post("/properties/:propertyId/booking-groups", manage, controller.createGroup);
router.get("/booking-groups/:groupId", read, controller.getGroup);
router.patch("/booking-groups/:groupId", manage, controller.updateGroupDetails);
router.patch("/booking-groups/:groupId/status", manage, controller.updateGroupStatus);
router.post("/booking-groups/:groupId/room-blocks", manage, controller.holdRooms);
router.post("/booking-groups/:groupId/room-blocks/release", manage, controller.releaseRooms);
router.post("/booking-groups/:groupId/members", operate, controller.addMember);
router.delete("/booking-groups/:groupId/members/:bookingId", operate, controller.removeMember);
router.post("/booking-groups/:groupId/folio-charges", finance, controller.addCharge);
router.post("/booking-groups/:groupId/folio-charges/:chargeId/void", finance, controller.voidCharge);

export default router;
