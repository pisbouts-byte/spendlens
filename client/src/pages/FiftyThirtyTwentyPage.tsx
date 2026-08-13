import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Play, Pause, PiggyBank, EyeOff, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CashFlowItem, FiftyThirtyTwentyItem } from "@spendlens/shared";
import { CashFlowType, CashFlowFrequency, FiftyThirtyTwentyCategory } from "@spendlens/shared";
import * as cashflowApi from "../api/cashflow.ts";
import * as fiftyThirtyTwentyApi from "../api/fiftyThirtyTwenty.ts";
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

const CATEGORY_LABELS: Record<FiftyThirtyTwentyCategory, string> = {
  [FiftyThirtyTwentyCategory.NECESSITY]: "Necessity",
  [FiftyThirtyTwentyCategory.WANT]: "Want",
  [FiftyThirtyTwentyCategory.SAVINGS]: "Savings Contribution",
  [FiftyThirtyTwentyCategory.INCOME]: "Income",
};

const CATEGORY_PLACEHOLDERS: Record<FiftyThirtyTwentyCategory, string> = {
  [FiftyThirtyTwentyCategory.NECESSITY]: "Groceries",
  [FiftyThirtyTwentyCategory.WANT]: "Dining out",
  [FiftyThirtyTwentyCategory.SAVINGS]: "401(k), Roth IRA, Savings account",
  [FiftyThirtyTwentyCategory.INCOME]: "Freelance income",
};

