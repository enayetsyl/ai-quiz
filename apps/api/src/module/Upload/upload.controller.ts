import { Request, Response } from "express";
import { uploadMetadataSchema } from "./upload.validation";
import * as service from "./upload.service";
import { sendResponse } from "../../lib/http";
import { upload } from "./upload.utils";

export const uploadPdf = [
  // multer middleware to handle single file
  upload.single("file"),
  async (req: Request, res: Response) => {
    const body = req.body;
    const parse = uploadMetadataSchema.safeParse({
      classId: Number(body.classId),
      subjectId: body.subjectId,
      chapterId: body.chapterId,
    });
    if (!parse.success)
      return sendResponse(res, {
        success: false,
        status: 400,
        message: "Invalid metadata",
        error: { message: "validation failed", code: "validation_error" },
        meta: { validation: parse.error.errors },
      });
    if (!req.file)
      return sendResponse(res, {
        success: false,
        status: 400,
        message: "No file uploaded",
      });

    try {
      const uploadRecord = await service.handleUpload({
        fileBuffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        metadata: parse.data,
        uploadedBy: (req as any).user?.id ?? null,
      });
      return sendResponse(res, {
        success: true,
        data: { uploadId: uploadRecord.id },
        message: "Upload accepted",
      });
    } catch (error) {
      // Handle duplicate upload error
      if (error instanceof Error && error.message.includes("already been uploaded")) {
        return sendResponse(res, {
          success: false,
          status: 409,
          message: "Duplicate upload detected",
          error: {
            message: error.message,
            code: "duplicate_upload",
          },
        });
      }
      // Re-throw other errors to be handled by error middleware
      throw error;
    }
  },
];

export default { uploadPdf };

export const listUploads = async (req: Request, res: Response) => {
  const data = await service.listUploads();
  return sendResponse(res, {
    success: true,
    data,
  });
};

export const getUploadStatus = async (req: Request, res: Response) => {
  const uploadId = req.params.id;
  const data = await service.getUploadStatus(uploadId);
  return sendResponse(res, {
    success: true,
    data,
  });
};

export const requeueUpload = async (req: Request, res: Response) => {
  const uploadId = req.params.id;
  await service.requeueUpload(uploadId);
  return sendResponse(res, { success: true, message: "Requeued upload" });
};

export const regeneratePage = async (req: Request, res: Response) => {
  const pageId = req.params.pageId;
  await service.regeneratePage(pageId);
  return sendResponse(res, { success: true, message: "Regeneration enqueued" });
};

export const getPageAttempts = async (req: Request, res: Response) => {
  const pageId = req.params.pageId;
  const data = await service.getPageAttempts(pageId);
  return sendResponse(res, { success: true, data });
};

export const getUploadAttempts = async (req: Request, res: Response) => {
  const uploadId = req.params.id;
  const data = await service.getUploadAttempts(uploadId);
  return sendResponse(res, { success: true, data });
};

/**
 * Initiate a direct upload to R2
 * Returns a presigned URL for the client to upload directly
 */
export const initiateUpload = async (req: Request, res: Response) => {
  const parse = uploadMetadataSchema.safeParse({
    classId: Number(req.body.classId),
    subjectId: req.body.subjectId,
    chapterId: req.body.chapterId,
  });

  if (!parse.success) {
    return sendResponse(res, {
      success: false,
      status: 400,
      message: "Invalid metadata",
      error: { message: "validation failed", code: "validation_error" },
      meta: { validation: parse.error.errors },
    });
  }

  const data = await service.initiateUpload(parse.data);
  return sendResponse(res, {
    success: true,
    data,
  });
};

/**
 * Complete the upload after direct R2 upload
 * Creates the upload record and processes it (file is already in R2)
 */
export const completeUpload = async (req: Request, res: Response) => {
  const { uploadId, pdfKey, metadata, originalname } = req.body;

  try {
    const data = await service.completeUpload({
      uploadId,
      pdfKey,
      metadata,
      originalname,
      userId: (req as any).user?.id ?? null,
    });
    return sendResponse(res, {
      success: true,
      data,
      message: "Upload completed",
    });
  } catch (error) {
    // Error middleware will handle HttpError
    throw error;
  }
};

/**
 * Delete a chapter and all associated data
 * Deletes: chapter, uploads, pages, questions, published questions (QuestionBank), and S3/R2 files
 */
export const deleteChapter = async (req: Request, res: Response) => {
  const chapterId = req.params.chapterId;

  try {
    await service.deleteChapter(chapterId);
    return sendResponse(res, {
      success: true,
      message: "Chapter and all associated data (including S3 files) deleted successfully",
    });
  } catch (error) {
    // Error middleware will handle HttpError
    throw error;
  }
};
