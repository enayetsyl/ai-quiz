import { Request, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import { uploadMetadataSchema } from "./upload.validation";
import { handleUpload } from "./upload.service";
import { sendResponse } from "../../lib/http";
import { getPresignedUrlForKey, getPresignedPutUrlForKey, fileExists } from "../../lib/s3";
import { prisma } from "../../lib";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit
  },
});

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

    const uploadRecord = await handleUpload({
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
  },
];

export default { uploadPdf };

export const listUploads = async (req: Request, res: Response) => {
  const prismaLib = await import("../../lib/prisma");
  const uploads = await prismaLib.prisma.upload.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      class: {
        select: {
          id: true,
          displayName: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
      chapter: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          pages: true,
        },
      },
    },
  });

  // Calculate status for each upload based on pages
  const uploadsWithStatus = await Promise.all(
    uploads.map(async (upload: (typeof uploads)[0]) => {
      const pages = await prismaLib.prisma.page.findMany({
        where: { uploadId: upload.id },
        select: { status: true },
      });

      const completedCount = pages.filter(
        (p: (typeof pages)[0]) => p.status === "complete"
      ).length;
      const failedCount = pages.filter((p: (typeof pages)[0]) => p.status === "failed").length;
      const processingCount = pages.filter(
        (p: (typeof pages)[0]) => p.status === "queued" || p.status === "generating"
      ).length;

      let overallStatus = "pending";
      if (pages.length === 0) {
        overallStatus = "pending";
      } else if (processingCount > 0) {
        overallStatus = "processing";
      } else if (failedCount === pages.length) {
        overallStatus = "failed";
      } else if (completedCount === pages.length) {
        overallStatus = "completed";
      } else if (completedCount > 0 || failedCount > 0) {
        overallStatus = "partial";
      }

      return {
        id: upload.id,
        originalFilename: upload.originalFilename,
        createdAt: upload.createdAt,
        pagesCount: upload.pagesCount || pages.length,
        completedPages: completedCount,
        failedPages: failedCount,
        processingPages: processingCount,
        status: overallStatus,
        classLevel: upload.class?.displayName || null,
        subject: upload.subject?.name || null,
        chapter: upload.chapter?.name || null,
      };
    })
  );

  return sendResponse(res, {
    success: true,
    data: uploadsWithStatus,
  });
};

export const getUploadStatus = async (req: Request, res: Response) => {
  const uploadId = req.params.id;
  const upload = await (
    await import("../../lib/prisma")
  ).prisma.upload.findUnique({
    where: { id: uploadId },
    include: { pages: true },
  });
  if (!upload)
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "Upload not found",
    });

  // build presigned urls for each page
  const pages = await Promise.all(
    upload.pages.map(async (p: any) => {
      const pngUrl = p.s3PngKey
        ? await getPresignedUrlForKey(p.s3PngKey)
        : null;
      const thumbUrl = p.s3ThumbKey
        ? await getPresignedUrlForKey(p.s3ThumbKey)
        : null;
      return {
        id: p.id,
        pageNumber: p.pageNumber,
        status: p.status,
        s3PngKey: p.s3PngKey,
        s3ThumbKey: p.s3ThumbKey,
        pngUrl,
        thumbUrl,
        lastGeneratedAt: p.lastGeneratedAt,
      };
    })
  );

  return sendResponse(res, {
    success: true,
    data: { 
      uploadId: upload.id, 
      pages, 
      pagesCount: upload.pagesCount,
      chapterId: upload.chapterId,
    },
  });
};

export const requeueUpload = async (req: Request, res: Response) => {
  const uploadId = req.params.id;
  const upload = await (
    await import("../../lib/prisma")
  ).prisma.upload.findUnique({ where: { id: uploadId } });
  if (!upload)
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "Upload not found",
    });
  await (
    await import("../../lib/queue")
  ).rasterizeQueue.add(
    "analyze_and_rasterize",
    { uploadId, s3PdfKey: upload.s3PdfKey },
    { removeOnComplete: true }
  );
  return sendResponse(res, { success: true, message: "Requeued upload" });
};

