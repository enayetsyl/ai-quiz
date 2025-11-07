import { Router } from "express";
import requireAuth from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";
import { requeuePageGeneration, regeneratePage, regenerateChapter } from "./generation.controller";

const router = Router();

router.post("/requeue", requireAuth, catchAsync(requeuePageGeneration as any));
router.post("/regenerate-page", requireAuth, catchAsync(regeneratePage as any));
router.post("/regenerate-chapter", requireAuth, catchAsync(regenerateChapter as any));

export const GenerationRoutes = router;

export default GenerationRoutes;
