import dotenv from "dotenv";
dotenv.config();
import { Worker, Job } from "bullmq";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import util from "util";
import sharp from "sharp";
import { downloadToBuffer, uploadBuffer } from "../lib/s3";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { generationQueue } from "../lib/queue";
import IORedis from "ioredis";

const PROMPT_VERSION = process.env.PROMPT_VERSION || "v1";

const execFilePromise = util.promisify(execFile);

async function runPdfInfo(localPath: string): Promise<number> {
  const { stdout } = await execFilePromise("pdfinfo", [localPath]);
  const match = stdout.match(/Pages:\s+(\d+)/i);
  if (!match) throw new Error("Could not determine page count from pdfinfo");
  return Number(match[1]);
}

async function pdftoppmPage(
  localPath: string,
  outPrefix: string,
  page: number
) {
  // Use higher resolution (400 DPI) for better Bengali character recognition
  // Bengali characters like ন/ম, র/ড়/ঢ়, ত/ৎ/থ need higher resolution to distinguish
  await execFilePromise("pdftoppm", [
    "-r",
    "400", // Increased from 300 to 400 for better Bengali OCR accuracy
    "-png",
    "-f",
    String(page),
    "-l",
    String(page),
    localPath,
    outPrefix,
  ]);
}

async function handleAnalyzeAndRasterize(job: Job) {
  const { uploadId, s3PdfKey } = job.data as {
    uploadId: string;
    s3PdfKey: string;
  };
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `upload-${uploadId}-`)
  );
  try {
    logger.info({ uploadId }, "Starting analyze_and_rasterize");
    const pdfBuffer = await downloadToBuffer(s3PdfKey);

    // validate PDF signature
    try {
      const header = pdfBuffer.slice(0, 5).toString("utf8");
      if (!header.startsWith("%PDF")) {
        await prisma.upload.update({
          where: { id: uploadId },
          data: { fileMeta: { invalidPdf: true } as any },
        });
        throw new Error("Downloaded file is not a valid PDF");
      }
    } catch (err) {
      logger.error({ uploadId, err }, "Invalid PDF");
      throw err;
    }
    const localPdfPath = path.join(tmpDir, "original.pdf");
    await fs.writeFile(localPdfPath, pdfBuffer);

    const pages = await runPdfInfo(localPdfPath);
    if (pages > 100) {
      await prisma.upload.update({
        where: { id: uploadId },
        data: { pagesCount: pages },
      });
      await prisma.upload.update({
        where: { id: uploadId },
        data: { fileMeta: { tooManyPages: true } as any },
      });
      throw new Error(
        `PDF has ${pages} pages which exceeds the 100 page limit`
      );
    }

    // update pagesCount
    await prisma.upload.update({
      where: { id: uploadId },
      data: { pagesCount: pages },
    });

    // create page rows and process pages sequentially, logging attempts on failure
    for (let p = 1; p <= pages; p++) {
      // Use upsert to handle cases where page might already exist (e.g., job retry)
      // If page exists, reset status to "queued" to retry processing
      const pageRow = await prisma.page.upsert({
        where: {
          uploadId_pageNumber: {
            uploadId,
            pageNumber: p,
          },
        },
        update: {
          status: "queued" as any, // Reset status for retry
          s3PngKey: "", // Reset in case we need to regenerate
          s3ThumbKey: "", // Reset in case we need to regenerate
        },
        create: {
          uploadId,
          pageNumber: p,
          status: "queued" as any,
          s3PngKey: "",
          s3ThumbKey: "",
        },
      });

      const outPrefix = path.join(tmpDir, `page-${p}`);
      const pageStart = Date.now();
      try {
        // rasterize single page
        await pdftoppmPage(localPdfPath, outPrefix, p);

        // pdftoppm generates files with zero-padded page numbers (e.g., page-9-000009.png)
        // Find the actual generated file
        const dirFiles = await fs.readdir(tmpDir);
        const pngFile = dirFiles.find(
          (f) => f.startsWith(`page-${p}-`) && f.endsWith(".png")
        );
        if (!pngFile) {
          throw new Error(
            `PNG file not found for page ${p}. Expected pattern: page-${p}-*.png`
          );
        }
        const pngPath = path.join(tmpDir, pngFile);
        let pngBuffer = await fs.readFile(pngPath);

        // Enhance image for better Bengali OCR: increase contrast and sharpen
        // This helps distinguish similar Bengali characters (ন vs ম, র vs ড়, etc.)
        const enhancedBuffer = await sharp(pngBuffer)
          .normalize() // Improve contrast
          .sharpen({ sigma: 1.5 }) // Sharpen edges for better character definition
          .png({ quality: 100 }) // Maximum quality
          .toBuffer();
        pngBuffer = Buffer.from(enhancedBuffer);

        const pngKey = `uploads/${uploadId}/pages/${p}.png`;
        await uploadBuffer(pngBuffer, pngKey, "image/png");

        // create thumbnail as JPEG
        const thumbBuffer = await sharp(pngBuffer)
          .resize({ width: 400 })
          .jpeg({ quality: 80 })
          .toBuffer();
        const thumbKey = `uploads/${uploadId}/pages/${p}_thumb.jpg`;
        await uploadBuffer(thumbBuffer, thumbKey, "image/jpeg");

        // record success attempt
        const lastAttempt = await prisma.pageGenerationAttempt.findFirst({
          where: { pageId: pageRow.id },
          orderBy: { attemptNo: "desc" },
        });
        const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
        await prisma.pageGenerationAttempt.create({
          data: {
            pageId: pageRow.id,
            attemptNo,
            model: "rasterize",
            isSuccess: true,
            promptVersion: PROMPT_VERSION,
          } as any,
        });

        logger.info(
          { uploadId, page: p, durationMs: Date.now() - pageStart },
          "Page rasterized"
        );

        // Automatically enqueue LLM generation after successful rasterization
        await generationQueue.add(
          "generate:page",
          { pageId: pageRow.id },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          }
        );

        // Update page with S3 keys and set status to "queued" for LLM generation
        await prisma.page.update({
          where: { id: pageRow.id },
          data: {
            s3PngKey: pngKey,
            s3ThumbKey: thumbKey,
            status: "queued" as any, // Queued for LLM generation
            lastGeneratedAt: new Date(),
          },
        });
        logger.info(
          { uploadId, page: p, pageId: pageRow.id },
          "LLM generation enqueued"
        );
      } catch (err: any) {
        // log attempt
        const lastAttempt = await prisma.pageGenerationAttempt.findFirst({
          where: { pageId: pageRow.id },
          orderBy: { attemptNo: "desc" },
        });
        const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
        await prisma.pageGenerationAttempt.create({
          data: {
            pageId: pageRow.id,
            attemptNo,
            model: "rasterize",
            isSuccess: false,
            errorMessage: err?.message ?? String(err),
            promptVersion: PROMPT_VERSION,
          } as any,
        });
        await prisma.page.update({
          where: { id: pageRow.id },
          data: { status: "failed" as any },
        });
        logger.error({ uploadId, page: p, err }, "Page rasterization failed");
        // continue to next page
      }
    }

    logger.info({ uploadId, pages }, "Rasterization complete");
  } finally {
    // cleanup
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ err }, "Failed to cleanup temp dir");
    }
  }
}

