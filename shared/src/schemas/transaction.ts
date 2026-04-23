import { z } from "zod";

export const UpdateTransactionSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  isExcluded: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const BulkUpdateTransactionsSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1).max(100),
  categoryId: z.string().uuid().nullable().optional(),
  isExcluded: z.boolean().optional(),
});

export const TransactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  isExcluded: z.enum(["true", "false", "all"]).default("all"),
  search: z.string().optional(),
  sortBy: z.enum(["date", "amount", "merchantName"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const BulkDeleteTransactionsSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1).max(500),
});

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type BulkUpdateTransactionsInput = z.infer<typeof BulkUpdateTransactionsSchema>;
export type BulkDeleteTransactionsInput = z.infer<typeof BulkDeleteTransactionsSchema>;
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;
