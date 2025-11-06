import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth";
import * as svc from "./questionbank.service";
import { z } from "zod";
import { sendResponse } from "../../lib/http";

const questionBankFilterSchema = z.object({
  classId: z.coerce.number().int().min(1).max(10).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  language: z.enum(["bn", "en"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export async function getQuestionBank(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const filters = questionBankFilterSchema.parse(req.query);
  const data = await svc.listQuestionBank(filters);
  return sendResponse(res, { success: true, data });
}

export async function getQuestionBankItem(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const itemId = req.params.id;
  const data = await svc.getQuestionBankById(itemId);
  return sendResponse(res, { success: true, data });
}

export async function publishQuestions(
  req: AuthRequest,
  res: Response,
  _next: NextFunction
) {
  const { questionIds } = z
    .object({ questionIds: z.array(z.string().uuid()).min(1) })
    .parse(req.body);
  const userId = req.user?.id;

  const result = await svc.publishQuestionsToBank(questionIds, userId);
  return sendResponse(res, {
    success: true,
    data: result,
    message: `${result.published} question(s) published to Question Bank`,
    status: 201,
  });
}

export default {
  getQuestionBank,
  getQuestionBankItem,
  publishQuestions,
};
