import { Router, type Router as RouterType } from "express";
import { UpdatePlaidAccountSettingsSchema } from "@spendlens/shared";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import * as plaidController from "../controllers/plaid.controller.js";

const router: RouterType = Router();

// Webhook is public (called by Plaid)
router.post("/webhooks", plaidController.handleWebhook);

// All other routes require auth
router.use(requireAuth);

router.post("/create-link-token", plaidController.createLinkToken);
router.post("/create-update-link-token/:itemId", plaidController.createUpdateLinkToken);
router.post("/exchange-token", plaidController.exchangeToken);
router.post("/reconnect/:itemId", plaidController.reconnectItem);
router.post("/sync/:itemId", plaidController.syncTransactions);
router.post("/sync-all", plaidController.syncAll);
router.get("/accounts", plaidController.getAccounts);
router.patch(
  "/accounts/:id",
  validateRequest({ body: UpdatePlaidAccountSettingsSchema }),
  plaidController.updateAccountSettings,
);
router.get("/sync-logs", plaidController.getSyncLogs);
router.delete("/items/:itemId", plaidController.removeItem);

export default router;
