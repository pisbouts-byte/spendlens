import { Router, type Router as RouterType } from "express";
import {
  CreateCashFlowItemSchema,
  UpdateCashFlowItemSchema,
  UpsertCashFlowOverrideSchema,
  UpdateBillsBalanceSchema,
  ForecastQuerySchema,
  MarkPaymentSchema,
} from "@spendlens/shared";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/auth.js";
import * as cashflowController from "../controllers/cashflow.controller.js";

const router: RouterType = Router();

router.use(requireAuth);

router.get(
  "/forecast",
  validateRequest({ query: ForecastQuerySchema }),
  cashflowController.getForecast,
);

router.get("/balance", cashflowController.getBalance);
router.put(
  "/balance",
  validateRequest({ body: UpdateBillsBalanceSchema }),
  cashflowController.updateBalance,
);

router.get("/items", cashflowController.getItems);

router.post(
  "/items",
  validateRequest({ body: CreateCashFlowItemSchema }),
  cashflowController.createItem,
);

router.patch(
  "/items/:id",
  validateRequest({ body: UpdateCashFlowItemSchema }),
  cashflowController.updateItem,
);

router.delete("/items/:id", cashflowController.deleteItem);

router.put(
  "/items/:id/overrides",
  validateRequest({ body: UpsertCashFlowOverrideSchema }),
  cashflowController.upsertOverride,
);

router.delete("/items/:id/overrides/:periodKey", cashflowController.deleteOverride);

router.post(
  "/items/:id/payments",
  validateRequest({ body: MarkPaymentSchema }),
  cashflowController.markPaid,
);

router.delete("/items/:id/payments/:occurrenceDate", cashflowController.unmarkPaid);

export default router;
