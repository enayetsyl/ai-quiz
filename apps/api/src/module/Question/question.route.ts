import { Router } from "express";
import * as ctrl from "./question.controller";
import requireAuth from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";
import validateZod from "../../middleware/validateZod";
import validation from "./question.validation";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get questions with filters
router.get(
  "/",
  validateZod({ query: validation.questionFilterSchema }),
  catchAsync(ctrl.getQuestions)
);

// Get single question
router.get("/:id", catchAsync(ctrl.getQuestion));

// Update question
router.patch(
  "/:id",
  validateZod({ body: validation.updateQuestionSchema }),
  catchAsync(ctrl.updateQuestion)
);

// Delete question
router.delete("/:id", catchAsync(ctrl.deleteQuestion));

// Bulk actions
router.post(
  "/bulk-action",
  validateZod({ body: validation.bulkActionSchema }),
  catchAsync(ctrl.bulkActionQuestions)
);

export default router;
