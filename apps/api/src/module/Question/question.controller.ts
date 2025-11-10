import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth";
import * as svc from "./question.service";
import * as v from "./question.validation";
import { sendResponse } from "../../lib/http";
import { publishQuestionsToBank } from "../QuestionBank/questionbank.service";
import { questionExportQuerySchema } from "./question.validation";
import { generateBulkActionMessage } from "./question.utils";

export async function getQuestions(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const filters = v.questionFilterSchema.parse(req.query);
  const result = await svc.listQuestions(filters);
  return sendResponse(res, {
    success: true,
    data: result.data,
    meta: { pagination: result.pagination },
  });
}

export async function getQuestion(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const questionId = req.params.id;
  const data = await svc.getQuestionById(questionId);
  return sendResponse(res, { success: true, data });
}

export async function updateQuestion(
  req: AuthRequest,
  res: Response,
  _next: NextFunction
) {
  const questionId = req.params.id;
  const parsed = v.updateQuestionSchema.parse(req.body);
  const userId = req.user?.id;

  const data = await svc.updateQuestion(questionId, parsed, userId);
  return sendResponse(res, { success: true, data });
}

export async function deleteQuestion(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const questionId = req.params.id;
  await svc.deleteQuestion(questionId);
  return sendResponse(res, { success: true, status: 204 });
}

export async function bulkActionQuestions(
  req: AuthRequest,
  res: Response,
  _next: NextFunction
) {
  const parsed = v.bulkActionSchema.parse(req.body);
  const userId = req.user?.id;

  // If action is "publish", delegate to QuestionBank service
  if (parsed.action === "publish") {
    const result = await publishQuestionsToBank(parsed.questionIds, userId);
    const message = generateBulkActionMessage(parsed.action, result);
    return sendResponse(res, {
      success: true,
      data: result,
      message,
    });
  }

  const result = await svc.bulkActionQuestions(parsed, userId);
  const message = generateBulkActionMessage(parsed.action, result);

  return sendResponse(res, {
    success: true,
    data: result,
    message,
  });
}

export async function exportQuestions(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const query = questionExportQuerySchema.parse(req.query);
  const items = await svc.fetchQuestionsForExport({
    ids: query.ids,
    filters: {
      classId: query.classId,
      subjectId: query.subjectId,
      chapterId: query.chapterId,
      pageId: query.pageId,
      status: query.status,
      language: query.language,
      difficulty: query.difficulty,
    },
  });

  const exportResult = svc.generateQuestionsExportHtml(items, {
    variant: query.variant,
  });

  res.setHeader("Content-Type", exportResult.contentType);
  res.setHeader("Content-Disposition", `attachment; filename=\"${exportResult.filename}\"`);
  return res.send(exportResult.html);
}

export default {
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  bulkActionQuestions,
  exportQuestions,
};
