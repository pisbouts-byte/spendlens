import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as plaidController from "../controllers/plaid.controller.js";

const router: RouterType = Router();

// Webhook is public (called by Plaid)
router.post("/webhooks", plaidController.handleWebhook);

// All other routes require auth
router.use(requireAuth);

router.post("/create-link-token", plaidController.createLinkToken);
router.post("/exchange-token", plaidController.exchangeToken);
router.post("/sync/:itemId", plaidController.syncTransactions);
router.post("/sync-all", plaidController.syncAll);
router.get("/accounts", plaidController.getAccounts);
router.delete("/items/:itemId", plaidController.removeItem);

export default router;
