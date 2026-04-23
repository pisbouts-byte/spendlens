import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

interface DashboardSummary {
  totalSpent: string;
  totalIncome: string;
  netCashFlow: string;
  transactionCount: number;
  connectedAccounts: number;
  categorizedPercentage: number;
}

interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: string;
  count: number;
  percentage: number;
}

interface SpendingOverTime {
  period: string;
  total: string;
  income: string;
}

interface TopMerchant {
  merchantName: string;
  total: string;
  count: number;
  categoryName: string | null;
}

interface RecentTransaction {
  id: string;
  date: string;
  merchantName: string | null;
  originalName: string;
  amount: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
}

export async function getDashboardSummary(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<DashboardSummary> {
  const dateFilter = buildDateFilter(startDate, endDate);

  const [spentAgg, incomeAgg, txnCount, accountCount, categorizedCount, totalTxnCount] =
    await Promise.all([
      // Total spent (positive amounts = expenses in Plaid)
      prisma.transaction.aggregate({
        where: { userId, isExcluded: false, amount: { gt: 0 }, ...dateFilter },
        _sum: { amount: true },
      }),
      // Total income (negative amounts = income in Plaid)
      prisma.transaction.aggregate({
        where: { userId, isExcluded: false, amount: { lt: 0 }, ...dateFilter },
        _sum: { amount: true },
      }),
      // Transaction count
      prisma.transaction.count({
        where: { userId, isExcluded: false, ...dateFilter },
      }),
      // Connected accounts
      prisma.plaidAccount.count({
        where: { plaidItem: { userId, status: "ACTIVE" } },
      }),
      // Categorized count
      prisma.transaction.count({
        where: { userId, isExcluded: false, categoryId: { not: null }, ...dateFilter },
      }),
      // Total (for percentage)
      prisma.transaction.count({
        where: { userId, isExcluded: false, ...dateFilter },
      }),
    ]);

  const totalSpent = spentAgg._sum.amount?.toNumber() ?? 0;
  const totalIncome = Math.abs(incomeAgg._sum.amount?.toNumber() ?? 0);
  const categorizedPct =
    totalTxnCount > 0 ? Math.round((categorizedCount / totalTxnCount) * 100) : 0;

  return {
    totalSpent: totalSpent.toFixed(2),
    totalIncome: totalIncome.toFixed(2),
    netCashFlow: (totalIncome - totalSpent).toFixed(2),
    transactionCount: txnCount,
    connectedAccounts: accountCount,
    categorizedPercentage: categorizedPct,
  };
}

export async function getSpendingByCategory(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<SpendingByCategory[]> {
  const dateFilter = buildDateFilter(startDate, endDate);

  const results = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, isExcluded: false, amount: { gt: 0 }, ...dateFilter },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  // Fetch category details
  const categoryIds = results
    .map((r) => r.categoryId)
    .filter((id): id is string => id != null);

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const grandTotal = results.reduce(
    (sum, r) => sum + (r._sum.amount?.toNumber() ?? 0),
    0,
  );

  return results.map((r) => {
    const cat = r.categoryId ? categoryMap.get(r.categoryId) : null;
    const total = r._sum.amount?.toNumber() ?? 0;
    return {
      categoryId: r.categoryId || "uncategorized",
      categoryName: cat?.name || "Uncategorized",
      categoryColor: cat?.color || "#94a3b8",
      categoryIcon: cat?.icon || "Tag",
      total: total.toFixed(2),
      count: r._count.id,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 1000) / 10 : 0,
    };
  });
}

export async function getSpendingOverTime(
  userId: string,
  startDate?: string,
  endDate?: string,
  granularity: "daily" | "weekly" | "monthly" = "monthly",
): Promise<SpendingOverTime[]> {
  const dateFilter = buildDateFilter(startDate, endDate);

  // Use raw query for date truncation
  const truncFn =
    granularity === "daily"
      ? "DATE(date)"
      : granularity === "weekly"
        ? "DATE_TRUNC('week', date)"
        : "DATE_TRUNC('month', date)";

  const rows = await prisma.$queryRawUnsafe<
    { period: Date; expenses: number; income: number }[]
  >(
    `SELECT ${truncFn} as period,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as expenses,
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as income
     FROM "Transaction"
     WHERE "userId" = $1
       AND "isExcluded" = false
       ${startDate ? `AND date >= $2` : ""}
       ${endDate ? `AND date <= $${startDate ? 3 : 2}` : ""}
     GROUP BY ${truncFn}
     ORDER BY period ASC`,
    userId,
    ...(startDate ? [new Date(startDate)] : []),
    ...(endDate ? [new Date(endDate)] : []),
  );

  return rows.map((r) => ({
    period: new Date(r.period).toISOString().split("T")[0],
    total: Number(r.expenses).toFixed(2),
    income: Number(r.income).toFixed(2),
  }));
}

export async function getTopMerchants(
  userId: string,
  startDate?: string,
  endDate?: string,
  limit = 10,
): Promise<TopMerchant[]> {
  const dateFilter = buildDateFilter(startDate, endDate);

  const results = await prisma.transaction.groupBy({
    by: ["merchantName", "categoryId"],
    where: {
      userId,
      isExcluded: false,
      amount: { gt: 0 },
      merchantName: { not: null },
      ...dateFilter,
    },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });

  const categoryIds = results
    .map((r) => r.categoryId)
    .filter((id): id is string => id != null);

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  return results.map((r) => ({
    merchantName: r.merchantName || "Unknown",
    total: (r._sum.amount?.toNumber() ?? 0).toFixed(2),
    count: r._count.id,
    categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? null) : null,
  }));
}

export async function getRecentTransactions(
  userId: string,
  limit = 5,
): Promise<RecentTransaction[]> {
  const txns = await prisma.transaction.findMany({
    where: { userId, isExcluded: false },
    orderBy: { date: "desc" },
    take: limit,
    include: { category: true },
  });

  return txns.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    merchantName: t.merchantName,
    originalName: t.originalName,
    amount: t.amount.toString(),
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
    categoryIcon: t.category?.icon ?? null,
  }));
}

function buildDateFilter(
  startDate?: string,
  endDate?: string,
): { date?: Prisma.DateTimeFilter } {
  if (!startDate && !endDate) {
    // Default: current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { date: { gte: monthStart, lte: monthEnd } };
  }

  const filter: Prisma.DateTimeFilter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return { date: filter };
}
