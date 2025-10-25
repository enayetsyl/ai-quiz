import { RequestHandler } from "express";

export function catchAsync(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next as any);
  };
}

export default catchAsync;
