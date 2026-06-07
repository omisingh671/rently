import { Router } from "express";
import * as controller from "./tenant.controller.js";

const router = Router();

router.get("/tenant-config", controller.getTenantConfig);

export default router;
