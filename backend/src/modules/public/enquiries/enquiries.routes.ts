import { Router } from "express";
import * as controller from "./enquiries.controller.js";

const router = Router();

router.post("/enquiries", controller.createEnquiry);

export default router;
