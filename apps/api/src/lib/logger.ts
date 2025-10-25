import pino from "pino";
import type { Logger } from "pino";
import type { Request, Response, NextFunction } from "express";

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.*",
    ],
    censor: "[REDACTED]",
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: { colorize: true, ignore: "pid,hostname" },
        }
      : undefined,
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  res.on("finish", () => {
    const diff = process.hrtime(start);
    const ms = diff[0] * 1e3 + diff[1] / 1e6;
    logger.info(
      {
        endpoint: `${req.method} ${req.originalUrl}`,
        responseTime: Number(ms.toFixed(2)),
      },
      "request completed"
    );
  });
  next();
}
