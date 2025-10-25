import { Router } from "express";
import catchAsync from "../../utils/catchAsync";
import controller from "./settings.controller";
import requireAuth from "../../middleware/auth";

const router = Router();

router.get("/", requireAuth, catchAsync(controller.getSettings));
router.patch("/", requireAuth, catchAsync(controller.patchSettings));

export const SettingsRoutes = router;
export default SettingsRoutes;
