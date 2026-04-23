import { Router, type Router as RouterType } from "express";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import settingsRoutes from "./settings.routes.js";
import plaidRoutes from "./plaid.routes.js";
import transactionRoutes from "./transaction.routes.js";
import budgetRoutes from "./budget.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import recurringRoutes from "./recurring.routes.js";

const router: RouterType = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/settings", settingsRoutes);
router.use("/plaid", plaidRoutes);
router.use("/transactions", transactionRoutes);
router.use("/budgets", budgetRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/recurring", recurringRoutes);

export default router;
