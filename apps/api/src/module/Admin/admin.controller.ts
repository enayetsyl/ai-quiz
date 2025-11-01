import { Request, Response } from "express";
import { sendResponse } from "../../lib/http";
import * as service from "./admin.service";
import { AuthRequest } from "../../middleware/auth";

export async function getPageGenerationAttempts(
  req: AuthRequest,
  res: Response
) {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    pageSize: req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : undefined,
    pageId: req.query.pageId as string | undefined,
    model: req.query.model as string | undefined,
    isSuccess:
      req.query.isSuccess !== undefined
        ? req.query.isSuccess === "true"
        : undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const result = await service.getPageGenerationAttempts(filters);
  return sendResponse(res, {
    success: true,
    data: result,
  });
}

export async function getLlmUsageEvents(req: AuthRequest, res: Response) {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    pageSize: req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : undefined,
    pageId: req.query.pageId as string | undefined,
    model: req.query.model as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const result = await service.getLlmUsageEvents(filters);
  return sendResponse(res, {
    success: true,
    data: result,
  });
}

export async function getPages(req: AuthRequest, res: Response) {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    pageSize: req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : undefined,
    pageId: req.query.pageId as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const result = await service.getPages(filters);
  return sendResponse(res, {
    success: true,
    data: result,
  });
}

export async function getApiTokens(req: AuthRequest, res: Response) {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    pageSize: req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const result = await service.getApiTokens(filters);
  return sendResponse(res, {
    success: true,
    data: result,
  });
}

export async function getDashboardStats(_req: AuthRequest, res: Response) {
  const stats = await service.getAdminDashboardStats();
  return sendResponse(res, {
    success: true,
    data: stats,
  });
}
