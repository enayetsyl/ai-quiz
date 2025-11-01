import { Router } from "express";
import requireAuth from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";
import uploadController, {
  listUploads,
  getUploadStatus,
  requeueUpload,
  regeneratePage,
  getPageAttempts,
  getUploadAttempts,
} from "./upload.controller";

const router = Router();

// uploadController.uploadPdf is an array of middleware [multer, handler]
router.post(
  "/",
  requireAuth,
  uploadController.uploadPdf[0] as any,
  catchAsync(uploadController.uploadPdf[1] as any)
);
router.get("/", requireAuth, catchAsync(listUploads as any));
router.get("/:id/status", requireAuth, catchAsync(getUploadStatus as any));
router.post("/:id/requeue", requireAuth, catchAsync(requeueUpload as any));
router.post(
  "/pages/:pageId/regenerate",
  requireAuth,
  catchAsync(regeneratePage as any)
);
router.get(
  "/pages/:pageId/attempts",
  requireAuth,
  catchAsync(getPageAttempts as any)
);
router.get("/:id/attempts", requireAuth, catchAsync(getUploadAttempts as any));

export const UploadRoutes = router;

export default UploadRoutes;
