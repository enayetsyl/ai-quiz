import { NextFunction, Request, Response } from "express";
import { HttpError, isHttpError, sendResponse } from "../lib/http";
import { logger } from "../lib/logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If response already sent, delegate to default handler
  if (res.headersSent) return next(err);

  if (isHttpError(err)) {
    const httpErr = err as HttpError;
    const payloadError = { message: httpErr.message, code: httpErr.code };
    if (httpErr.statusCode >= 500) {
      logger.error(
        { err: httpErr, path: req.path, method: req.method },
        "Server error"
      );
    } else {
      logger.info(
        { err: httpErr, path: req.path, method: req.method },
        "Client error"
      );
    }
    return sendResponse(res, {
      success: false,
      message: httpErr.message,
      error: payloadError,
      status: httpErr.statusCode,
    });
  }

  // Unknown error
  const unknownError =
    err instanceof Error ? err : new Error("Internal Server Error");
  logger.error(
    { err: unknownError, path: req.path, method: req.method },
    "Unhandled error"
  );
  return sendResponse(res, {
    success: false,
    message: "Internal Server Error",
    error: { message: unknownError.message },
    status: 500,
  });
}

export default errorHandler;
