import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { HttpError } from "../lib/http";

export function requireAdminOrApprover(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new HttpError("Unauthorized", 401));
  }

  if (req.user.role !== "admin" && req.user.role !== "approver") {
    return next(new HttpError("Forbidden: Admin or Approver access required", 403));
  }

  return next();
}

export default requireAdminOrApprover;

