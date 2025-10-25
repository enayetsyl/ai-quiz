import express from "express";
import helmet from "helmet";
import { logger, requestLogger } from "./lib/logger";
import { sendResponse, HttpError } from "./lib/http";
import errorHandler from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

// Minimal logging middleware: log only endpoint, responseTime, and message
app.use(requestLogger);

// simple health endpoint
app.get("/healthz", (req, res) => {
  return sendResponse(res, {
    success: true,
    data: { status: "ok" },
    message: "ok",
  });
});

// example router placeholder
app.get("/", (req, res) => {
  return sendResponse(res, {
    success: true,
    data: { message: "Quiz Tuition API" },
    message: "Welcome",
  });
});

// 404 handler
app.use((req, res, next) => {
  // create a structured 404 error to be handled by error middleware
  next(new HttpError("Not Found", 404, "not_found"));
});

// Global error handler (must come after all routes/middleware)
app.use(errorHandler);

export default app;
