import express from "express";
import helmet from "helmet";
import { logger, requestLogger } from "./lib/logger";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

// Minimal logging middleware: log only endpoint, responseTime, and message
app.use(requestLogger);

// simple health endpoint
app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

// example router placeholder
app.get("/", (req, res) => {
  res.json({ message: "Quiz Tuition API" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export default app;
