import { Router, type Router as RouterType } from "express";
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from "@spendlens/shared";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/auth.js";
import * as authController from "../controllers/auth.controller.js";

const router: RouterType = Router();

router.post(
  "/register",
  validateRequest({ body: RegisterSchema }),
  authController.register,
);

router.post(
  "/login",
  validateRequest({ body: LoginSchema }),
  authController.login,
);

router.post(
  "/forgot-password",
  validateRequest({ body: ForgotPasswordSchema }),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest({ body: ResetPasswordSchema }),
  authController.resetPassword,
);

router.get("/me", requireAuth, authController.getMe);

export default router;
