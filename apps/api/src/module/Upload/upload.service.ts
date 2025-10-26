import fs from "fs/promises";
import path from "path";
import { prisma } from "../../lib";
import { uploadBuffer } from "../../lib/s3";
import { rasterizeQueue } from "../../lib/queue";
import { logger } from "../../lib/logger";

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

  // create DB upload row (pagesCount will be filled by worker after pdfinfo)
  const upload = await prisma.upload.create({
    data: {
      classId: metadata.classId,
      subjectId: metadata.subjectId,
      chapterId: metadata.chapterId,
      uploadedBy: uploadedBy ?? null,
      originalFilename: originalname,
      mimeType: mimetype,
      s3Bucket: process.env.S3_BUCKET_UPLOADS as string,
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
