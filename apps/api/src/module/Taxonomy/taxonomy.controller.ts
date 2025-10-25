import { Request, Response, NextFunction } from "express";
import * as svc from "./taxonomy.service";
import * as v from "./taxonomy.validation";
import { sendResponse, HttpError } from "../../lib/http";

export async function getClasses(
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const data = await svc.listClasses();
  return sendResponse(res, { success: true, data });
}

export async function postClass(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const parsed = v.createClassSchema.parse(req.body);
  const created = await svc.createClass(parsed);
  return sendResponse(res, { success: true, data: created, status: 201 });
}

export async function putClass(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new HttpError("Invalid class id", 400);
  const parsed = v.updateClassSchema.parse(req.body);
  const updated = await svc.updateClass(id, parsed as any);
  return sendResponse(res, { success: true, data: updated });
}

export async function delClass(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new HttpError("Invalid class id", 400);
  await svc.deleteClass(id);
  return sendResponse(res, { success: true, status: 204 });
}

export async function getSubjects(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const data = await svc.listSubjects(classId);
  return sendResponse(res, { success: true, data });
}

export async function postSubject(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const parsed = v.createSubjectSchema.parse(req.body);
  const created = await svc.createSubject(parsed);
  return sendResponse(res, { success: true, data: created, status: 201 });
}

export async function putSubject(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const id = req.params.id as string;
  const parsed = v.updateSubjectSchema.parse(req.body);
  const updated = await svc.updateSubject(id, parsed as any);
  return sendResponse(res, { success: true, data: updated });
}

export async function delSubject(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const id = req.params.id as string;
  await svc.deleteSubject(id);
  return sendResponse(res, { success: true, status: 204 });
}

export async function getChapters(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const subjectId = req.query.subjectId as string | undefined;
  const data = await svc.listChapters(subjectId);
  return sendResponse(res, { success: true, data });
}

export async function postChapter(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const parsed = v.createChapterSchema.parse(req.body);
  const created = await svc.createChapter(parsed);
  return sendResponse(res, { success: true, data: created, status: 201 });
}

export async function putChapter(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const id = req.params.id as string;
  const parsed = v.updateChapterSchema.parse(req.body);
  const updated = await svc.updateChapter(id, parsed as any);
  return sendResponse(res, { success: true, data: updated });
}

export async function delChapter(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const id = req.params.id as string;
  await svc.deleteChapter(id);
  return sendResponse(res, { success: true, status: 204 });
}
