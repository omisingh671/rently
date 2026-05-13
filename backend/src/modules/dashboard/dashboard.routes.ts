import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./dashboard.controller.js";

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
);

router.get("/me", controller.getMe);
router.get("/summary", controller.getSummary);

router.get("/tenants/options", controller.listActiveTenants);
router.get("/tenants", controller.listTenants);
router.post("/tenants", controller.createTenant);
router.get("/tenants/:id", controller.getTenantById);
router.patch("/tenants/:id", controller.updateTenant);

router.get("/properties", controller.listProperties);
router.post("/properties", controller.createProperty);
router.get("/properties/:id", controller.getPropertyById);
router.patch("/properties/:id", controller.updateProperty);

router.get("/admins", controller.listAdmins);
router.post("/admins", controller.createAdmin);
router.patch("/admins/:id", controller.updateAdmin);

router.get("/managers", controller.listManagers);
router.post("/managers", controller.createManager);
router.patch("/managers/:id", controller.updateManager);

router.get("/property-assignments", controller.listPropertyAssignments);
router.post("/property-assignments", controller.createPropertyAssignment);
router.delete("/property-assignments/:id", controller.deletePropertyAssignment);

router.get("/properties/:propertyId/amenities", controller.listAmenities);
router.post("/properties/:propertyId/amenities", controller.createAmenity);
router.get("/amenities/:id", controller.getAmenityById);
router.patch("/amenities/:id", controller.updateAmenity);

router.get("/properties/:propertyId/units", controller.listUnits);
router.post("/properties/:propertyId/units", controller.createUnit);
router.get("/units/:id", controller.getUnitById);
router.patch("/units/:id", controller.updateUnit);
router.delete("/units/:id", controller.deleteUnit);

router.get("/properties/:propertyId/rooms", controller.listRooms);
router.post("/properties/:propertyId/rooms", controller.createRoom);
router.get("/rooms/:id", controller.getRoomById);
router.patch("/rooms/:id", controller.updateRoom);
router.delete("/rooms/:id", controller.deleteRoom);

router.get(
  "/properties/:propertyId/maintenance-blocks",
  controller.listMaintenanceBlocks,
);
router.post(
  "/properties/:propertyId/maintenance-blocks",
  controller.createMaintenanceBlock,
);
router.get(
  "/maintenance-blocks/:id",
  controller.getMaintenanceBlockById,
);
router.patch(
  "/maintenance-blocks/:id",
  controller.updateMaintenanceBlock,
);
router.delete(
  "/maintenance-blocks/:id",
  controller.deleteMaintenanceBlock,
);

router.get("/properties/:propertyId/room-products", controller.listRoomProducts);
router.post(
  "/properties/:propertyId/room-products",
  controller.createRoomProduct,
);
router.patch("/room-products/:id", controller.updateRoomProduct);

router.get("/properties/:propertyId/pricing", controller.listRoomPricing);
router.post("/properties/:propertyId/pricing", controller.createRoomPricing);
router.patch("/pricing/:id", controller.updateRoomPricing);
router.delete("/pricing/:id", controller.deleteRoomPricing);

router.get("/properties/:propertyId/taxes", controller.listTaxes);
router.post("/properties/:propertyId/taxes", controller.createTax);
router.patch("/taxes/:id", controller.updateTax);

router.get("/properties/:propertyId/coupons", controller.listCoupons);
router.post("/properties/:propertyId/coupons", controller.createCoupon);
router.patch("/coupons/:id", controller.updateCoupon);

router.get("/properties/:propertyId/bookings", controller.listBookings);
router.post(
  "/properties/:propertyId/bookings/availability",
  controller.checkManualBookingAvailability,
);
router.post("/properties/:propertyId/bookings", controller.createManualBooking);
router.patch("/bookings/:id", controller.updateBooking);

router.get("/properties/:propertyId/enquiries", controller.listEnquiries);
router.patch("/enquiries/:id", controller.updateEnquiry);

router.get("/properties/:propertyId/quotes", controller.listQuotes);
router.patch("/quotes/:id", controller.updateQuote);

export default router;
