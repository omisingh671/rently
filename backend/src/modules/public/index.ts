import { Router } from "express";
import tenantRouter from "./tenant/tenant.routes.js";
import spacesRouter from "./spaces/spaces.routes.js";
import availabilityRouter from "./availability/availability.routes.js";
import bookingsRouter from "./bookings/bookings.routes.js";
import enquiriesRouter from "./enquiries/enquiries.routes.js";

const publicRouter = Router();

publicRouter.use("/", tenantRouter);
publicRouter.use("/", spacesRouter);
publicRouter.use("/", availabilityRouter);
publicRouter.use("/", bookingsRouter);
publicRouter.use("/", enquiriesRouter);

export { publicRouter };
