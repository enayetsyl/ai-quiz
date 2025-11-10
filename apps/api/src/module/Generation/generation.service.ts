import queue from "../../lib/queue";
import prisma from "../../lib";
import { HttpError } from "../../lib/http";

export async function enqueuePageGeneration(pageId: string) {
  await queue.generationQueue.add(
    "generate:page",
    { pageId },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
  );
}

export async function requeuePageGeneration(pageId: string) {
  if (!pageId) {
    throw new HttpError("pageId is required", 400);
  }

  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) {
    throw new HttpError("Page not found", 404);
  }

  await enqueuePageGeneration(pageId);
}

export async function regeneratePage(pageId: string) {
  if (!pageId) {
    throw new HttpError("pageId is required", 400);
  }

  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) {
    throw new HttpError("Page not found", 404);
  }

  // Delete existing questions for this page (hard-replace)
  await prisma.question.deleteMany({ where: { pageId } });

  // Enqueue page generation which will send to LLM and create new questions
  await enqueuePageGeneration(pageId);
}

export async function regenerateChapter(chapterId: string) {
  if (!chapterId) {
    throw new HttpError("chapterId is required", 400);
  }

  // Verify chapter exists
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) {
    throw new HttpError("Chapter not found", 404);
  }

  // Find all pages that belong to uploads of this chapter
  const uploads = await prisma.upload.findMany({
    where: { chapterId },
    select: { id: true },
  });

  const uploadIds = uploads.map((u) => u.id);

  if (uploadIds.length === 0) {
    throw new HttpError("No uploads found for this chapter", 404);
  }

  // Find all pages in these uploads
  const pages = await prisma.page.findMany({
    where: { uploadId: { in: uploadIds } },
    select: { id: true },
  });

  if (pages.length === 0) {
    throw new HttpError("No pages found for this chapter", 404);
  }

  // Delete all existing questions for this chapter (hard-replace)
  await prisma.question.deleteMany({ where: { chapterId } });

  // Enqueue generation for all pages in this chapter
  // This will send each page to LLM and generate new questions
  for (const page of pages) {
    await enqueuePageGeneration(page.id);
  }

  return { pagesCount: pages.length };
}

export default {
  enqueuePageGeneration,
  requeuePageGeneration,
  regeneratePage,
  regenerateChapter,
};
