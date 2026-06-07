import { Router } from "express";
import multer from "multer";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";
import * as controller from "./galleries.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(
        new HttpError(400, "INVALID_FILE_TYPE", "Only image files are supported"),
      );
      return;
    }

    callback(null, true);
  },
});

const router = Router();

router.use(
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
  requirePasswordChangeComplete,
);

router.post("/", upload.single("image"), controller.createGallery);
router.get("/", controller.listGalleries);
router.delete("/:id", controller.deleteGallery);

export default router;
