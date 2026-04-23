import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as recurringController from "../controllers/recurring.controller.js";

const router: RouterType = Router();

router.get("/", requireAuth, recurringController.getRecurringPatterns);
router.patch("/:id/dismiss", requireAuth, recurringController.dismissPattern);
router.patch("/:id/toggle", requireAuth, recurringController.togglePatternActive);
router.patch("/:id/frequency", requireAuth, recurringController.updateFrequency);

export default router;
