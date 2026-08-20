import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type {
  CashFlowItem,
  CashFlowEvent,
  CashFlowForecast,
  CashFlowBalance,
  CreateCashFlowItemInput,
  UpdateCashFlowItemInput,
} from "@spendlens/shared";
import { CashFlowType, CashFlowFrequency } from "@spendlens/shared";
import * as cashflowApi from "../api/cashflow.ts";
import { monthlyEquivalentTotal } from "../lib/monthlyEquivalent.ts";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Spinner } from "../components/ui/Spinner.tsx";
import { useToast } from "../components/ui/Toast.tsx";

const FREQUENCY_LABELS: Record<CashFlowFrequency, string> = {
  [CashFlowFrequency.ONE_TIME]: "One-time",
  [CashFlowFrequency.WEEKLY]: "Weekly",
  [CashFlowFrequency.BIWEEKLY]: "Every 2 weeks",
  [CashFlowFrequency.MONTHLY]: "Monthly",
  [CashFlowFrequency.QUARTERLY]: "Quarterly",
  [CashFlowFrequency.SEMIANNUALLY]: "Every 6 months",
  [CashFlowFrequency.YEARLY]: "Yearly",
};

const SNAPSHOT_LABELS: Record<string, string> = {
  endOfMonth: "End of This Month",
  endOfYear: "End of This Year",
  oneYearOut: "1 Year From Today",
};

type ChartDuration = "month" | "quarter" | "year" | "ytd" | "custom";

const DURATION_LABELS: Record<ChartDuration, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
  ytd: "Year to Date",
  custom: "Custom",
};

