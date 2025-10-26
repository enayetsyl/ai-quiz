import { Request, Response } from "express";
import multer from "multer";
import { uploadMetadataSchema } from "./upload.validation";
import { handleUpload } from "./upload.service";
import { sendResponse } from "../../lib/http";
import { getPresignedUrlForKey } from "../../lib/s3";

const upload = multer({ storage: multer.memoryStorage() });

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
    data: { uploadId: upload.id, pages, pagesCount: upload.pagesCount },
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
  const pageIds = pages.map((p) => p.id);
  const attempts = await prismaLib.prisma.pageGenerationAttempt.findMany({
    where: { pageId: { in: pageIds } },
    orderBy: { createdAt: "desc" },
  });
  return sendResponse(res, { success: true, data: { uploadId, attempts } });
};
