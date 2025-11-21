import crypto from "crypto";
import { prisma } from "../../lib";
import { PrismaClient } from "@prisma/client";
import {
  uploadBuffer,
  getPresignedUrlForKey,
  getPresignedPutUrlForKey,
  fileExists,
  deleteObjects,
} from "../../lib/s3";
import { rasterizeQueue } from "../../lib/queue";
import { logger } from "../../lib/logger";
import { HttpError } from "../../lib/http";
import { calculateUploadStatus } from "./upload.utils";
import { uploadMetadataSchema } from "./upload.validation";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

type UploadMetadata = { classId: number; subjectId: string; chapterId: string };
type HandleUploadArgs = {
  fileBuffer: Buffer;
  originalname: string;
  mimetype: string;
  metadata: UploadMetadata;
  uploadedBy?: string | null;
};

export async function handleUpload({
  fileBuffer,
  originalname,
  mimetype,
  metadata,
  uploadedBy,
}: HandleUploadArgs) {
  if (fileBuffer.length > MAX_FILE_BYTES) {
    throw new Error("File exceeds 20 MB limit");
  }

  // Check if an upload for this chapter already exists
  const existingUpload = await prisma.upload.findFirst({
    where: {
      classId: metadata.classId,
      subjectId: metadata.subjectId,
      chapterId: metadata.chapterId,
    },
    select: {
      id: true,
      originalFilename: true,
      createdAt: true,
    },
  });

  if (existingUpload) {
    throw new HttpError(
      `A chapter for this class, subject, and chapter combination has already been uploaded. Existing upload: ${
        existingUpload.originalFilename
      } (uploaded on ${existingUpload.createdAt.toLocaleDateString()})`,
      409
    );
  }

  // create DB upload row (pagesCount will be filled by worker after pdfinfo)
  const upload = await prisma.upload.create({
    data: {
      classId: metadata.classId,
      subjectId: metadata.subjectId,
      chapterId: metadata.chapterId,
      uploadedBy: uploadedBy ?? null,
      originalFilename: originalname,
      mimeType: mimetype,
      s3Bucket: process.env.R2_BUCKET as string,
      s3PdfKey: "",
      pagesCount: 0,
      fileMeta: {},
    },
  });

  const pdfKey = `uploads/${upload.id}/original.pdf`;

  await uploadBuffer(fileBuffer, pdfKey, mimetype);

  // update upload with s3 key
  await prisma.upload.update({
    where: { id: upload.id },
    data: { s3PdfKey: pdfKey },
  });

  // enqueue a single job to analyze and rasterize all pages
  await rasterizeQueue.add(
    "analyze_and_rasterize",
    { uploadId: upload.id, s3PdfKey: pdfKey },
    { removeOnComplete: true, removeOnFail: false }
  );

  logger.info({ uploadId: upload.id }, "Enqueued analyze_and_rasterize job");

  return upload;
}

export async function listUploads() {
  const uploads = await prisma.upload.findMany({
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
      const pages = await prisma.page.findMany({
        where: { uploadId: upload.id },
        select: { status: true },
      });

      const statusInfo = calculateUploadStatus(pages);

      return {
        id: upload.id,
        originalFilename: upload.originalFilename,
        createdAt: upload.createdAt,
        pagesCount: upload.pagesCount || pages.length,
        completedPages: statusInfo.completedCount,
        failedPages: statusInfo.failedCount,
        processingPages: statusInfo.processingCount,
        status: statusInfo.status,
        classLevel: upload.class?.displayName || null,
        subject: upload.subject?.name || null,
        chapter: upload.chapter?.name || null,
        chapterId: upload.chapterId || null,
      };
    })
  );

  return uploadsWithStatus;
}

export async function getUploadStatus(uploadId: string) {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { pages: true },
  });

  if (!upload) {
    throw new HttpError("Upload not found", 404);
  }

  // Build presigned URLs for each page
  const pages = await Promise.all(
    upload.pages.map(async (p: (typeof upload.pages)[0]) => {
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

  return {
    uploadId: upload.id,
    pages,
    pagesCount: upload.pagesCount,
    chapterId: upload.chapterId,
  };
}

export async function requeueUpload(uploadId: string) {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    select: { id: true, s3PdfKey: true },
  });

  if (!upload) {
    throw new HttpError("Upload not found", 404);
  }

  await rasterizeQueue.add(
    "analyze_and_rasterize",
    { uploadId, s3PdfKey: upload.s3PdfKey },
    { removeOnComplete: true }
  );
}

export async function regeneratePage(pageId: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, uploadId: true },
  });

  if (!page) {
    throw new HttpError("Page not found", 404);
  }

  // Hard-replace: delete existing questions for page and set status
  await prisma.$transaction([
    prisma.question.deleteMany({ where: { pageId: page.id } }),
    prisma.page.update({
      where: { id: page.id },
      data: { status: "queued" as any },
    }),
  ]);

  // Enqueue a job to regenerate the whole upload (simpler)
  const upload = await prisma.upload.findUnique({
    where: { id: page.uploadId },
    select: { s3PdfKey: true },
  });

  await rasterizeQueue.add(
    "analyze_and_rasterize",
    { uploadId: page.uploadId, s3PdfKey: upload?.s3PdfKey },
    { removeOnComplete: true }
  );
}

export async function getPageAttempts(pageId: string) {
  const attempts = await prisma.pageGenerationAttempt.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
  });
  return { pageId, attempts };
}

