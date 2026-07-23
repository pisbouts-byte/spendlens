import { useCallback, useEffect, useState } from "react";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "../components/ui/Button.tsx";
import { Spinner } from "../components/ui/Spinner.tsx";
import { getApiUrl } from "../api/config.ts";
import * as dashboardApi from "../api/dashboard.ts";
import * as settingsApi from "../api/settings.ts";
import type {
  SpendingByCategory,
  SpendingOverTime,
  TopMerchant,
} from "../api/dashboard.ts";

type Period = "week" | "month" | "quarter" | "year";

function getPeriodDates(period: Period, offset: number, weekStartDay: number): { startDate: string; endDate: string; label: string } {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  switch (period) {
    case "week": {
      const dayOfWeek = now.getDay();
      let diff = dayOfWeek - weekStartDay;
      if (diff < 0) diff += 7;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);

      start = new Date(weekStart);
      start.setDate(start.getDate() + offset * 7);
      end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      label = `${startLabel} – ${endLabel}`;
      break;
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      break;
    }
    case "quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const totalMonths = currentQuarter * 3 + offset * 3;
      const startMonth = ((totalMonths % 12) + 12) % 12;
      const yearOffset = Math.floor(totalMonths / 12);
      start = new Date(now.getFullYear() + yearOffset, startMonth, 1);
      end = new Date(start.getFullYear(), start.getMonth() + 3, 0);

      const qNum = Math.floor(start.getMonth() / 3) + 1;
      label = `Q${qNum} ${start.getFullYear()}`;
      break;
    }
    case "year":
    default: {
      const year = now.getFullYear() + offset;
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      label = `${year}`;
      break;
    }
  }

  // Don't let end date go beyond today
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (end > today) end = today;

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    label,
  };
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [weekStartDay, setWeekStartDay] = useState(1); // default Monday until settings load
  const [isLoading, setIsLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<(Omit<SpendingByCategory, "total"> & { total: number })[]>([]);
  const [timeData, setTimeData] = useState<{ period: string; total: number; income: number }[]>([]);
  const [merchants, setMerchants] = useState<(Omit<TopMerchant, "total"> & { total: number })[]>([]);

  useEffect(() => {
    settingsApi.getSettings().then((s) => setWeekStartDay(s.weekStartDay)).catch(() => {});
  }, []);

  function handlePeriodChange(newPeriod: Period) {
    setPeriod(newPeriod);
    setOffset(0);
  }

  const { startDate, endDate, label: periodLabel } = getPeriodDates(period, offset, weekStartDay);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { startDate, endDate };
      const granularity =
        period === "year" ? "monthly" :
        period === "quarter" ? "weekly" :
        "daily";

      const [catData, tData, mData] = await Promise.all([
        dashboardApi.getSpendingByCategory(params),
        dashboardApi.getSpendingOverTime({ ...params, granularity }),
        dashboardApi.getTopMerchants({ ...params, limit: 15 }),
      ]);

      setCategoryData(catData.map((c) => ({ ...c, total: parseFloat(c.total) || 0 })));
      setTimeData(tData.map((t) => ({ ...t, total: parseFloat(t.total) || 0, income: parseFloat(t.income) || 0 })));
      setMerchants(mData.map((m) => ({ ...m, total: parseFloat(m.total) || 0 })));
    } catch {
      // empty state
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport() {
    const token = localStorage.getItem("spendlens_token");
    const base = getApiUrl();
    window.open(
      `${base}/transactions/export?startDate=${startDate}&endDate=${endDate}&token=${token}`,
      "_blank",
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalSpent = categoryData.reduce((s, c) => s + c.total, 0);
  const totalIncome = timeData.reduce((s, t) => s + t.income, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Analyze your spending patterns
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(["week", "month", "quarter", "year"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  period === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p === "week"
                  ? "Wk"
                  : p === "month"
                    ? "Mo"
                    : p === "quarter"
                      ? "Qtr"
                      : "Yr"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={handleExport} className="hidden sm:inline-flex">
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setOffset((o) => o - 1)}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="min-w-[180px] text-center text-sm font-semibold text-gray-700 sm:text-base">
          {periodLabel}
        </span>
        <button
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= 0}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        {offset !== 0 && (
          <button
            onClick={() => setOffset(0)}
            className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            Today
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Spending
          </p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Income
          </p>
          <p className="mt-1.5 text-2xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>
      </div>

      {/* Spending Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-900">Spending Trend</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Total: {formatCurrency(totalSpent)}
        </p>
        {timeData.length > 0 ? (
          <div className="mt-4 h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => {
                    const d = new Date(String(v));
                    return period === "year"
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
                    formatCurrency(Number(value)),
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
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Spending"
                  stroke="#6366f1"
                  fill="url(#spendGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#22c55e"
                  fill="url(#incomeGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Category + Merchant row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">
            Spending by Category
          </h2>
          {categoryData.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="mx-auto flex-shrink-0">
                <PieChart width={180} height={180} className="sm:hidden">
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="categoryName"
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={entry.categoryColor}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
                <PieChart width={224} height={224} className="hidden sm:block">
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="categoryName"
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={entry.categoryColor}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {categoryData.map((cat) => (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span className="text-gray-600">{cat.categoryName}</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.categoryColor,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-400">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Top Merchants Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">Top Merchants</h2>
          {merchants.length > 0 ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={merchants.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="merchantName"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Spent",
                    ]}
                  />
                  <Bar
                    dataKey="total"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Detailed Table */}
      {categoryData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">
            Category Summary
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4 text-right">Amount</th>
                  <th className="pb-2 pr-4 text-right">Transactions</th>
                  <th className="pb-2 pr-4 text-right">Avg per Txn</th>
                  <th className="pb-2 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categoryData.map((cat) => {
                  const avg =
                    cat.count > 0
                      ? cat.total / cat.count
                      : 0;
                  return (
                    <tr key={cat.categoryId}>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.categoryColor }}
                          />
                          <span className="font-medium text-gray-700">
                            {cat.categoryName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium text-gray-900">
                        {formatCurrency(cat.total)}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-500">
                        {cat.count}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-500">
                        {formatCurrency(avg)}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {cat.percentage}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-200 font-semibold">
                  <td className="pt-2.5 pr-4 text-gray-900">Total</td>
                  <td className="pt-2.5 pr-4 text-right text-gray-900">
                    {formatCurrency(totalSpent)}
                  </td>
                  <td className="pt-2.5 pr-4 text-right text-gray-700">
                    {categoryData.reduce((s, c) => s + c.count, 0)}
                  </td>
                  <td className="pt-2.5 pr-4 text-right text-gray-700">
                    {formatCurrency(
                      totalSpent /
                        Math.max(
                          1,
                          categoryData.reduce((s, c) => s + c.count, 0),
                        ),
                    )}
                  </td>
                  <td className="pt-2.5 text-right text-gray-700">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-gray-400">No data for this period</p>
    </div>
  );
}
