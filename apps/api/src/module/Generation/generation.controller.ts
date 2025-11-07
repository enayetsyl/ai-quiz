import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { sendResponse } from "../../lib/http";
import { enqueuePageGeneration } from "./generation.service";

export const requeuePageGeneration = async (req: Request, res: Response) => {
  const { pageId } = req.body as { pageId: string };

  if (!pageId) {
    return sendResponse(res, {
      success: false,
      status: 400,
      message: "pageId is required",
    });
  }

  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) {
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "Page not found",
    });
  }

  await enqueuePageGeneration(pageId);
  return sendResponse(res, {
    success: true,
    message: "Page generation requeued",
  });
};

export const regeneratePage = async (req: Request, res: Response) => {
  const { pageId } = req.body as { pageId: string };

  if (!pageId) {
    return sendResponse(res, {
      success: false,
      status: 400,
      message: "pageId is required",
    });
  }

  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) {
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "Page not found",
    });
  }

  // Delete existing questions for this page (hard-replace)
  await prisma.question.deleteMany({ where: { pageId } });
  
  // Enqueue page generation which will send to LLM and create new questions
  await enqueuePageGeneration(pageId);

  return sendResponse(res, {
    success: true,
    message: "Page regeneration enqueued",
  });
};

export const regenerateChapter = async (req: Request, res: Response) => {
  const { chapterId } = req.body as { chapterId: string };

  if (!chapterId) {
    return sendResponse(res, {
      success: false,
      status: 400,
      message: "chapterId is required",
    });
  }

  // Verify chapter exists
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) {
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "Chapter not found",
    });
  }

  // Find all pages that belong to uploads of this chapter
  const uploads = await prisma.upload.findMany({
    where: { chapterId },
    select: { id: true },
  });

  const uploadIds = uploads.map((u) => u.id);
  
  if (uploadIds.length === 0) {
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "No uploads found for this chapter",
    });
  }

  // Find all pages in these uploads
  const pages = await prisma.page.findMany({
    where: { uploadId: { in: uploadIds } },
    select: { id: true },
  });

  if (pages.length === 0) {
    return sendResponse(res, {
      success: false,
      status: 404,
      message: "No pages found for this chapter",
    });
  }

  // Delete all existing questions for this chapter (hard-replace)
  await prisma.question.deleteMany({ where: { chapterId } });

  // Enqueue generation for all pages in this chapter
  // This will send each page to LLM and generate new questions
  for (const page of pages) {
    await enqueuePageGeneration(page.id);
  }

  return sendResponse(res, {
    success: true,
    message: `Chapter regeneration enqueued for ${pages.length} page(s)`,
    data: { pagesCount: pages.length },
  });
};

export default { requeuePageGeneration, regeneratePage, regenerateChapter };
