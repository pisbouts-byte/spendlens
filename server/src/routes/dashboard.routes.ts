import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as dashboardController from "../controllers/dashboard.controller.js";

const router: RouterType = Router();

router.use(requireAuth);

router.get("/summary", dashboardController.getSummary);
router.get("/spending-by-category", dashboardController.getSpendingByCategory);
router.get("/spending-over-time", dashboardController.getSpendingOverTime);
router.get("/top-merchants", dashboardController.getTopMerchants);
router.get("/recent-transactions", dashboardController.getRecentTransactions);

export default router;
