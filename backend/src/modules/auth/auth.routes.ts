import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";

import {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
} from "./auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", authenticate, me);

router.post("/change-password", authenticate, changePassword);

export default router;
