import { Router, type Router as RouterType } from "express";
import {
  UpdateTransactionSchema,
  BulkUpdateTransactionsSchema,
  BulkDeleteTransactionsSchema,
  TransactionQuerySchema,
} from "@spendlens/shared";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/auth.js";
import * as transactionController from "../controllers/transaction.controller.js";

const router: RouterType = Router();

router.use(requireAuth);

router.get(
  "/",
  validateRequest({ query: TransactionQuerySchema }),
  transactionController.getTransactions,
);

router.get("/export", transactionController.exportTransactions);

router.patch(
  "/bulk",
  validateRequest({ body: BulkUpdateTransactionsSchema }),
  transactionController.bulkUpdate,
);

router.post(
  "/bulk-delete",
  validateRequest({ body: BulkDeleteTransactionsSchema }),
  transactionController.bulkDelete,
);

router.get("/:id", transactionController.getTransaction);

router.patch(
  "/:id",
  validateRequest({ body: UpdateTransactionSchema }),
  transactionController.updateTransaction,
);

router.delete("/:id", transactionController.deleteTransaction);

router.post("/categorize", transactionController.categorize);
router.post("/categorize-all", transactionController.categorizeAll);

export default router;
