import client from "./client.ts";
import { getApiUrl } from "./config.ts";
import type {
  ApiResponse,
  PaginatedResponse,
  Transaction,
  UpdateTransactionInput,
  BulkUpdateTransactionsInput,
} from "@spendlens/shared";

export interface TransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  isExcluded?: "true" | "false" | "all";
  search?: string;
  sortBy?: "date" | "amount" | "merchantName";
  sortOrder?: "asc" | "desc";
}

export type TransactionListResponse = PaginatedResponse<Transaction> & {
  uncategorizedTotal: number;
};

export async function getTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionListResponse> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
  );
  const { data } = await client.get<TransactionListResponse>(
    "/transactions",
    { params },
  );
  return data;
}

export async function getTransaction(id: string): Promise<Transaction> {
  const { data } = await client.get<ApiResponse<Transaction>>(
    `/transactions/${id}`,
  );
  return data.data;
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const { data } = await client.patch<ApiResponse<Transaction>>(
    `/transactions/${id}`,
    input,
  );
  return data.data;
}

export async function bulkUpdateTransactions(
  input: BulkUpdateTransactionsInput,
): Promise<{ updated: number }> {
  const { data } = await client.patch<ApiResponse<{ updated: number }>>(
    "/transactions/bulk",
    input,
  );
  return data.data;
}

export async function categorizeTransactions(
  transactionIds: string[],
): Promise<{ transactionId: string; categoryId: string; confidence: number }[]> {
  const { data } = await client.post<
    ApiResponse<{ transactionId: string; categoryId: string; confidence: number }[]>
  >("/transactions/categorize", { transactionIds });
  return data.data;
}

export async function categorizeAllUncategorized(): Promise<{ categorized: number; total: number }> {
  const { data } = await client.post<
    ApiResponse<{ categorized: number; total: number }>
  >("/transactions/categorize-all");
  return data.data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await client.delete(`/transactions/${id}`);
}

export async function bulkDeleteTransactions(transactionIds: string[]): Promise<{ deleted: number }> {
  const { data } = await client.post<ApiResponse<{ deleted: number }>>(
    "/transactions/bulk-delete",
    { transactionIds },
  );
  return data.data;
}

export async function applyRules(): Promise<{ applied: number }> {
  const { data } = await client.post<ApiResponse<{ applied: number }>>(
    "/transactions/apply-rules",
  );
  return data.data;
}

export function getExportUrl(filters: TransactionFilters = {}): string {
  const params = new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
    ),
  );
  return `${getApiUrl()}/transactions/export?${params.toString()}`;
}
