import { Router, type Router as RouterType } from "express";
import { UpdateSettingsSchema } from "@spendlens/shared";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/auth.js";
import * as settingsController from "../controllers/settings.controller.js";

const router: RouterType = Router();

router.use(requireAuth);

router.get("/", settingsController.getSettings);

router.patch(
  "/",
  validateRequest({ body: UpdateSettingsSchema }),
  settingsController.updateSettings,
);

export default router;
