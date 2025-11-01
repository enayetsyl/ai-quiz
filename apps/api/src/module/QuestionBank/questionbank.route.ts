import { Router } from "express";
import * as ctrl from "./questionbank.controller";
import requireAuth from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get Question Bank items with filters
router.get("/", catchAsync(ctrl.getQuestionBank));

// Get single Question Bank item
router.get("/:id", catchAsync(ctrl.getQuestionBankItem));

// Publish questions to Question Bank
router.post("/publish", catchAsync(ctrl.publishQuestions));

export default router;
