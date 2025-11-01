import { Router } from "express";
import validateZod from "../../middleware/validateZod";
import validation from "./user.validation";
import controller from "./user.controller";
import catchAsync from "../../utils/catchAsync";
import requireAuth from "../../middleware/auth";

const router = Router();

router.post(
  "/register",
  validateZod({ body: validation.registerSchema }),
  catchAsync(controller.register)
);
router.post(
  "/login",
  validateZod({ body: validation.loginSchema }),
  catchAsync(controller.login)
);
router.post("/logout", catchAsync(controller.logout));
router.post("/refresh", catchAsync(controller.refresh));
router.post(
  "/forgot-password",
  validateZod({ body: validation.forgotPasswordSchema }),
  catchAsync(controller.forgotPassword)
);
router.post(
  "/reset-password",
  validateZod({ body: validation.resetPasswordSchema }),
  catchAsync(controller.resetPassword)
);
router.get("/me", requireAuth, catchAsync(controller.getMe));

export const UserRoutes = router;

export default UserRoutes;