const CHART_COLORS = {
  needs: "#6366f1",
  wants: "#f59e0b",
  savings: "#22c55e",
};

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function effectiveCategory(item: CashFlowItem): FiftyThirtyTwentyCategory {
  return (
    item.fiftyThirtyTwentyCategory ??
    (item.type === CashFlowType.BILL ? FiftyThirtyTwentyCategory.NECESSITY : FiftyThirtyTwentyCategory.INCOME)
  );
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

export function FiftyThirtyTwentyPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const [cashFlowItems, setCashFlowItems] = useState<CashFlowItem[]>([]);
  const [necessityItems, setNecessityItems] = useState<FiftyThirtyTwentyItem[]>([]);
  const [wantItems, setWantItems] = useState<FiftyThirtyTwentyItem[]>([]);
  const [savingsItems, setSavingsItems] = useState<FiftyThirtyTwentyItem[]>([]);
  const [incomeItems, setIncomeItems] = useState<FiftyThirtyTwentyItem[]>([]);

  const [itemModalCategory, setItemModalCategory] = useState<FiftyThirtyTwentyCategory | null>(null);
  const [editingItem, setEditingItem] = useState<FiftyThirtyTwentyItem | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cfItems, budgetItems] = await Promise.all([
        cashflowApi.getItems(),
        fiftyThirtyTwentyApi.getItems(),
      ]);
      setCashFlowItems(cfItems);
      setNecessityItems(budgetItems.filter((i) => i.category === FiftyThirtyTwentyCategory.NECESSITY));
      setWantItems(budgetItems.filter((i) => i.category === FiftyThirtyTwentyCategory.WANT));
      setSavingsItems(budgetItems.filter((i) => i.category === FiftyThirtyTwentyCategory.SAVINGS));
      setIncomeItems(budgetItems.filter((i) => i.category === FiftyThirtyTwentyCategory.INCOME));
    } catch {
      toast("error", "Failed to load budget data");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const visibleCashFlowItems = useMemo(
    () => cashFlowItems.filter((i) => !i.excludeFromFiftyThirtyTwenty),
    [cashFlowItems],
  );
  const excludedCashFlowItems = useMemo(
    () => cashFlowItems.filter((i) => i.excludeFromFiftyThirtyTwenty),
    [cashFlowItems],
  );
  const cfNeeds = useMemo(
    () => visibleCashFlowItems.filter((i) => effectiveCategory(i) === FiftyThirtyTwentyCategory.NECESSITY),
    [visibleCashFlowItems],
  );
  const cfWants = useMemo(
    () => visibleCashFlowItems.filter((i) => effectiveCategory(i) === FiftyThirtyTwentyCategory.WANT),
    [visibleCashFlowItems],
  );
  const cfSavings = useMemo(
    () => visibleCashFlowItems.filter((i) => effectiveCategory(i) === FiftyThirtyTwentyCategory.SAVINGS),
    [visibleCashFlowItems],
  );
  const cfIncome = useMemo(
    () => visibleCashFlowItems.filter((i) => effectiveCategory(i) === FiftyThirtyTwentyCategory.INCOME),
    [visibleCashFlowItems],
  );

  const totalNeeds = useMemo(
    () => monthlyEquivalentTotal(cfNeeds) + monthlyEquivalentTotal(necessityItems),
    [cfNeeds, necessityItems],
  );
  const totalWants = useMemo(
    () => monthlyEquivalentTotal(cfWants) + monthlyEquivalentTotal(wantItems),
    [cfWants, wantItems],
  );
  const totalSavings = useMemo(
    () => monthlyEquivalentTotal(cfSavings) + monthlyEquivalentTotal(savingsItems),
    [cfSavings, savingsItems],
  );
  const totalIncome = useMemo(
    () => monthlyEquivalentTotal(cfIncome) + monthlyEquivalentTotal(incomeItems),
    [cfIncome, incomeItems],
  );

  const needsTarget = totalIncome * 0.5;
  const wantsTarget = totalIncome * 0.3;
  const savingsTarget = totalIncome * 0.2;

  const needsPct = totalIncome > 0 ? (totalNeeds / totalIncome) * 100 : 0;
  const wantsPct = totalIncome > 0 ? (totalWants / totalIncome) * 100 : 0;
  const savingsPct = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const totalAllocated = totalNeeds + totalWants + totalSavings;
  const unallocated = totalIncome - totalAllocated;

  const chartData = [
    { name: "Target", Needs: needsTarget, Wants: wantsTarget, Savings: savingsTarget },
    { name: "Actual", Needs: totalNeeds, Wants: totalWants, Savings: totalSavings },
  ];

  async function handleDeleteItem(item: FiftyThirtyTwentyItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await fiftyThirtyTwentyApi.deleteItem(item.id);
      toast("success", "Deleted");
      await fetchData();
    } catch {
      toast("error", "Failed to delete");
    }
  }

  async function handleToggleActive(item: FiftyThirtyTwentyItem) {
    try {
      await fiftyThirtyTwentyApi.updateItem(item.id, { isActive: !item.isActive });
      await fetchData();
      toast("success", item.isActive ? "Paused" : "Resumed");
    } catch {
      toast("error", "Failed to update");
    }
  }

  async function handleRecategorizeCashFlowItem(item: CashFlowItem, category: FiftyThirtyTwentyCategory) {
    try {
      await cashflowApi.updateItem(item.id, { fiftyThirtyTwentyCategory: category });
      await fetchData();
    } catch {
      toast("error", "Failed to recategorize");
    }
  }

  async function handleExcludeCashFlowItem(item: CashFlowItem) {
    try {
      await cashflowApi.updateItem(item.id, { excludeFromFiftyThirtyTwenty: true });
      toast("success", "Excluded from 50/30/20");
      await fetchData();
    } catch {
      toast("error", "Failed to exclude");
    }
  }

  async function handleIncludeCashFlowItem(item: CashFlowItem) {
    try {
      await cashflowApi.updateItem(item.id, { excludeFromFiftyThirtyTwenty: false });
      toast("success", "Included in 50/30/20");
      await fetchData();
    } catch {
      toast("error", "Failed to include");
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
        <h1 className="text-2xl font-bold text-gray-900">50/30/20 Budget</h1>
        <p className="mt-1 text-sm text-gray-500">
          Check your spending against the 50% needs / 30% wants / 20% savings rule
        </p>
      </div>

      {totalIncome <= 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <PiggyBank className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-gray-500">
            Add an income source in{" "}
            <Link to="/cashflow" className="text-brand-600 hover:underline">
              Cash Flow
            </Link>{" "}
            or below to see your 50/30/20 breakdown
          </p>
        </div>
      ) : (
        <>
          {/* Monthly income */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Monthly Income</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CategoryCard
              label="Needs"
              color={CHART_COLORS.needs}
              actual={totalNeeds}
              actualPct={needsPct}
              target={needsTarget}
              targetPct={50}
              isOver={totalNeeds > needsTarget}
            />
            <CategoryCard
              label="Wants"
              color={CHART_COLORS.wants}
              actual={totalWants}
              actualPct={wantsPct}
              target={wantsTarget}
              targetPct={30}
              isOver={totalWants > wantsTarget}
            />
            <CategoryCard
              label="Savings"
              color={CHART_COLORS.savings}
              actual={totalSavings}
              actualPct={savingsPct}
              target={savingsTarget}
              targetPct={20}
              isOver={totalSavings < savingsTarget}
              underLabel
            />
          </div>

          {/* Allocation chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900">Actual vs. Target Allocation</h2>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} width={55} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Needs" stackId="a" fill={CHART_COLORS.needs} isAnimationActive={false} />
                  <Bar dataKey="Wants" stackId="a" fill={CHART_COLORS.wants} isAnimationActive={false} />
                  <Bar
                    dataKey="Savings"
                    stackId="a"
                    fill={CHART_COLORS.savings}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {totalAllocated > totalIncome ? (
                <span className="font-medium text-red-600">
                  You're allocating {formatCurrency(totalAllocated - totalIncome)} more than your monthly income.
                </span>
              ) : (
                <>
                  <span className="font-medium text-gray-700">{formatCurrency(unallocated)}</span> of income isn't
                  allocated to needs, wants, or savings yet.
                </>
              )}
            </p>
          </div>
        </>
      )}

      {/* Needs */}
      <CategorySection
        title="Needs"
        category={FiftyThirtyTwentyCategory.NECESSITY}
        readOnlyItems={cfNeeds}
        readOnlySectionLabel="From Cash Flow"
        editableItems={necessityItems}
        editableSectionLabel="Additional Necessities"
        addLabel="Add Necessity"
        monthlyTotal={totalNeeds}
        onAdd={() => setItemModalCategory(FiftyThirtyTwentyCategory.NECESSITY)}
        onEdit={setEditingItem}
        onDelete={handleDeleteItem}
        onToggleActive={handleToggleActive}
        onRecategorize={handleRecategorizeCashFlowItem}
        onExclude={handleExcludeCashFlowItem}
      />

      {/* Wants */}
      <CategorySection
        title="Wants"
        category={FiftyThirtyTwentyCategory.WANT}
        readOnlyItems={cfWants}
        readOnlySectionLabel="From Cash Flow"
        editableItems={wantItems}
        editableSectionLabel="Additional Wants"
        addLabel="Add Want"
        monthlyTotal={totalWants}
        onAdd={() => setItemModalCategory(FiftyThirtyTwentyCategory.WANT)}
        onEdit={setEditingItem}
        onDelete={handleDeleteItem}
        onToggleActive={handleToggleActive}
        onRecategorize={handleRecategorizeCashFlowItem}
        onExclude={handleExcludeCashFlowItem}
      />

      {/* Savings */}
      <CategorySection
        title="Savings"
        category={FiftyThirtyTwentyCategory.SAVINGS}
        readOnlyItems={cfSavings}
        readOnlySectionLabel="From Cash Flow"
        editableItems={savingsItems}
        editableSectionLabel="Additional Savings"
        addLabel="Add Savings Contribution"
        monthlyTotal={totalSavings}
        onAdd={() => setItemModalCategory(FiftyThirtyTwentyCategory.SAVINGS)}
        onEdit={setEditingItem}
        onDelete={handleDeleteItem}
        onToggleActive={handleToggleActive}
        onRecategorize={handleRecategorizeCashFlowItem}
        onExclude={handleExcludeCashFlowItem}
      />

      {/* Income */}
      <CategorySection
        title="Income"
        category={FiftyThirtyTwentyCategory.INCOME}
        readOnlyItems={cfIncome}
        readOnlySectionLabel="From Cash Flow"
        editableItems={incomeItems}
        editableSectionLabel="Additional Income"
        addLabel="Add Income"
        monthlyTotal={totalIncome}
        onAdd={() => setItemModalCategory(FiftyThirtyTwentyCategory.INCOME)}
        onEdit={setEditingItem}
        onDelete={handleDeleteItem}
        onToggleActive={handleToggleActive}
        onRecategorize={handleRecategorizeCashFlowItem}
        onExclude={handleExcludeCashFlowItem}
      />

      {/* Excluded from 50/30/20 */}
      {excludedCashFlowItems.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">Excluded from 50/30/20</h2>
          <div className="mt-3 space-y-2">
            {excludedCashFlowItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div>
                  <span className="font-medium text-gray-500">{item.name}</span>
                  <p className="text-sm text-gray-400">
                    {formatCurrency(item.amount)} · {FREQUENCY_LABELS[item.frequency]}
                  </p>
                </div>
                <button
                  onClick={() => handleIncludeCashFlowItem(item)}
                  className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300"
                >
                  Include
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      {itemModalCategory && (
        <ItemFormModal
          category={itemModalCategory}
          onClose={() => setItemModalCategory(null)}
          onSaved={async () => {
            setItemModalCategory(null);
            await fetchData();
          }}
        />
      )}

      {/* Edit modal */}
      {editingItem && (
        <ItemFormModal
          category={editingItem.category}
          editingItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            setEditingItem(null);
            await fetchData();
          }}
        />
      )}
    </div>
  );
}

interface CategoryCardProps {
  label: string;
  color: string;
  actual: number;
  actualPct: number;
  target: number;
  targetPct: number;
  isOver: boolean;
  underLabel?: boolean;
}

function CategoryCard({ label, color, actual, actualPct, target, targetPct, isOver, underLabel }: CategoryCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${isOver ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${isOver ? "text-red-600" : "text-gray-900"}`}>
        {formatCurrency(actual)}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
        {formatPercent(actualPct)} of income · target {underLabel ? "≥" : "≤"}
        {targetPct}% ({formatCurrency(target)})
      </p>
      {isOver && (
        <p className="mt-1 text-xs font-medium text-red-600">
          {underLabel ? "Below target" : "Over target"}
        </p>
      )}
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  category: FiftyThirtyTwentyCategory;
  readOnlyItems?: CashFlowItem[];
  readOnlySectionLabel?: string;
  editableItems: FiftyThirtyTwentyItem[];
  editableSectionLabel?: string;
  addLabel: string;
  monthlyTotal: number;
  onAdd: () => void;
  onEdit: (item: FiftyThirtyTwentyItem) => void;
  onDelete: (item: FiftyThirtyTwentyItem) => void;
  onToggleActive: (item: FiftyThirtyTwentyItem) => void;
  onRecategorize: (item: CashFlowItem, category: FiftyThirtyTwentyCategory) => void;
  onExclude: (item: CashFlowItem) => void;
}

function CategorySection({
  title,
  readOnlyItems = [],
  readOnlySectionLabel,
  editableItems,
  editableSectionLabel,
  addLabel,
  monthlyTotal,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
  onRecategorize,
  onExclude,
}: CategorySectionProps) {
  const isEmpty = readOnlyItems.length === 0 && editableItems.length === 0;
  const showSubheaders = readOnlyItems.length > 0 && !!editableSectionLabel;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {isEmpty ? (
        <p className="mt-4 text-sm text-gray-400">None added yet</p>
      ) : (
        <div className="mt-3 space-y-3">
          {readOnlyItems.length > 0 && (
            <div>
              {showSubheaders && (
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {readOnlySectionLabel}
                </p>
              )}
              <div className="space-y-2">
                {readOnlyItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <select
                          value={effectiveCategory(item)}
                          onChange={(e) => onRecategorize(item, e.target.value as FiftyThirtyTwentyCategory)}
                          title="Move to a different 50/30/20 bucket"
                          className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 focus:border-brand-500 focus:outline-none"
                        >
                          {Object.values(FiftyThirtyTwentyCategory).map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_LABELS[c]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => onExclude(item)}
                          title="Exclude from 50/30/20"
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          to="/cashflow"
                          title="Edit in Cash Flow"
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.amount)} · {FREQUENCY_LABELS[item.frequency]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editableItems.length > 0 && (
            <div>
              {showSubheaders && (
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {editableSectionLabel}
                </p>
              )}
              <div className="space-y-2">
                {editableItems.map((item) => (
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
                          {formatCurrency(item.amount)} · {FREQUENCY_LABELS[item.frequency]}
                        </p>
                        {item.note && <p className="mt-0.5 text-xs text-gray-400">{item.note}</p>}
                      </div>
                      <div className="flex items-center gap-1">
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
            </div>
          )}
        </div>
      )}

      {!isEmpty && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">Monthly total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(monthlyTotal)}</span>
        </div>
      )}
    </div>
  );
}

interface ItemFormModalProps {
  category: FiftyThirtyTwentyCategory;
  editingItem?: FiftyThirtyTwentyItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function ItemFormModal({ category, editingItem, onClose, onSaved }: ItemFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!editingItem;
  const [selectedCategory, setSelectedCategory] = useState<FiftyThirtyTwentyCategory>(category);
  const [name, setName] = useState(editingItem?.name ?? "");
  const [amount, setAmount] = useState(editingItem?.amount ?? "");
  const [frequency, setFrequency] = useState<CashFlowFrequency>(editingItem?.frequency ?? CashFlowFrequency.MONTHLY);
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
        await fiftyThirtyTwentyApi.updateItem(editingItem.id, {
          category: selectedCategory,
          name,
          amount: amountNum,
          frequency,
          note: note || null,
        });
        toast("success", "Updated");
      } else {
        await fiftyThirtyTwentyApi.createItem({
          category,
          name,
          amount: amountNum,
          frequency,
          note: note || null,
        });
        toast("success", "Added");
      }
      await onSaved();
    } catch (err) {
      toast("error", errorMessage(err, "Failed to save"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const label = CATEGORY_LABELS[selectedCategory];

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? `Edit ${label}` : `Add ${label}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEdit && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as FiftyThirtyTwentyCategory)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Object.values(FiftyThirtyTwentyCategory).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={CATEGORY_PLACEHOLDERS[selectedCategory]}
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
        </div>
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