export async function getUploadAttempts(uploadId: string) {
  const pages = await prisma.page.findMany({
    where: { uploadId },
    select: { id: true },
  });
  const pageIds = pages.map((p: { id: string }) => p.id);
  const attempts = await prisma.pageGenerationAttempt.findMany({
    where: { pageId: { in: pageIds } },
    orderBy: { createdAt: "desc" },
  });
  return { uploadId, attempts };
}

export async function initiateUpload(metadata: {
  classId: number;
  subjectId: string;
  chapterId: string;
}) {
  const parse = uploadMetadataSchema.safeParse(metadata);
  if (!parse.success) {
    throw new HttpError("Invalid metadata", 400);
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

  return {
    uploadId: tempUploadId,
    presignedUrl,
    pdfKey,
    metadata: parse.data,
  };
}

export async function completeUpload(args: {
  uploadId: string;
  pdfKey: string;
  metadata?: {
    classId: number;
    subjectId: string;
    chapterId: string;
  };
  originalname?: string;
  userId?: string | null;
}) {
  const { uploadId, pdfKey, metadata, originalname, userId } = args;

  if (!uploadId || !pdfKey) {
    throw new HttpError("Missing uploadId or pdfKey", 400);
  }

  // Verify the file exists in R2
  const exists = await fileExists(pdfKey);
  if (!exists) {
    throw new HttpError("File not found in R2. Upload may have failed.", 404);
  }

  // Validate metadata
  const parse = uploadMetadataSchema.safeParse(metadata);
  if (!parse.success) {
    throw new HttpError("Invalid metadata", 400);
  }

  // Check if an upload for this chapter already exists
  const existingUpload = await prisma.upload.findFirst({
    where: {
      classId: parse.data.classId,
      subjectId: parse.data.subjectId,
      chapterId: parse.data.chapterId,
    },
    select: {
      id: true,
      originalFilename: true,
      createdAt: true,
    },
  });

  if (existingUpload) {
    throw new HttpError(
      `A chapter for this class, subject, and chapter combination has already been uploaded. Existing upload: ${
        existingUpload.originalFilename
      } (uploaded on ${existingUpload.createdAt.toLocaleDateString()})`,
      409
    );
  }

  // Create upload record directly with the pdfKey (file is already in R2)
  const upload = await prisma.upload.create({
    data: {
      classId: parse.data.classId,
      subjectId: parse.data.subjectId,
      chapterId: parse.data.chapterId,
      uploadedBy: userId ?? null,
      originalFilename: originalname || "uploaded.pdf",
      mimeType: "application/pdf",
      s3Bucket: process.env.R2_BUCKET as string,
      s3PdfKey: pdfKey,
      pagesCount: 0,
      fileMeta: {},
    },
  });

  // Enqueue job to analyze and rasterize all pages
  await rasterizeQueue.add(
    "analyze_and_rasterize",
    { uploadId: upload.id, s3PdfKey: pdfKey },
    { removeOnComplete: true, removeOnFail: false }
  );

  logger.info({ uploadId: upload.id }, "Enqueued analyze_and_rasterize job");

  return { uploadId: upload.id };
}

export async function deleteChapter(chapterId: string) {
  if (!chapterId) {
    throw new HttpError("Chapter ID is required", 400);
  }

  // Verify chapter exists
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    throw new HttpError("Chapter not found", 404);
  }

  // Fetch all uploads and pages before deletion to get S3 keys
  const uploads = await prisma.upload.findMany({
    where: { chapterId },
    select: {
      id: true,
      s3PdfKey: true,
      pages: {
        select: {
          id: true,
          s3PngKey: true,
          s3ThumbKey: true,
        },
      },
    },
  });

  // Collect all S3 keys to delete
  const s3KeysToDelete: string[] = [];

  // Add PDF keys from uploads
  uploads.forEach((upload: (typeof uploads)[0]) => {
    if (upload.s3PdfKey) {
      s3KeysToDelete.push(upload.s3PdfKey);
    }
  });

  // Add PNG and thumbnail keys from pages
  uploads.forEach((upload: (typeof uploads)[0]) => {
    upload.pages.forEach((page: (typeof upload.pages)[0]) => {
      if (page.s3PngKey) {
        s3KeysToDelete.push(page.s3PngKey);
      }
      if (page.s3ThumbKey) {
        s3KeysToDelete.push(page.s3ThumbKey);
      }
    });
  });

  // Delete S3 files first (before database records)
  if (s3KeysToDelete.length > 0) {
    await deleteObjects(s3KeysToDelete);
  }

  // Delete all related data in a transaction
  // Order matters: delete in reverse dependency order to avoid foreign key conflicts
  await prisma.$transaction(
    async (
      tx: Omit<
        PrismaClient,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
      >
    ) => {
      // 1. Delete QuestionBank entries (published questions) for this chapter
      await tx.questionBank.deleteMany({
        where: { chapterId },
      });

      // 2. Delete Uploads for this chapter (cascades to pages, questions, attempts)
      await tx.upload.deleteMany({
        where: { chapterId },
      });

      // 3. Delete any remaining Questions directly linked to this chapter
      await tx.question.deleteMany({
        where: { chapterId },
      });

      // 4. Delete the chapter itself
      await tx.chapter.delete({
        where: { id: chapterId },
      });
    }
  );
}
