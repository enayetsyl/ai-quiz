import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { HttpError } from "../lib/http";

export function requireAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new HttpError("Unauthorized", 401));
  }

  if (req.user.role !== "admin") {
    return next(new HttpError("Forbidden: Admin access required", 403));
  }

  return next();
}

export default requireAdmin;
