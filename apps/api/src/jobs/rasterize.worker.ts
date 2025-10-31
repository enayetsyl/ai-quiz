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
  // create single-page PNG using -f and -l
  await execFilePromise("pdftoppm", [
    "-r",
    "300",
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
      const pageRow = await prisma.page.create({
        data: {
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
        const pngPath = `${outPrefix}-${p}.png`;
        const pngBuffer = await fs.readFile(pngPath);

        const pngKey = `uploads/${uploadId}/pages/${p}.png`;
        await uploadBuffer(pngBuffer, pngKey, "image/png");

        // create thumbnail as JPEG
        const thumbBuffer = await sharp(pngBuffer)
          .resize({ width: 400 })
          .jpeg({ quality: 80 })
          .toBuffer();
        const thumbKey = `uploads/${uploadId}/pages/${p}_thumb.jpg`;
        await uploadBuffer(thumbBuffer, thumbKey, "image/jpeg");

        await prisma.page.update({
          where: { id: pageRow.id },
          data: {
            s3PngKey: pngKey,
            s3ThumbKey: thumbKey,
            status: "complete" as any,
            lastGeneratedAt: new Date(),
          },
        });

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
      const pngPath = `${outPrefix}-${pageNumber}.png`;
      const pngBuffer = await fs.readFile(pngPath);

      const pngKey = `uploads/${uploadId}/pages/${pageNumber}.png`;
      await uploadBuffer(pngBuffer, pngKey, "image/png");

      const thumbBuffer = await sharp(pngBuffer)
        .resize({ width: 400 })
        .jpeg({ quality: 80 })
        .toBuffer();
      const thumbKey = `uploads/${uploadId}/pages/${pageNumber}_thumb.jpg`;
      await uploadBuffer(thumbBuffer, thumbKey, "image/jpeg");

      await prisma.page.update({
        where: { id: pageId },
        data: {
          s3PngKey: pngKey,
          s3ThumbKey: thumbKey,
          status: "complete" as any,
          lastGeneratedAt: new Date(),
        },
      });

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

const worker = new Worker(
  "rasterize",
  async (job) => {
    if (job.name === "analyze_and_rasterize")
      return handleAnalyzeAndRasterize(job);
    if (job.name === "rasterize_page") return handleRasterizePage(job);
    return;
  },
  {
    connection: {
      host: process.env.REDIS_URL || "127.0.0.1",
      port: 6379,
    } as any,
  }
);

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Rasterize job failed");
});

export default worker;
