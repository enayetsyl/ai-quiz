import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth";
import * as svc from "./question.service";
import * as v from "./question.validation";
import { sendResponse, HttpError } from "../../lib/http";
import { publishQuestionsToBank } from "../QuestionBank/questionbank.service";
import { questionExportQuerySchema } from "./question.validation";

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

  const filenameBase = `questions_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;

  // Word-compatible .doc via HTML
  const htmlHeader =
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Questions</title></head><body>";
  const htmlFooter = "</body></html>";
  const block = (label: string, value: string) =>
    `<p><strong>${label}:</strong> ${value ? value.replace(/\n/g, "<br/>") : ""}</p>`;
  const section = items
    .map(
      (q, idx) =>
        `<div style=\"margin-bottom:20px;\">` +
        `<h3 style=\"margin:0 0 8px 0;\">${idx + 1}. ${escapeHtml(q.stem)}</h3>` +
        block("A", escapeHtml(q.optionA)) +
        block("B", escapeHtml(q.optionB)) +
        block("C", escapeHtml(q.optionC)) +
        block("D", escapeHtml(q.optionD)) +
        (query.variant === "full"
          ?
            block("Correct", escapeHtml(q.correctOption.toUpperCase())) +
            block("Explanation", escapeHtml(q.explanation)) +
            block(
              "Taxonomy",
              `${escapeHtml(q.class?.displayName || "")} / ${escapeHtml(q.subject?.name || "")} / ${escapeHtml(q.chapter?.name || "")}`
            )
          : "") +
        `</div>`
    )
    .join("");
  const html = htmlHeader + section + htmlFooter;
  res.setHeader("Content-Type", "application/msword; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filenameBase}.doc\"`);
  return res.send(html);
}

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default {
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  bulkActionQuestions,
  exportQuestions,
};
