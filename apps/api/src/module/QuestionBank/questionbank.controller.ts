import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth";
import * as svc from "./questionbank.service";
import * as v from "./questionbank.validation";
import { sendResponse } from "../../lib/http";
import { escapeHtml } from "./questionbank.utils";

export async function getQuestionBank(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const filters = v.questionBankFilterSchema.parse(req.query);
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
  const { questionIds } = v.publishQuestionsSchema.parse(req.body);
  const userId = req.user?.id;

  const result = await svc.publishQuestionsToBank(questionIds, userId);
  return sendResponse(res, {
    success: true,
    data: result,
    message: `${result.published} question(s) published to Question Bank`,
    status: 201,
  });
}

export async function exportQuestionBank(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const query = v.exportQuerySchema.parse(req.query);
  const items = await svc.fetchQuestionBankForExport({
    ids: query.ids,
    filters: {
      classId: query.classId,
      subjectId: query.subjectId,
      chapterId: query.chapterId,
      pageId: query.pageId,
      language: query.language,
      difficulty: query.difficulty,
    },
  });

  const filenameBase = `question_bank_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;

  const htmlHeader =
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Question Bank</title></head><body>";
  const htmlFooter = "</body></html>";
  const block = (label: string, value: string) =>
    `<p><strong>${label}:</strong> ${value ? value.replace(/\n/g, "<br/>") : ""}</p>`;
  const html = items
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
  res.setHeader("Content-Type", "application/msword; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filenameBase}.doc\"`);
  return res.send(`<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Question Bank</title></head><body>${html}</body></html>`);
}

export default {
  getQuestionBank,
  getQuestionBankItem,
  publishQuestions,
  exportQuestionBank,
};
