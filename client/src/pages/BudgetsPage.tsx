import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Pause,
  Play,
} from "lucide-react";
import type {
  Budget,
  BudgetProgress,
  Category,
  CreateBudgetInput,
} from "@spendlens/shared";
import { BudgetType } from "@spendlens/shared";
import * as budgetsApi from "../api/budgets.ts";
import * as categoriesApi from "../api/categories.ts";
import { Button } from "../components/ui/Button.tsx";
import { CategoryIcon } from "../components/ui/CategoryIcon.tsx";
import { Spinner } from "../components/ui/Spinner.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { useToast } from "../components/ui/Toast.tsx";

export function BudgetsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewType, setViewType] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formType, setFormType] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");
  const [formAmount, setFormAmount] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [budgetData, progressData, categoryData] = await Promise.all([
        budgetsApi.getBudgets(),
        budgetsApi.getBudgetProgress({ type: viewType }),
        categoriesApi.getCategories(),
      ]);
      setBudgets(budgetData);
      setProgress(progressData);
      setCategories(categoryData);
    } catch {
      toast("error", "Failed to load budgets");
    } finally {
      setIsLoading(false);
    }
  }, [viewType, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreateModal() {
    setFormCategoryId("");
    setFormType("MONTHLY");
    setFormAmount("");
    setEditingBudget(null);
    setShowCreateModal(true);
  }

  function openEditModal(budget: Budget) {
    setFormAmount(budget.amount);
    setEditingBudget(budget);
    setShowCreateModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      toast("error", "Enter a valid positive amount");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBudget) {
        await budgetsApi.updateBudget(editingBudget.id, { amount });
        toast("success", "Budget updated");
      } else {
        const input: CreateBudgetInput = {
          categoryId: formCategoryId || null,
          type: formType as BudgetType,
          amount,
        };
        await budgetsApi.createBudget(input);
        toast("success", "Budget created");
      }
      setShowCreateModal(false);
      await fetchData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String(err.response.data.message)
          : "Failed to save budget";
      toast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(budget: Budget) {
    if (!confirm("Delete this budget?")) return;
    try {
      await budgetsApi.deleteBudget(budget.id);
      toast("success", "Budget deleted");
      await fetchData();
    } catch {
      toast("error", "Failed to delete budget");
    }
  }

  async function handleToggleActive(budget: Budget) {
    try {
      await budgetsApi.updateBudget(budget.id, {
        isActive: !budget.isActive,
      });
      await fetchData();
      toast("success", budget.isActive ? "Budget paused" : "Budget resumed");
    } catch {
      toast("error", "Failed to update budget");
    }
  }

  function getProgressColor(percentage: number): string {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-brand-500";
  }

  function getProgressBg(percentage: number): string {
    if (percentage >= 100) return "bg-red-50";
    if (percentage >= 80) return "bg-amber-50";
    return "bg-gray-100";
  }

  // Compute totals
  const totalBudgeted = progress.reduce(
    (sum, p) => sum + parseFloat(p.budget.amount),
    0,
  );
  const totalSpent = progress.reduce(
    (sum, p) => sum + parseFloat(p.spent),
    0,
  );
  const overBudgetCount = progress.filter((p) => p.percentage >= 100).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your spending limits
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Budget
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Wallet className="h-4 w-4" />
            Total Budgeted
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${totalBudgeted.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            Total Spent
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4" />
            Over Budget
          </div>
          <p
            className={`mt-1 text-2xl font-bold ${overBudgetCount > 0 ? "text-red-600" : "text-green-600"}`}
          >
            {overBudgetCount}
          </p>
        </div>
      </div>

      {/* View toggle */}
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => setViewType("MONTHLY")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            viewType === "MONTHLY"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setViewType("WEEKLY")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            viewType === "WEEKLY"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Weekly
        </button>
      </div>

      {/* Budget progress list */}
      <div className="mt-4 space-y-3">
        {progress.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-gray-500">
              No {viewType.toLowerCase()} budgets yet
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Create a budget to start tracking your spending
            </p>
            <Button onClick={openCreateModal} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Budget
            </Button>
          </div>
        ) : (
          progress.map((item) => {
            const pct = Math.min(item.percentage, 100);
            const budgetAmt = parseFloat(item.budget.amount);
            const spentAmt = parseFloat(item.spent);
            const remainingAmt = parseFloat(item.remaining);
            const isOver = item.percentage >= 100;
            const isWarning = item.percentage >= 80 && !isOver;

            return (
              <div
                key={item.budget.id}
                className={`rounded-xl border bg-white p-4 transition-colors ${
                  isOver
                    ? "border-red-200"
                    : isWarning
                      ? "border-amber-200"
                      : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.budget.category ? (
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                        style={{
                          backgroundColor: `${item.budget.category.color}20`,
                        }}
                      >
                        <CategoryIcon name={item.budget.category.icon} className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm">
                        💰
                      </span>
                    )}
                    <div>
                      <span className="font-medium text-gray-900">
                        {item.budget.category?.name || "Overall Spending"}
                      </span>
                      {!item.budget.isActive && (
                        <span className="ml-2 text-xs text-gray-400">(paused)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleToggleActive(item.budget as unknown as Budget)
                      }
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      title={
                        item.budget.isActive ? "Pause budget" : "Resume budget"
                      }
                    >
                      {item.budget.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        openEditModal(item.budget as unknown as Budget)
                      }
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(item.budget as unknown as Budget)
                      }
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      ${spentAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                      <span className="text-gray-400">
                        / ${budgetAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                    <span
                      className={`font-medium ${
                        isOver
                          ? "text-red-600"
                          : isWarning
                            ? "text-amber-600"
                            : "text-gray-600"
                      }`}
                    >
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className={`mt-1.5 h-2.5 overflow-hidden rounded-full ${getProgressBg(item.percentage)}`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(item.percentage)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {new Date(item.periodStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      –{" "}
                      {new Date(item.periodEnd).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {isOver ? (
                      <span className="font-medium text-red-500">
                        ${(spentAmt - budgetAmt).toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        over
                      </span>
                    ) : (
                      <span>
                        ${remainingAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        remaining
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inactive budgets */}
      {budgets.filter((b) => !b.isActive).length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-gray-500">Paused Budgets</h2>
          <div className="mt-2 space-y-2">
            {budgets
              .filter((b) => !b.isActive)
              .map((budget) => (
                <div
                  key={budget.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {budget.category ? <CategoryIcon name={budget.category.icon} className="h-4 w-4" /> : "💰"}
                    </span>
                    <span className="text-sm text-gray-600">
                      {budget.category?.name || "Overall Spending"}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({budget.type.toLowerCase()}) — $
                      {parseFloat(budget.amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(budget)}
                      className="rounded p-1 text-gray-400 hover:text-green-600"
                      title="Resume budget"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget)}
                      className="rounded p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingBudget ? "Edit Budget" : "New Budget"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingBudget && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Overall Spending (all categories)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Period
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType("MONTHLY")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      formType === "MONTHLY"
                        ? "bg-brand-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("WEEKLY")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      formType === "WEEKLY"
                        ? "bg-brand-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Amount ($)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingBudget ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
