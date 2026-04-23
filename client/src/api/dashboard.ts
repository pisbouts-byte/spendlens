import client from "./client.ts";

export interface DashboardSummary {
  totalSpent: string;
  totalIncome: string;
  netCashFlow: string;
  transactionCount: number;
  connectedAccounts: number;
  categorizedPercentage: number;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: string;
  count: number;
  percentage: number;
}

export interface SpendingOverTime {
  period: string;
  total: string;
  income: string;
}

export interface TopMerchant {
  merchantName: string;
  total: string;
  count: number;
  categoryName: string | null;
}

export interface RecentTransaction {
  id: string;
  date: string;
  merchantName: string | null;
  originalName: string;
  amount: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
}

interface DateParams {
  startDate?: string;
  endDate?: string;
}

export async function getSummary(params?: DateParams): Promise<DashboardSummary> {
  const { data } = await client.get("/dashboard/summary", { params });
  return data.data;
}

export async function getSpendingByCategory(
  params?: DateParams,
): Promise<SpendingByCategory[]> {
  const { data } = await client.get("/dashboard/spending-by-category", { params });
  return data.data;
}

export async function getSpendingOverTime(
  params?: DateParams & { granularity?: "daily" | "weekly" | "monthly" },
): Promise<SpendingOverTime[]> {
  const { data } = await client.get("/dashboard/spending-over-time", { params });
  return data.data;
}

export async function getTopMerchants(
  params?: DateParams & { limit?: number },
): Promise<TopMerchant[]> {
  const { data } = await client.get("/dashboard/top-merchants", { params });
  return data.data;
}

export async function getRecentTransactions(
  limit?: number,
): Promise<RecentTransaction[]> {
  const { data } = await client.get("/dashboard/recent-transactions", {
    params: limit ? { limit } : undefined,
  });
  return data.data;
}
