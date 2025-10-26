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

    // create page rows and enqueue per-page processing tasks by adding jobs for page rasterization
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

      // rasterize single page (synchronously here for simplicity)
      const outPrefix = path.join(tmpDir, `page-${p}`);
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

const worker = new Worker(
  "rasterize",
  async (job) => {
    if (job.name === "analyze_and_rasterize")
      return handleAnalyzeAndRasterize(job);
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
