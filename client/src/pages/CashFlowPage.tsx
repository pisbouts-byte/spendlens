import { useCallback, useEffect, useState } from "react";
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
  CashFlowForecast,
  CashFlowBalance,
  CreateCashFlowItemInput,
  UpdateCashFlowItemInput,
} from "@spendlens/shared";
import { CashFlowType, CashFlowFrequency } from "@spendlens/shared";
import * as cashflowApi from "../api/cashflow.ts";
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [f, items, bal] = await Promise.all([
        cashflowApi.getForecast(),
        cashflowApi.getItems(),
        cashflowApi.getBalance(),
      ]);
      setForecast(f);
      setIncomeItems(items.filter((i) => i.type === CashFlowType.INCOME));
      setBillItems(items.filter((i) => i.type === CashFlowType.BILL));
      setBalance(bal);
      setBalanceAmount(bal.balance ?? "");
      setBalanceAsOf(bal.asOf ?? todayDateString());
    } catch {
      toast("error", "Failed to load cash flow data");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        {forecast?.isStale && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            This balance is more than a week old — the forecast may be off. Update it for an accurate picture.
          </p>
        )}
      </div>

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

          {/* Alerts */}
          {forecast.alerts.length > 0 && (
            <div className="space-y-2">
              {forecast.alerts.map((a, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      Insufficient funds projected {formatDate(a.startDate)}
                      {a.endDate ? ` – ${formatDate(a.endDate)}` : " onward"}
                    </p>
                    <p className="mt-0.5 text-sm text-red-600">
                      Balance may drop as low as {formatCurrency(a.lowestBalance)} on{" "}
                      {formatDate(a.lowestBalanceDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 12-month timeline */}
          {forecast.timeline.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-gray-900">Projected Balance — Next 12 Months</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecast.timeline.map((t) => ({ ...t, endingBalanceNum: parseFloat(t.endingBalance) }))}>
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
        onAdd={() => setItemModalType(CashFlowType.INCOME)}
        onEdit={setEditingItem}
        onOverride={setOverrideItem}
        onDelete={handleDeleteItem}
        onToggleActive={handleToggleActive}
      />

      {/* Bills */}
      <ItemList
        title="Bills"
        type={CashFlowType.BILL}
        items={billItems}
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
    </div>
  );
}

interface ItemListProps {
  title: string;
  type: CashFlowType;
  items: CashFlowItem[];
  onAdd: () => void;
  onEdit: (item: CashFlowItem) => void;
  onOverride: (item: CashFlowItem) => void;
  onDelete: (item: CashFlowItem) => void;
  onToggleActive: (item: CashFlowItem) => void;
}

function ItemList({ title, type, items, onAdd, onEdit, onOverride, onDelete, onToggleActive }: ItemListProps) {
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
