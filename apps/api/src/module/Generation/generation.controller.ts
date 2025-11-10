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
  const { pageId } = req.body as { pageId: string };

  await service.regeneratePage(pageId);

  return sendResponse(res, {
    success: true,
    message: "Page regeneration enqueued",
  });
};

export const regenerateChapter = async (req: Request, res: Response) => {
  const { chapterId } = req.body as { chapterId: string };

  const result = await service.regenerateChapter(chapterId);

  return sendResponse(res, {
    success: true,
    message: `Chapter regeneration enqueued for ${result.pagesCount} page(s)`,
    data: result,
  });
};

export default { requeuePageGeneration, regeneratePage, regenerateChapter };
