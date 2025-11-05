import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { logger, requestLogger } from "./lib/logger";
import { sendResponse, HttpError } from "./lib/http";
import errorHandler from "./middleware/errorHandler";
import routes from "./routes";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration - must come before other middleware that sets headers
// replace your whitelist/origin block with:
const whitelist = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "https://ai-quiz-mocha.vercel.app", // your Vercel prod domain
  "https://quiz-generation.shafayet.me", // if you serve any web from API host
]);

app.use((req, _res, next) => {
  console.log("Origin header:", req.headers.origin, "→", req.method, req.path);
  next();
});

app.use(
  cors({
    origin: (
      _origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void
    ) => cb(null, true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
    optionsSuccessStatus: 204,
  })
);

// Ensure preflight is handled
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
// parse cookies for auth flows
app.use(cookieParser());

// Minimal logging middleware: log only endpoint, responseTime, and message
app.use(requestLogger);

// simple health endpoint
app.get("/healthz", (req, res) => {
  return sendResponse(res, {
    success: true,
    data: { status: "The status is Ok" },
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
