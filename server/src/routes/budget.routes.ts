import { Router, type Router as RouterType } from "express";
import {
  CreateBudgetSchema,
  UpdateBudgetSchema,
  BudgetProgressQuerySchema,
} from "@spendlens/shared";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/auth.js";
import * as budgetController from "../controllers/budget.controller.js";

const router: RouterType = Router();

router.use(requireAuth);

router.get("/", budgetController.getBudgets);

router.get(
  "/progress",
  validateRequest({ query: BudgetProgressQuerySchema }),
  budgetController.getBudgetProgress,
);

router.post(
  "/",
  validateRequest({ body: CreateBudgetSchema }),
  budgetController.createBudget,
);

router.patch(
  "/:id",
  validateRequest({ body: UpdateBudgetSchema }),
  budgetController.updateBudget,
);

router.delete("/:id", budgetController.deleteBudget);

export default router;