export const regeneratePage = async (req: Request, res: Response) => {
  const pageId = req.params.pageId;
  const page = await (
    await import("../../lib/prisma")
  ).prisma.page.findUnique({ where: { id: pageId } });
  if (!page)
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "Page not found",
    });

  // hard-replace: delete existing questions for page and set status
  await (
    await import("../../lib/prisma")
  ).prisma.$transaction([
    (
      await import("../../lib/prisma")
    ).prisma.question.deleteMany({ where: { pageId: page.id } }),
    (
      await import("../../lib/prisma")
    ).prisma.page.update({
      where: { id: page.id },
      data: { status: "queued" as any },
    }),
  ]);

  // enqueue a job to regenerate the whole upload (simpler):
  const upload = await (
    await import("../../lib/prisma")
  ).prisma.upload.findUnique({ where: { id: page.uploadId } });
  await (
    await import("../../lib/queue")
  ).rasterizeQueue.add(
    "analyze_and_rasterize",
    { uploadId: page.uploadId, s3PdfKey: upload?.s3PdfKey },
    { removeOnComplete: true }
  );

  return sendResponse(res, { success: true, message: "Regeneration enqueued" });
};

export const getPageAttempts = async (req: Request, res: Response) => {
  const pageId = req.params.pageId;
  const prismaLib = await import("../../lib/prisma");
  const attempts = await prismaLib.prisma.pageGenerationAttempt.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
  });
  return sendResponse(res, { success: true, data: { pageId, attempts } });
};

export const getUploadAttempts = async (req: Request, res: Response) => {
  const uploadId = req.params.id;
  const prismaLib = await import("../../lib/prisma");
  const pages = await prismaLib.prisma.page.findMany({
    where: { uploadId },
    select: { id: true },
  });
  const pageIds = pages.map((p: (typeof pages)[0]) => p.id);
  const attempts = await prismaLib.prisma.pageGenerationAttempt.findMany({
    where: { pageId: { in: pageIds } },
    orderBy: { createdAt: "desc" },
  });
  return sendResponse(res, { success: true, data: { uploadId, attempts } });
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

  // Generate a temporary upload ID
  const tempUploadId = crypto.randomUUID();
  const pdfKey = `uploads/${tempUploadId}/original.pdf`;
  
  // Get presigned PUT URL
  const presignedUrl = await getPresignedPutUrlForKey(
    pdfKey,
    "application/pdf",
    3600 // 1 hour expiry
  );

  return sendResponse(res, {
    success: true,
    data: {
      uploadId: tempUploadId,
      presignedUrl,
      pdfKey,
      metadata: parse.data,
    },
  });
};

/**
 * Complete the upload after direct R2 upload
 * Creates the upload record and processes it (file is already in R2)
 */
export const completeUpload = async (req: Request, res: Response) => {
  const { uploadId, pdfKey, metadata, originalname } = req.body;
  
  if (!uploadId || !pdfKey) {
    return sendResponse(res, {
      success: false,
      status: 400,
      message: "Missing uploadId or pdfKey",
    });
  }

  try {
    // Verify the file exists in R2 (lightweight check without downloading)
    const exists = await fileExists(pdfKey);
    if (!exists) {
      return sendResponse(res, {
        success: false,
        status: 404,
        message: "File not found in R2. Upload may have failed.",
      });
    }

    // Validate metadata
    const parse = uploadMetadataSchema.safeParse(metadata || {
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

    // Create upload record directly with the pdfKey (file is already in R2)
    const upload = await prisma.upload.create({
      data: {
        classId: parse.data.classId,
        subjectId: parse.data.subjectId,
        chapterId: parse.data.chapterId,
        uploadedBy: (req as any).user?.id ?? null,
        originalFilename: originalname || "uploaded.pdf",
        mimeType: "application/pdf",
        s3Bucket: process.env.R2_BUCKET as string,
        s3PdfKey: pdfKey, // Use the pdfKey from the direct upload
        pagesCount: 0,
        fileMeta: {},
      },
    });

    // Enqueue job to analyze and rasterize all pages
    const { rasterizeQueue } = await import("../../lib/queue");
    await rasterizeQueue.add(
      "analyze_and_rasterize",
      { uploadId: upload.id, s3PdfKey: pdfKey },
      { removeOnComplete: true, removeOnFail: false }
    );

    const { logger } = await import("../../lib/logger");
    logger.info({ uploadId: upload.id }, "Enqueued analyze_and_rasterize job");

    return sendResponse(res, {
      success: true,
      data: { uploadId: upload.id },
      message: "Upload completed",
    });
  } catch (error) {
    console.error("Error completing upload:", error);
    return sendResponse(res, {
      success: false,
      status: 500,
      message: "Failed to complete upload",
      error: { message: error instanceof Error ? error.message : String(error) },
    });
  }
};
