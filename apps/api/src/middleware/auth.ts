import { Request, Response, NextFunction } from "express";
import jwtLib from "../lib/jwt";
import { HttpError } from "../lib/http";

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
    if (!token) {
      return next(
        new HttpError("Unauthorized: No access token", 401, "unauthorized")
      );
    }
    const payload = jwtLib.verifyAccessToken(token) as any;
    req.user = payload;
    return next();
  } catch (err) {
    if (err instanceof HttpError) {
      return next(err);
    }
    return next(
      new HttpError("Unauthorized: Invalid token", 401, "invalid_token")
    );
  }
}

export default requireAuth;
