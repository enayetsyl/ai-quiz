import { Router } from "express";
import requireAuth from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";
import uploadController, { getUploadStatus } from "./upload.controller";

const router = Router();

// uploadController.uploadPdf is an array of middleware (multer + handler)
router.post("/", requireAuth, uploadController.uploadPdf as any);
router.get("/:id/status", requireAuth, getUploadStatus as any);

export const UploadRoutes = router;

export default UploadRoutes;
