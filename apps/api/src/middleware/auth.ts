import { Request, Response, NextFunction } from "express";
import jwtLib from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: any;
}

export function requireAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[jwtLib.cookieNames.access];
    if (!token) return next(new Error("Unauthorized"));
    const payload = jwtLib.verifyAccessToken(token) as any;
    req.user = payload;
    return next();
  } catch (err) {
    return next(err);
  }
}

export default requireAuth;

