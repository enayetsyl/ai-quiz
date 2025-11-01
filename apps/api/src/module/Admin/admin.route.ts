import { Router } from "express";
import * as controller from "./admin.controller";
import requireAuth from "../../middleware/auth";
import requireAdmin from "../../middleware/requireAdmin";
import catchAsync from "../../utils/catchAsync";

const router = Router();

// All routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard stats
router.get("/dashboard/stats", catchAsync(controller.getDashboardStats));

// Page generation attempts
router.get(
  "/page-generation-attempts",
  catchAsync(controller.getPageGenerationAttempts)
);

// LLM usage events
router.get("/llm-usage-events", catchAsync(controller.getLlmUsageEvents));

// Pages information
router.get("/pages", catchAsync(controller.getPages));

// API tokens
router.get("/api-tokens", catchAsync(controller.getApiTokens));

export const AdminRoutes = router;
export default AdminRoutes;
