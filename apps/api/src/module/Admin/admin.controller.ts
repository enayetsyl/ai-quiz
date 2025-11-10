import { Response } from "express";
import { sendResponse } from "../../lib/http";
import * as service from "./admin.service";
import { AuthRequest } from "../../middleware/auth";
import { parseAdminFilters } from "./admin.utils";

export async function getPageGenerationAttempts(
  req: AuthRequest,
  res: Response
) {
  const filters = parseAdminFilters(req);
  const result = await service.getPageGenerationAttempts(filters);
  return sendResponse(res, {
    success: true,
    data: result,
  });
}

export async function getLlmUsageEvents(req: AuthRequest, res: Response) {
  const filters = parseAdminFilters(req);
  const result = await service.getLlmUsageEvents(filters);
  return sendResponse(res, {
    success: true,
    data: result,
  });
}

export async function getPages(req: AuthRequest, res: Response) {
  const filters = parseAdminFilters(req);
  const result = await service.getPages(filters);
  return sendResponse(res, {
    success: true,
    data: result,
  });
}

export async function getApiTokens(req: AuthRequest, res: Response) {
  const filters = parseAdminFilters(req);
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
