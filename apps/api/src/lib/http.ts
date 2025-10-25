import { Response } from "express";

export type SendResponseOptions<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { message: string; code?: string } | null;
  meta?: Record<string, any> | null;
  status?: number;
};

export function sendResponse<T = any>(
  res: Response,
  opts: SendResponseOptions<T>
) {
  const {
    success,
    data = null,
    message = undefined,
    error = null,
    meta = null,
    status = success ? 200 : 400,
  } = opts;
  const payload: Record<string, any> = { success };
  if (message !== undefined) payload.message = message;
  if (data !== null) payload.data = data;
  if (error !== null) payload.error = error;
  if (meta !== null) payload.meta = meta;
  return res.status(status).json(payload);
}

export class HttpError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode = 400, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export const isHttpError = (err: unknown): err is HttpError => {
  return (
    typeof err === "object" && err !== null && "statusCode" in (err as any)
  );
};
