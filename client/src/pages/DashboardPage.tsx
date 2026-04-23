import { useCallback, useEffect, useState } from "react";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  CreditCard,
  Tag,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.ts";
import { Spinner } from "../components/ui/Spinner.tsx";
import * as dashboardApi from "../api/dashboard.ts";
import type {
  DashboardSummary,
  SpendingByCategory,
  SpendingOverTime,
  TopMerchant,
  RecentTransaction,
} from "../api/dashboard.ts";

type DateRange = "month" | "week" | "year";

function getDateRange(range: DateRange): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  let start: Date;

  switch (range) {
    case "week": {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    }
    case "year": {
      start = new Date(now.getFullYear(), 0, 1);
      break;
    }
    case "month":
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
  }

  return { startDate: start.toISOString().split("T")[0], endDate };
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCurrencyFull(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>("month");
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categorySpending, setCategorySpending] = useState<(Omit<SpendingByCategory, "total"> & { total: number })[]>([]);
  const [spendingOverTime, setSpendingOverTime] = useState<{ period: string; total: number; income: number }[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [recentTxns, setRecentTxns] = useState<RecentTransaction[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = getDateRange(range);
      const granularity = range === "year" ? "monthly" : "daily";

      const [summaryData, categoryData, timeData, merchantData, recentData] =
        await Promise.all([
          dashboardApi.getSummary(params),
          dashboardApi.getSpendingByCategory(params),
          dashboardApi.getSpendingOverTime({ ...params, granularity }),
          dashboardApi.getTopMerchants({ ...params, limit: 8 }),
          dashboardApi.getRecentTransactions(5),
        ]);

      setSummary(summaryData);
      // Convert string totals to numbers for Recharts
      setCategorySpending(categoryData.map((c) => ({ ...c, total: parseFloat(c.total) || 0 })));
      setSpendingOverTime(timeData.map((t) => ({ ...t, total: parseFloat(t.total) || 0, income: parseFloat(t.income) || 0 })));
      setTopMerchants(merchantData);
      setRecentTxns(recentData);
    } catch {
      // Silently handle - empty state shown
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const netPositive = parseFloat(summary?.netCashFlow ?? "0") >= 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 self-start">
          {(["week", "month", "year"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r === "week" ? "7D" : r === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          label="Total Spent"
          value={formatCurrency(summary?.totalSpent ?? "0")}
          bgColor="bg-red-50"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          label="Total Income"
          value={formatCurrency(summary?.totalIncome ?? "0")}
          bgColor="bg-green-50"
        />
        <SummaryCard
          icon={
            <DollarSign
              className={`h-5 w-5 ${netPositive ? "text-green-500" : "text-red-500"}`}
            />
          }
          label="Net Cash Flow"
          value={formatCurrency(summary?.netCashFlow ?? "0")}
          bgColor={netPositive ? "bg-green-50" : "bg-red-50"}
          valueColor={netPositive ? "text-green-700" : "text-red-700"}
        />
        <SummaryCard
          icon={<ArrowRightLeft className="h-5 w-5 text-brand-500" />}
          label="Transactions"
          value={String(summary?.transactionCount ?? 0)}
          bgColor="bg-brand-50"
          subtitle={`${summary?.categorizedPercentage ?? 0}% categorized`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        {/* Spending Over Time */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-gray-900">Spending Over Time</h2>
          {spendingOverTime.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => {
                      const d = new Date(String(v));
                      return range === "year"
                        ? d.toLocaleDateString("en-US", { month: "short" })
                        : d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrencyFull(Number(value)),
                      name === "total" ? "Spending" : "Income",
                    ]}
                    labelFormatter={(label) =>
                      new Date(String(label)).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="total"
                    name="Spending"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No spending data for this period" />
          )}
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">By Category</h2>
          {categorySpending.length > 0 ? (
            <div className="mt-4">
              <div className="flex justify-center py-2">
                <PieChart width={180} height={180}>
                  <Pie
                    data={categorySpending.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="categoryName"
                  >
                    {categorySpending.slice(0, 8).map((entry) => (
                      <Cell key={entry.categoryId} fill={entry.categoryColor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrencyFull(Number(value))}
                  />
                </PieChart>
              </div>
              <div className="mt-2 space-y-1.5">
                {categorySpending.slice(0, 5).map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.categoryColor }}
                      />
                      <span className="text-gray-600">{cat.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No category data" />
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Top Merchants */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">Top Merchants</h2>
          {topMerchants.length > 0 ? (
            <div className="mt-3 space-y-2">
              {topMerchants.map((m, i) => {
                const maxTotal = parseFloat(topMerchants[0].total);
                const pct =
                  maxTotal > 0 ? (parseFloat(m.total) / maxTotal) * 100 : 0;
                return (
                  <div key={`${m.merchantName}-${i}`}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-500">
                          {i + 1}
                        </span>
                        <span className="text-gray-700">{m.merchantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {m.count} txn{m.count !== 1 ? "s" : ""}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrencyFull(m.total)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No merchant data" />
          )}
        </div>

        {/* Recent Transactions */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <button
              onClick={() => navigate("/transactions")}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {recentTxns.length > 0 ? (
            <div className="mt-3 divide-y divide-gray-100">
              {recentTxns.map((txn) => {
                const amount = parseFloat(txn.amount);
                const isIncome = amount < 0;
                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                        style={{
                          backgroundColor: txn.categoryColor
                            ? `${txn.categoryColor}20`
                            : "#f1f5f9",
                        }}
                      >
                        {txn.categoryIcon ? (
                          <Tag className="h-4 w-4 text-gray-400" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-gray-400" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {txn.merchantName || txn.originalName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(txn.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {txn.categoryName && (
                            <>
                              {" · "}
                              <span
                                style={{
                                  color: txn.categoryColor || undefined,
                                }}
                              >
                                {txn.categoryName}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isIncome ? "text-green-600" : "text-gray-900"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrencyFull(Math.abs(amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No transactions yet" />
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  bgColor,
  valueColor,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  valueColor?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${bgColor}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-gray-500 sm:text-xs">{label}</p>
          <p className={`text-base font-bold sm:text-xl truncate ${valueColor || "text-gray-900"}`}>
            {value}
          </p>
          {subtitle && <p className="text-[10px] text-gray-400 sm:text-xs">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
