import { Router } from "express";
import requireAuth from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";
import { requeuePageGeneration, regeneratePage } from "./generation.controller";

const router = Router();

router.post("/requeue", requireAuth, catchAsync(requeuePageGeneration as any));
router.post("/regenerate-page", requireAuth, catchAsync(regeneratePage as any));

export const GenerationRoutes = router;

export default GenerationRoutes;
