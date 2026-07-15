import { Router } from "express";
import multer from "multer";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./tenants.controller.js";

const router = Router();

const supportedLogoMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!supportedLogoMimeTypes.has(file.mimetype)) {
      callback(
        new HttpError(
          400,
          "INVALID_LOGO_FILE_TYPE",
          "Tenant logos must be PNG, JPEG, or WebP images",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN]),
  requirePasswordChangeComplete,
);

router.get("/options", controller.listActiveTenants);
router.get("/", controller.listTenants);
router.post("/", controller.createTenant);
router.get("/:id", controller.getTenantById);
router.patch("/:id", controller.updateTenant);
router.post("/:id/logo", logoUpload.single("logo"), controller.uploadTenantLogo);
router.delete("/:id/logo", controller.removeTenantLogo);

export default router;