async function handleRasterizePage(job: Job) {
  const { uploadId, s3PdfKey, pageNumber, pageId } = job.data as {
    uploadId: string;
    s3PdfKey: string;
    pageNumber: number;
    pageId: string;
  };
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `rpage-${uploadId}-${pageNumber}-`)
  );
  try {
    logger.info({ uploadId, page: pageNumber }, "Starting rasterize_page");
    const pdfBuffer = await downloadToBuffer(s3PdfKey);
    const localPdfPath = path.join(tmpDir, "original.pdf");
    await fs.writeFile(localPdfPath, pdfBuffer);

    // rasterize single page
    const outPrefix = path.join(tmpDir, `page-${pageNumber}`);
    const pageStart = Date.now();
    try {
      await pdftoppmPage(localPdfPath, outPrefix, pageNumber);

      // pdftoppm generates files with zero-padded page numbers (e.g., page-9-000009.png)
      // Find the actual generated file
      const dirFiles = await fs.readdir(tmpDir);
      const pngFile = dirFiles.find(
        (f) => f.startsWith(`page-${pageNumber}-`) && f.endsWith(".png")
      );
      if (!pngFile) {
        throw new Error(
          `PNG file not found for page ${pageNumber}. Expected pattern: page-${pageNumber}-*.png`
        );
      }
      const pngPath = path.join(tmpDir, pngFile);
      let pngBuffer = await fs.readFile(pngPath);

      // Enhance image for better Bengali OCR: increase contrast and sharpen
      // This helps distinguish similar Bengali characters (ন vs ম, র vs ড়, etc.)
      const enhancedBuffer = await sharp(pngBuffer)
        .normalize() // Improve contrast
        .sharpen({ sigma: 1.5 }) // Sharpen edges for better character definition
        .png({ quality: 100 }) // Maximum quality
        .toBuffer();
      pngBuffer = Buffer.from(enhancedBuffer);

      const pngKey = `uploads/${uploadId}/pages/${pageNumber}.png`;
      await uploadBuffer(pngBuffer, pngKey, "image/png");

      const thumbBuffer = await sharp(pngBuffer)
        .resize({ width: 400 })
        .jpeg({ quality: 80 })
        .toBuffer();
      const thumbKey = `uploads/${uploadId}/pages/${pageNumber}_thumb.jpg`;
      await uploadBuffer(thumbBuffer, thumbKey, "image/jpeg");

      const lastAttempt = await prisma.pageGenerationAttempt.findFirst({
        where: { pageId },
        orderBy: { attemptNo: "desc" },
      });
      const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
      await prisma.pageGenerationAttempt.create({
        data: {
          pageId,
          attemptNo,
          model: "rasterize",
          isSuccess: true,
          promptVersion: PROMPT_VERSION,
        } as any,
      });

      logger.info(
        { uploadId, page: pageNumber, durationMs: Date.now() - pageStart },
        "Rasterize page complete"
      );

      // Automatically enqueue LLM generation after successful rasterization
      await generationQueue.add(
        "generate:page",
        { pageId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        }
      );

      // Update page with S3 keys and set status to "queued" for LLM generation
      await prisma.page.update({
        where: { id: pageId },
        data: {
          s3PngKey: pngKey,
          s3ThumbKey: thumbKey,
          status: "queued" as any, // Queued for LLM generation
          lastGeneratedAt: new Date(),
        },
      });
      logger.info(
        { uploadId, page: pageNumber, pageId },
        "LLM generation enqueued"
      );
    } catch (err: any) {
      const lastAttempt = await prisma.pageGenerationAttempt.findFirst({
        where: { pageId },
        orderBy: { attemptNo: "desc" },
      });
      const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
      await prisma.pageGenerationAttempt.create({
        data: {
          pageId,
          attemptNo,
          model: "rasterize",
          isSuccess: false,
          errorMessage: err?.message ?? String(err),
          promptVersion: PROMPT_VERSION,
        } as any,
      });
      await prisma.page.update({
        where: { id: pageId },
        data: { status: "failed" as any },
      });
      logger.error(
        { uploadId, page: pageNumber, err },
        "Rasterize page failed"
      );
    }
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ err }, "Failed to cleanup temp dir for page job");
    }
  }
}

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

const worker = new Worker(
  "rasterize",
  async (job) => {
    if (job.name === "analyze_and_rasterize")
      return handleAnalyzeAndRasterize(job);
    if (job.name === "rasterize_page") return handleRasterizePage(job);
    return;
  },
  {
    connection: connection,
  }
);

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Rasterize job failed");
});

export default worker;