const DEFAULT_LOADED_MONTHS = 12;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addMonthsToKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, "0")}`;
}

function monthKeyDiff(fromKey: string, toKey: string): number {
  const [fy, fm] = fromKey.split("-").map(Number) as [number, number];
  const [ty, tm] = toKey.split("-").map(Number) as [number, number];
  return ty * 12 + (tm - 1) - (fy * 12 + (fm - 1));
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function formatSigned(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const abs = formatCurrency(Math.abs(num));
  return num < 0 ? `-${abs}` : `+${abs}`;
}

function formatDate(value: string): string {
  // value is YYYY-MM-DD; parse as UTC to avoid local-timezone off-by-one
  const d = new Date(`${value}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatMonth(monthKey: string): string {
  const d = new Date(`${monthKey}-01T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    err.response &&
    typeof err.response === "object" &&
    "data" in err.response &&
    err.response.data &&
    typeof err.response.data === "object" &&
    "message" in err.response.data
  ) {
    return String(err.response.data.message);
  }
  return fallback;
}

export function CashFlowPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
  const [incomeItems, setIncomeItems] = useState<CashFlowItem[]>([]);
  const [billItems, setBillItems] = useState<CashFlowItem[]>([]);
  const [balance, setBalance] = useState<CashFlowBalance | null>(null);

  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceAsOf, setBalanceAsOf] = useState(todayDateString());
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  const [itemModalType, setItemModalType] = useState<CashFlowType | null>(null);
  const [editingItem, setEditingItem] = useState<CashFlowItem | null>(null);
  const [overrideItem, setOverrideItem] = useState<CashFlowItem | null>(null);

  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [drilldownMonth, setDrilldownMonth] = useState<string | null>(null);

  const [duration, setDuration] = useState<ChartDuration>("year");
  const [customFrom, setCustomFrom] = useState(currentMonthKey());
  const [customTo, setCustomTo] = useState(addMonthsToKey(currentMonthKey(), DEFAULT_LOADED_MONTHS - 1));
  const [loadedMonths, setLoadedMonths] = useState(DEFAULT_LOADED_MONTHS);
  const [isExtendingRange, setIsExtendingRange] = useState(false);

  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    // Only show the full-page spinner on the very first load — refetching after an in-place
    // action (marking paid, saving an item) shouldn't unmount and reset section-local state
    // like the "This Month" selector.
    if (!hasLoadedRef.current) setIsLoading(true);
    try {
      const [f, items, bal] = await Promise.all([
        cashflowApi.getForecast(),
        cashflowApi.getItems(),
        cashflowApi.getBalance(),
      ]);
      setForecast(f);
      setLoadedMonths(DEFAULT_LOADED_MONTHS);
      setIncomeItems(items.filter((i) => i.type === CashFlowType.INCOME));
      setBillItems(items.filter((i) => i.type === CashFlowType.BILL));
      setBalance(bal);
      setBalanceAmount(bal.balance ?? "");
      setBalanceAsOf(bal.asOf ?? todayDateString());
    } catch {
      toast("error", "Failed to load cash flow data");
    } finally {
      setIsLoading(false);
      hasLoadedRef.current = true;
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When the custom range extends past what's already loaded, fetch a wider forecast.
  useEffect(() => {
    if (duration !== "custom" || !forecast?.balanceConfigured) return;
    const monthsNeeded = monthKeyDiff(currentMonthKey(), customTo) + 1;
    if (monthsNeeded <= loadedMonths) return;
    const capped = Math.min(60, monthsNeeded);
    setIsExtendingRange(true);
    cashflowApi
      .getForecast(capped)
      .then((f) => {
        setForecast(f);
        setLoadedMonths(capped);
      })
      .catch(() => toast("error", "Failed to load that date range"))
      .finally(() => setIsExtendingRange(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, customTo, loadedMonths]);

  const visibleTimeline = useMemo(() => {
    if (!forecast) return [];
    switch (duration) {
      case "month":
        return forecast.timeline.slice(0, 1);
      case "quarter":
        return forecast.timeline.slice(0, 3);
      case "year":
        return forecast.timeline.slice(0, 12);
      case "ytd": {
        const year = String(new Date().getUTCFullYear());
        return forecast.timeline.filter((t) => t.month.startsWith(year));
      }
      case "custom":
        return forecast.timeline.filter((t) => t.month >= customFrom && t.month <= customTo);
      default:
        return forecast.timeline;
    }
  }, [forecast, duration, customFrom, customTo]);

  const monthlyIncomeTotal = useMemo(() => monthlyEquivalentTotal(incomeItems), [incomeItems]);
  const monthlyBillsTotal = useMemo(() => monthlyEquivalentTotal(billItems), [billItems]);
  const monthlyDiff = monthlyIncomeTotal - monthlyBillsTotal;

  async function handleSaveBalance(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) {
      toast("error", "Enter a valid balance amount");
      return;
    }
    setIsSavingBalance(true);
    try {
      await cashflowApi.updateBalance({ balance: amount, asOf: balanceAsOf });
      toast("success", "Balance updated");
      await fetchData();
    } catch (err) {
      toast("error", errorMessage(err, "Failed to update balance"));
    } finally {
      setIsSavingBalance(false);
    }
  }

  async function handleDeleteItem(item: CashFlowItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await cashflowApi.deleteItem(item.id);
      toast("success", "Deleted");
      await fetchData();
    } catch {
      toast("error", "Failed to delete");
    }
  }

  async function handleToggleActive(item: CashFlowItem) {
    try {
      await cashflowApi.updateItem(item.id, { isActive: !item.isActive });
      await fetchData();
      toast("success", item.isActive ? "Paused" : "Resumed");
    } catch {
      toast("error", "Failed to update");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cash Flow Forecast</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your Bills account balance against upcoming income and bills
        </p>
      </div>

      {/* Starting balance */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Wallet className="h-4 w-4 text-brand-600" />
          Bills Account Balance
        </div>
        {balance?.isAutoSynced ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(balance.balance ?? "0")}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Synced from linked accounts{balance.asOf ? ` · as of ${formatDate(balance.asOf)}` : ""}
              </p>
            </div>
            <Link to="/accounts" className="text-xs font-medium text-brand-600 hover:underline">
              Manage linked accounts
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSaveBalance} className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Balance ($)</label>
              <input
                type="number"
                step="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="0.00"
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">As of</label>
              <input
                type="date"
                value={balanceAsOf}
                onChange={(e) => setBalanceAsOf(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <Button type="submit" size="sm" isLoading={isSavingBalance}>
              Save
            </Button>
          </form>
        )}
        {forecast?.isStale && !balance?.isAutoSynced && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            This balance is more than a week old — the forecast may be off. Update it for an accurate picture.
          </p>
        )}
      </div>

      {forecast?.balanceConfigured && (
        <MonthlyStatusSection forecast={forecast} onChanged={fetchData} />
      )}

      {!forecast?.balanceConfigured ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-gray-500">Set your Bills account balance above to see a forecast</p>
        </div>
      ) : (
        <>
          {/* Snapshot cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {forecast.snapshots.map((s) => {
              const negative = parseFloat(s.endingBalance) < 0;
              return (
                <div
                  key={s.label}
                  className={`rounded-xl border p-4 ${negative ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {negative ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    {SNAPSHOT_LABELS[s.label] ?? s.label}
                  </div>
                  <p className={`mt-1 text-2xl font-bold ${negative ? "text-red-600" : "text-gray-900"}`}>
                    {formatCurrency(s.endingBalance)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(s.date)} · net{" "}
                    <span className={parseFloat(s.netChange) < 0 ? "text-red-500" : "text-green-600"}>
                      {formatSigned(s.netChange)}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Alerts — collapsible, collapsed by default */}
          {forecast.alerts.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50">
              <button
                type="button"
                onClick={() => setAlertsExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
                  <span className="text-sm font-semibold text-red-700">
                    {forecast.alerts.length} period{forecast.alerts.length > 1 ? "s" : ""} with insufficient
                    funds projected
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-red-500 transition-transform ${alertsExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {alertsExpanded && (
                <div className="space-y-3 border-t border-red-200 px-4 pb-4 pt-3">
                  {forecast.alerts.map((a, idx) => (
                    <div key={idx}>
                      <p className="text-sm font-semibold text-red-700">
                        {formatDate(a.startDate)}
                        {a.endDate ? ` – ${formatDate(a.endDate)}` : " onward"}
                      </p>
                      <p className="mt-0.5 text-sm text-red-600">
                        Balance may drop as low as {formatCurrency(a.lowestBalance)} on{" "}
                        {formatDate(a.lowestBalanceDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unexpected transactions — reconciled against linked accounts but didn't match a planned item */}
          {forecast.unexpectedTransactions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">
                  {forecast.unexpectedTransactions.length} unexpected transaction
                  {forecast.unexpectedTransactions.length > 1 ? "s" : ""} on linked accounts
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-600">
                These didn't match a planned income or bill, but are included in your balance.
              </p>
              <div className="mt-3 space-y-1.5 border-t border-amber-200 pt-3">
                {forecast.unexpectedTransactions.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-amber-800">
                      {e.name} · {formatDate(e.date)}
                    </span>
                    <span className={`font-medium ${e.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                      {e.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline chart */}
          {forecast.timeline.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Projected Balance — {DURATION_LABELS[duration]}
                </h2>
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
                  {(Object.keys(DURATION_LABELS) as ChartDuration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        duration === d
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {DURATION_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {duration === "custom" && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
                    <input
                      type="month"
                      value={customFrom}
                      min={currentMonthKey()}
                      max={customTo}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
                    <input
                      type="month"
                      value={customTo}
                      min={customFrom}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  {isExtendingRange && <Spinner size="sm" />}
                </div>
              )}

              <p className="mt-3 text-xs text-gray-400">Click a point on the chart for that month's details</p>
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={visibleTimeline.map((t) => ({ ...t, endingBalanceNum: parseFloat(t.endingBalance) }))}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setDrilldownMonth(String(label));
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v) => formatMonth(String(v))}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), "Balance"]}
                      labelFormatter={(label) => formatMonth(String(label))}
                    />
                    <Area
                      type="monotone"
                      dataKey="endingBalanceNum"
                      name="Balance"
                      stroke="#6366f1"
                      fill="url(#balanceGrad)"
                      strokeWidth={2}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* Income sources */}
      <ItemList
        title="Income Sources"
        type={CashFlowType.INCOME}
        items={incomeItems}
        monthlyTotal={monthlyIncomeTotal}
        onAdd={() => setItemModalType(CashFlowType.INCOME)}
        onEdit={setEditingItem}
        onOverride={setOverrideItem}
        onDelete={handleDeleteItem}
        onToggleActive={handleToggleActive}
      />

      {(monthlyIncomeTotal > 0 || monthlyBillsTotal > 0) && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            monthlyDiff >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          {monthlyDiff >= 0 ? (
            <p className="text-green-700">
              <span className="font-semibold">{formatCurrency(monthlyDiff)}/month surplus</span> — your
              recurring income covers your recurring bills with room to spare.
            </p>
          ) : (
            <p className="text-red-700">
              <span className="font-semibold">{formatCurrency(Math.abs(monthlyDiff))}/month gap</span> — your
              recurring bills exceed your recurring income by this much.
            </p>
          )}
        </div>
      )}

      {/* Bills */}
      <ItemList
        title="Bills"
        type={CashFlowType.BILL}
        items={billItems}
        monthlyTotal={monthlyBillsTotal}
        onAdd={() => setItemModalType(CashFlowType.BILL)}
        onEdit={setEditingItem}
        onOverride={setOverrideItem}
        onDelete={handleDeleteItem}
        onToggleActive={handleToggleActive}
      />

      {/* Create modal */}
      {itemModalType && (
        <ItemFormModal
          type={itemModalType}
          onClose={() => setItemModalType(null)}
          onSaved={async () => {
            setItemModalType(null);
            await fetchData();
          }}
        />
      )}

      {/* Edit modal */}
      {editingItem && (
        <ItemFormModal
          type={editingItem.type}
          editingItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            setEditingItem(null);
            await fetchData();
          }}
        />
      )}

      {/* Override modal */}
      {overrideItem && (
        <OverrideModal
          item={overrideItem}
          onClose={() => setOverrideItem(null)}
          onSaved={async () => {
            setOverrideItem(null);
            await fetchData();
          }}
        />
      )}

      {/* Month drill-down modal */}
      {drilldownMonth && forecast && (
        <MonthDrilldownModal
          monthKey={drilldownMonth}
          forecast={forecast}
          onClose={() => setDrilldownMonth(null)}
        />
      )}
    </div>
  );
}

interface MonthlyStatusSectionProps {
  forecast: CashFlowForecast;
  onChanged: () => void | Promise<void>;
}

function MonthlyStatusSection({ forecast, onChanged }: MonthlyStatusSectionProps) {
  const { toast } = useToast();
  const [statusMonth, setStatusMonth] = useState(currentMonthKey());
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const monthKeys = useMemo(() => forecast.timeline.map((t) => t.month), [forecast.timeline]);
  const minMonth = monthKeys[0];
  const maxMonth = monthKeys[monthKeys.length - 1];

  const monthEvents = useMemo(
    () =>
      forecast.events
        .filter((e) => e.date.slice(0, 7) === statusMonth)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [forecast.events, statusMonth],
  );
  const monthUnexpected = useMemo(
    () => forecast.unexpectedTransactions.filter((e) => e.date.slice(0, 7) === statusMonth),
    [forecast.unexpectedTransactions, statusMonth],
  );

  const paidCount = monthEvents.filter((e) => e.isPaid).length;
  const canGoPrev = !!minMonth && monthKeyDiff(minMonth, statusMonth) > 0;
  const canGoNext = !!maxMonth && monthKeyDiff(statusMonth, maxMonth) > 0;

  async function handleTogglePaid(event: CashFlowEvent) {
    if (event.isReconciled) return; // Plaid-driven, not manually toggleable
    const key = `${event.cashFlowItemId}|${event.date}`;
    setTogglingKey(key);
    try {
      if (event.isPaid) {
        await cashflowApi.unmarkPaid(event.cashFlowItemId, event.date);
      } else {
        await cashflowApi.markPaid(event.cashFlowItemId, event.date);
      }
      await onChanged();
    } catch {
      toast("error", "Failed to update payment status");
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => canGoPrev && setStatusMonth(addMonthsToKey(statusMonth, -1))}
            disabled={!canGoPrev}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900">{formatMonth(statusMonth)}</h2>
          <button
            onClick={() => canGoNext && setStatusMonth(addMonthsToKey(statusMonth, 1))}
            disabled={!canGoNext}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {monthEvents.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {paidCount} of {monthEvents.length} paid
          </span>
        )}
      </div>

      {monthEvents.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">Nothing due or expected this month.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {monthEvents.map((e, i) => {
            const key = `${e.cashFlowItemId}|${e.date}`;
            const isToggling = togglingKey === key;
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                <button
                  onClick={() => handleTogglePaid(e)}
                  disabled={e.isReconciled || isToggling}
                  title={
                    e.isReconciled
                      ? "Reconciled from your linked account"
                      : e.isPaid
                        ? "Mark as unpaid"
                        : "Mark as paid"
                  }
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60 ${
                    e.isPaid
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 text-transparent hover:border-gray-400"
                  } ${e.isReconciled ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-gray-900">{e.name}</span>
                    {e.isReconciled && (
                      <span className="flex-shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        Reconciled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(e.date)}</p>
                </div>
                <span
                  className={`flex-shrink-0 text-sm font-semibold ${e.type === "INCOME" ? "text-green-600" : "text-gray-900"}`}
                >
                  {e.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {monthUnexpected.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Unrecognized this month
          </h3>
          <div className="mt-2 space-y-1.5">
            {monthUnexpected.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <span className="text-amber-800">
                  {e.name} · {formatDate(e.date)}
                </span>
                <span className={`font-medium ${e.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                  {e.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ItemListProps {
  title: string;
  type: CashFlowType;
  items: CashFlowItem[];
  monthlyTotal: number;
  onAdd: () => void;
  onEdit: (item: CashFlowItem) => void;
  onOverride: (item: CashFlowItem) => void;
  onDelete: (item: CashFlowItem) => void;
  onToggleActive: (item: CashFlowItem) => void;
}

function ItemList({
  title,
  type,
  items,
  monthlyTotal,
  onAdd,
  onEdit,
  onOverride,
  onDelete,
  onToggleActive,
}: ItemListProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add {type === CashFlowType.INCOME ? "Income" : "Bill"}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">None added yet</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-3 ${item.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {!item.isActive && <span className="text-xs text-gray-400">(paused)</span>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(item.amount)} · {FREQUENCY_LABELS[item.frequency]} · since{" "}
                    {formatDate(item.anchorDate)}
                    {item.endDate ? ` until ${formatDate(item.endDate)}` : ""}
                  </p>
                  {item.overrides && item.overrides.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.overrides.map((o) => (
                        <span
                          key={o.id}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                        >
                          {o.periodKey}: {o.isSkipped ? "skipped" : formatCurrency(o.amount ?? "0")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {item.frequency !== CashFlowFrequency.ONE_TIME && (
                    <button
                      onClick={() => onOverride(item)}
                      title="Override a specific period"
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      <CalendarClock className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onToggleActive(item)}
                    title={item.isActive ? "Pause" : "Resume"}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    {item.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">Monthly total (recurring)</span>
          <span className="font-semibold text-gray-900">{formatCurrency(monthlyTotal)}</span>
        </div>
      )}
    </div>
  );
}

interface ItemFormModalProps {
  type: CashFlowType;
  editingItem?: CashFlowItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function ItemFormModal({ type, editingItem, onClose, onSaved }: ItemFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!editingItem;
  const [name, setName] = useState(editingItem?.name ?? "");
  const [amount, setAmount] = useState(editingItem?.amount ?? "");
  const [frequency, setFrequency] = useState<CashFlowFrequency>(editingItem?.frequency ?? CashFlowFrequency.MONTHLY);
  const [anchorDate, setAnchorDate] = useState(editingItem?.anchorDate ?? todayDateString());
  const [hasEndDate, setHasEndDate] = useState(!!editingItem?.endDate);
  const [endDate, setEndDate] = useState(editingItem?.endDate ?? "");
  const [note, setNote] = useState(editingItem?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast("error", "Enter a valid positive amount");
      return;
    }
    setIsSubmitting(true);
    try {
      if (isEdit) {
        const input: UpdateCashFlowItemInput = {
          name,
          amount: amountNum,
          anchorDate,
          endDate: hasEndDate && endDate ? endDate : null,
          note: note || null,
        };
        await cashflowApi.updateItem(editingItem.id, input);
        toast("success", "Updated");
      } else {
        const input: CreateCashFlowItemInput = {
          type,
          name,
          amount: amountNum,
          frequency,
          anchorDate,
          endDate: frequency !== CashFlowFrequency.ONE_TIME && hasEndDate && endDate ? endDate : null,
          note: note || null,
        };
        await cashflowApi.createItem(input);
        toast("success", "Added");
      }
      await onSaved();
    } catch (err) {
      toast("error", errorMessage(err, "Failed to save"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const label = type === CashFlowType.INCOME ? "Income" : "Bill";

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? `Edit ${label}` : `Add ${label}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === CashFlowType.INCOME ? "Paycheck" : "Electric bill"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
        {!isEdit && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as CashFlowFrequency)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Object.values(CashFlowFrequency).map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Frequency can't be changed later — delete and re-add to change it.</p>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {frequency === CashFlowFrequency.ONE_TIME ? "Date" : "First occurrence / due date"}
          </label>
          <input
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
        {frequency !== CashFlowFrequency.ONE_TIME && (
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
              />
              Ends on a specific date
            </label>
            {hasEndDate && (
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface OverrideModalProps {
  item: CashFlowItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function OverrideModal({ item, onClose, onSaved }: OverrideModalProps) {
  const { toast } = useToast();
  const isMonthly = ![CashFlowFrequency.WEEKLY, CashFlowFrequency.BIWEEKLY].includes(item.frequency);
  const defaultPeriodKey = isMonthly ? todayDateString().slice(0, 7) : todayDateString();
  const [periodKey, setPeriodKey] = useState(defaultPeriodKey);
  const [amount, setAmount] = useState("");
  const [isSkipped, setIsSkipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existing = item.overrides?.find((o) => o.periodKey === periodKey);

  useEffect(() => {
    setAmount(existing?.amount ?? "");
    setIsSkipped(existing?.isSkipped ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await cashflowApi.upsertOverride(item.id, {
        periodKey,
        amount: !isSkipped && amount ? parseFloat(amount) : null,
        isSkipped,
      });
      toast("success", "Override saved");
      await onSaved();
    } catch (err) {
      toast("error", errorMessage(err, "Failed to save override"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setIsSubmitting(true);
    try {
      await cashflowApi.deleteOverride(item.id, periodKey);
      toast("success", "Override removed");
      await onSaved();
    } catch {
      toast("error", "Failed to remove override");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Override — ${item.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {isMonthly ? "Month" : "Occurrence date"}
          </label>
          <input
            type={isMonthly ? "month" : "date"}
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            Base amount for this item is {formatCurrency(item.amount)}
          </p>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isSkipped} onChange={(e) => setIsSkipped(e.target.checked)} />
            Skip this occurrence entirely
          </label>
        </div>
        {!isSkipped && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Override amount ($)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-2">
          {existing ? (
            <Button type="button" variant="ghost" onClick={handleRemove} disabled={isSubmitting}>
              <X className="mr-1 h-4 w-4" />
              Remove override
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface MonthDrilldownModalProps {
  monthKey: string;
  forecast: CashFlowForecast;
  onClose: () => void;
}

function MonthDrilldownModal({ monthKey, forecast, onClose }: MonthDrilldownModalProps) {
  const idx = forecast.timeline.findIndex((t) => t.month === monthKey);
  const monthData = forecast.timeline[idx];

  if (!monthData) return null;

  const startingBalance =
    idx === 0 ? parseFloat(forecast.startingBalance) : parseFloat(forecast.timeline[idx - 1]!.endingBalance);
  const monthEvents = forecast.events
    .filter((e) => e.date.slice(0, 7) === monthKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  const incomeEvents = monthEvents.filter((e) => e.type === "INCOME");
  const billEvents = monthEvents.filter((e) => e.type === "BILL");
  const endingBalance = parseFloat(monthData.endingBalance);

  return (
    <Modal isOpen onClose={onClose} title={formatMonth(monthKey)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
          <span className="text-gray-500">Starting balance</span>
          <span className="font-semibold text-gray-900">{formatCurrency(startingBalance)}</span>
        </div>

        {incomeEvents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Income received</h3>
            <div className="mt-1.5 space-y-1.5">
              {incomeEvents.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    {e.name} · {formatDate(e.date)}
                    {e.isReconciled && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        Reconciled
                      </span>
                    )}
                  </span>
                  <span className="text-right">
                    <span className="font-medium text-green-600">+{formatCurrency(e.amount)}</span>
                    {e.isReconciled && e.plannedAmount && e.plannedAmount !== e.amount && (
                      <span className="block text-[10px] text-gray-400">planned {formatCurrency(e.plannedAmount)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {billEvents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bills due</h3>
            <div className="mt-1.5 space-y-1.5">
              {billEvents.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    {e.name} · {formatDate(e.date)}
                    {e.isReconciled && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        Reconciled
                      </span>
                    )}
                  </span>
                  <span className="text-right">
                    <span className="font-medium text-red-600">-{formatCurrency(e.amount)}</span>
                    {e.isReconciled && e.plannedAmount && e.plannedAmount !== e.amount && (
                      <span className="block text-[10px] text-gray-400">planned {formatCurrency(e.plannedAmount)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {monthEvents.length === 0 && (
          <p className="text-sm text-gray-400">No income or bills fall in this month.</p>
        )}

        <div className="space-y-1.5 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Income total</span>
            <span className="font-medium text-green-600">+{formatCurrency(monthData.totalIncome)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Bills due total</span>
            <span className="font-medium text-red-600">-{formatCurrency(monthData.totalBills)}</span>
          </div>
          <div
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
              endingBalance < 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <span className="font-semibold text-gray-700">Ending balance</span>
            <span className={`font-bold ${endingBalance < 0 ? "text-red-600" : "text-gray-900"}`}>
              {formatCurrency(monthData.endingBalance)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
