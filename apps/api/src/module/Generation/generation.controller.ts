import { Request, Response } from "express";
import { sendResponse } from "../../lib/http";
import * as service from "./generation.service";

export const requeuePageGeneration = async (req: Request, res: Response) => {
  const { pageId } = req.body as { pageId: string };

  await service.requeuePageGeneration(pageId);

  return sendResponse(res, {
    success: true,
    message: "Page generation requeued",
  });
};

export const regeneratePage = async (req: Request, res: Response) => {
  const { pageId, prompt } = req.body as { pageId: string; prompt?: string };

  await service.regeneratePage(pageId, prompt);

  return sendResponse(res, {
    success: true,
    message: "Page regeneration enqueued",
  });
};

export const regenerateChapter = async (req: Request, res: Response) => {
  const { chapterId, prompt } = req.body as { chapterId: string; prompt?: string };

  const result = await service.regenerateChapter(chapterId, prompt);

  return sendResponse(res, {
    success: true,
    message: `Chapter regeneration enqueued for ${result.pagesCount} page(s)`,
    data: result,
  });
};

export default { requeuePageGeneration, regeneratePage, regenerateChapter };
