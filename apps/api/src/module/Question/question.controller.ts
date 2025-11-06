import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth";
import * as svc from "./question.service";
import * as v from "./question.validation";
import { sendResponse, HttpError } from "../../lib/http";
import { publishQuestionsToBank } from "../QuestionBank/questionbank.service";

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
    return sendResponse(res, {
      success: true,
      data: result,
      message: `${result.published} question(s) published to Question Bank`,
    });
  }

  const result = await svc.bulkActionQuestions(parsed, userId);
  
  // Generate appropriate message based on action
  let message = `Bulk action completed: ${parsed.action}`;
  if (parsed.action === "approve") {
    if (result.published !== undefined && result.published > 0) {
      message = `${result.updated || result.published} question(s) approved and published to Question Bank`;
      if (result.publishError) {
        message += ` (Note: ${result.publishError})`;
      }
    } else {
      message = `${result.updated || 0} question(s) approved`;
    }
  } else if (parsed.action === "reject") {
    message = `${result.deleted || 0} question(s) rejected and deleted`;
  } else if (parsed.action === "delete") {
    message = `${result.deleted || 0} question(s) deleted`;
  } else if (parsed.action === "needs_fix") {
    message = `${result.updated || 0} question(s) marked as needs fix`;
  }
  
  return sendResponse(res, {
    success: true,
    data: result,
    message,
  });
}

export default {
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  bulkActionQuestions,
};
