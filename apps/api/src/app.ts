import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { logger, requestLogger } from "./lib/logger";
import { sendResponse, HttpError } from "./lib/http";
import errorHandler from "./middleware/errorHandler";
import routes from "./routes";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
// parse cookies for auth flows
app.use(cookieParser());

// CORS whitelist (simple custom middleware to avoid adding external dependency)
const whitelist = ["http://localhost:3000"];
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  // allow requests with no origin (curl, mobile apps)
  if (!origin || whitelist.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,Accept,Origin"
    );
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  }
  return sendResponse(res, {
    success: false,
    message: "Not allowed by CORS",
    error: { message: "Origin not allowed" },
    status: 403,
  });
});

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

// Mount API routes under /api/v1
app.use("/api/v1", routes);

// 404 handler
app.use((req, res, next) => {
  // create a structured 404 error to be handled by error middleware
  next(new HttpError("Not Found", 404, "not_found"));
});

// Global error handler (must come after all routes/middleware)
app.use(errorHandler);

export default app;
