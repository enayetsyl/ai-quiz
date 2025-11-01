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

  // Delete existing questions for hard-replace
  await prisma.question.deleteMany({ where: { pageId } });
  await enqueuePageGeneration(pageId);

  return sendResponse(res, {
    success: true,
    message: "Page regeneration enqueued",
  });
};

export default { requeuePageGeneration, regeneratePage };
