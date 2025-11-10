import { Request } from "express";
import { AdminFilters } from "./admin.types";

/**
 * Parses Express request query parameters into AdminFilters
 */
export function parseAdminFilters(req: Request): AdminFilters {
  return {
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
}

