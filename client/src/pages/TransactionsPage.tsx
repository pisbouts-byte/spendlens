import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  EyeOff,
  Eye,
  Square,
  CheckSquare,
  MinusSquare,
  Tag,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { Transaction, Category, PaginatedResponse } from "@spendlens/shared";
import * as transactionsApi from "../api/transactions.ts";
import type { TransactionFilters } from "../api/transactions.ts";
import * as categoriesApi from "../api/categories.ts";
import * as plaidApi from "../api/plaid.ts";
import type { PlaidItemWithAccounts } from "../api/plaid.ts";
import { Button } from "../components/ui/Button.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { CategoryIcon } from "../components/ui/CategoryIcon.tsx";
import { Spinner } from "../components/ui/Spinner.tsx";
import { useToast } from "../components/ui/Toast.tsx";

type SortField = "date" | "amount" | "merchantName";
type SortOrder = "asc" | "desc";

export function TransactionsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<PlaidItemWithAccounts[]>([]);
  const [accountFilter, setAccountFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [excludedFilter, setExcludedFilter] = useState<"all" | "true" | "false">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Inline editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // AI categorization
  const [isCategorizing, setIsCategorizing] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters: TransactionFilters = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: searchDebounced || undefined,
      categoryId: categoryFilter || undefined,
      accountId: accountFilter || undefined,
      isExcluded: excludedFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      sortOrder,
    }),
    [pagination.page, pagination.limit, searchDebounced, categoryFilter, accountFilter, excludedFilter, startDate, endDate, sortBy, sortOrder],
  );

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await transactionsApi.getTransactions(filters);
      setTransactions(result.data);
      setPagination(result.pagination);
      setUncategorizedCount(result.uncategorizedTotal ?? 0);
    } catch {
      toast("error", "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    categoriesApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    plaidApi.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  // Category map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of categories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [categories]);

  // Selection helpers
  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Sort toggling
  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "amount" ? "desc" : "desc");
    }
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4 text-brand-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-brand-600" />
    );
  }

  // Inline category edit
  async function handleCategoryChange(transactionId: string, categoryId: string | null) {
    try {
      const updated = await transactionsApi.updateTransaction(transactionId, {
        categoryId,
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? updated : t)),
      );
      setEditingCategoryId(null);
      toast("success", "Category updated");
    } catch {
      toast("error", "Failed to update category");
    }
  }

  // Toggle exclusion
  async function handleToggleExclude(transaction: Transaction) {
    try {
      const updated = await transactionsApi.updateTransaction(transaction.id, {
        isExcluded: !transaction.isExcluded,
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === transaction.id ? updated : t)),
      );
    } catch {
      toast("error", "Failed to update transaction");
    }
  }

  // Bulk operations
  async function handleBulkCategory(categoryId: string | null) {
    if (selectedIds.size === 0) return;
    try {
      await transactionsApi.bulkUpdateTransactions({
        transactionIds: Array.from(selectedIds),
        categoryId,
      });
      setSelectedIds(new Set());
      await fetchTransactions();
      toast("success", `Updated ${selectedIds.size} transactions`);
    } catch {
      toast("error", "Bulk update failed");
    }
  }

  async function handleBulkExclude(isExcluded: boolean) {
    if (selectedIds.size === 0) return;
    try {
      await transactionsApi.bulkUpdateTransactions({
        transactionIds: Array.from(selectedIds),
        isExcluded,
      });
      setSelectedIds(new Set());
      await fetchTransactions();
      toast("success", `Updated ${selectedIds.size} transactions`);
    } catch {
      toast("error", "Bulk update failed");
    }
  }

  // Delete
  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await transactionsApi.deleteTransaction(id);
      await fetchTransactions();
      toast("success", "Transaction deleted");
    } catch {
      toast("error", "Failed to delete transaction");
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} transaction(s)? This cannot be undone.`)) return;
    try {
      await transactionsApi.bulkDeleteTransactions(Array.from(selectedIds));
      setSelectedIds(new Set());
      await fetchTransactions();
      toast("success", `Deleted ${selectedIds.size} transactions`);
    } catch {
      toast("error", "Failed to delete transactions");
    }
  }

  // AI Categorization
  async function handleCategorize() {
    setIsCategorizing(true);
    try {
      if (selectedIds.size > 0) {
        const ids = Array.from(selectedIds);
        const results = await transactionsApi.categorizeTransactions(ids);
        await fetchTransactions();
        setSelectedIds(new Set());
        toast("success", `Categorized ${results.length} transactions`);
      } else {
        const result = await transactionsApi.categorizeAllUncategorized();
        await fetchTransactions();
        if (result.categorized === 0) {
          toast("info", "No uncategorized transactions to process");
        } else {
          toast("success", `Categorized ${result.categorized} of ${result.total} transactions`);
        }
      }
    } catch {
      toast("error", "AI categorization failed. Check your Anthropic API key.");
    } finally {
      setIsCategorizing(false);
    }
  }

  // Export
  function handleExport() {
    const url = transactionsApi.getExportUrl(filters);
    const token = localStorage.getItem("spendlens_token");
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "transactions.csv";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast("error", "Export failed"));
  }

  // Format helpers
  function formatAmount(amount: string) {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(num));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  const hasActiveFilters = categoryFilter || accountFilter || excludedFilter !== "all" || startDate || endDate;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Transactions</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {pagination.total} transaction{pagination.total !== 1 && "s"}
            {uncategorizedCount > 0 && (
              <span className="ml-2 text-amber-600">
                ({uncategorizedCount} uncategorized)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCategorize}
            isLoading={isCategorizing}
            disabled={isCategorizing}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">AI Categorize</span>
            <span className="sm:hidden">AI</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} className="hidden sm:inline-flex">
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-lg border p-2 text-sm transition-colors sm:hidden ${
              hasActiveFilters
                ? "border-brand-300 bg-brand-50 text-brand-600"
                : "border-gray-300 text-gray-500"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search - always visible */}
      <div className="mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search merchants, descriptions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Filters - collapsible on mobile */}
      <div className={`mt-3 flex-wrap items-end gap-3 ${showFilters ? "flex" : "hidden sm:flex"}`}>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:w-auto"
        >
          <option value="">All Categories</option>
          <option value="uncategorized">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          value={accountFilter}
          onChange={(e) => {
            setAccountFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:w-auto"
        >
          <option value="">All Accounts</option>
          {accounts.flatMap((item) =>
            item.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}{acc.mask ? ` •${acc.mask}` : ""}
              </option>
            ))
          )}
        </select>
        <select
          value={excludedFilter}
          onChange={(e) => {
            setExcludedFilter(e.target.value as "all" | "true" | "false");
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:w-auto"
        >
          <option value="all">All</option>
          <option value="false">Included</option>
          <option value="true">Excluded</option>
        </select>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:flex-none"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:flex-none"
          />
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 border border-brand-200 px-3 py-2 sm:gap-3 sm:px-4">
          <span className="text-sm font-medium text-brand-700">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkCategory(
                    e.target.value === "uncategorized" ? null : e.target.value,
                  );
                  e.target.value = "";
                }
              }}
              className="rounded border border-brand-300 px-2 py-1 text-xs"
            >
              <option value="" disabled>
                Set category...
              </option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={() => handleBulkExclude(true)}>
              <EyeOff className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exclude</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleBulkExclude(false)}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Include</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-brand-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <Tag className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-gray-500">No transactions found</p>
            <p className="mt-1 text-sm text-gray-400">
              Connect a bank account or adjust your filters
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-2 lg:hidden">
              {/* Mobile select all */}
              <div className="flex items-center justify-between px-1">
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-500">
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-brand-600" />
                  ) : someSelected ? (
                    <MinusSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Select all
                </button>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <button onClick={() => handleSort("date")} className="flex items-center gap-0.5">
                    Date <SortIcon field="date" />
                  </button>
                  <button onClick={() => handleSort("amount")} className="flex items-center gap-0.5">
                    Amt <SortIcon field="amount" />
                  </button>
                </div>
              </div>

              {transactions.map((txn) => {
                const category = txn.categoryId ? categoryMap.get(txn.categoryId) : null;
                const isSelected = selectedIds.has(txn.id);
                const isPositive = parseFloat(txn.amount) < 0;
                const isEditing = editingCategoryId === txn.id;

                return (
                  <div
                    key={txn.id}
                    className={`rounded-xl border bg-white p-3 transition-colors ${
                      txn.isExcluded ? "opacity-50" : ""
                    } ${isSelected ? "border-brand-300 bg-brand-50/30" : "border-gray-200"}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSelect(txn.id)}
                        className="mt-0.5 text-gray-400"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-brand-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {txn.merchantName || txn.originalName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDateShort(txn.date)}
                              {txn.isPending && (
                                <span className="ml-1 text-amber-500">(pending)</span>
                              )}
                              {txn.plaidAccount && (
                                <span className="ml-1">
                                  · {txn.plaidAccount.name}
                                  {txn.plaidAccount.mask && ` •${txn.plaidAccount.mask}`}
                                </span>
                              )}
                            </p>
                          </div>
                          <span
                            className={`whitespace-nowrap text-sm font-semibold ${
                              isPositive ? "text-green-600" : "text-gray-900"
                            }`}
                          >
                            {isPositive ? "+" : "-"}{formatAmount(txn.amount)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          {isEditing ? (
                            <select
                              autoFocus
                              defaultValue={txn.categoryId || ""}
                              onChange={(e) => {
                                handleCategoryChange(txn.id, e.target.value || null);
                              }}
                              onBlur={() => setEditingCategoryId(null)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                            >
                              <option value="">Uncategorized</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.icon} {c.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingCategoryId(txn.id)}
                              className="flex items-center gap-1"
                            >
                              {category ? (
                                <Badge color={category.color}>
                                  <CategoryIcon name={category.icon} className="h-3 w-3" /> {category.name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  + Add category
                                </span>
                              )}
                              {txn.aiConfidence != null && (
                                <Sparkles className="h-3 w-3 text-amber-400" />
                              )}
                            </button>
                          )}
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleToggleExclude(txn)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100">
                              {txn.isExcluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button onClick={() => handleDelete(txn.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="w-10 px-4 py-3">
                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700">
                          {allSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : someSelected ? (
                            <MinusSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th
                        className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Date <SortIcon field="date" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600"
                        onClick={() => handleSort("merchantName")}
                      >
                        <div className="flex items-center gap-1">
                          Description <SortIcon field="merchantName" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                      <th
                        className="cursor-pointer px-4 py-3 text-right font-medium text-gray-600"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Amount <SortIcon field="amount" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Account</th>
                      <th className="w-10 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((txn) => {
                      const category = txn.categoryId ? categoryMap.get(txn.categoryId) : null;
                      const isSelected = selectedIds.has(txn.id);
                      const isPositive = parseFloat(txn.amount) < 0;
                      const isEditing = editingCategoryId === txn.id;

                      return (
                        <tr
                          key={txn.id}
                          className={`transition-colors hover:bg-gray-50 ${
                            txn.isExcluded ? "opacity-50" : ""
                          } ${isSelected ? "bg-brand-50/50" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleSelect(txn.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-brand-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(txn.date)}
                            {txn.isPending && (
                              <span className="ml-1.5 text-xs text-amber-500">(pending)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {txn.merchantName || txn.originalName}
                            </div>
                            {txn.merchantName && txn.merchantName !== txn.originalName && (
                              <div className="text-xs text-gray-400 truncate max-w-[250px]">
                                {txn.originalName}
                              </div>
                            )}
                            {txn.notes && (
                              <div className="text-xs text-gray-400 italic">{txn.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select
                                autoFocus
                                defaultValue={txn.categoryId || ""}
                                onChange={(e) => {
                                  handleCategoryChange(txn.id, e.target.value || null);
                                }}
                                onBlur={() => setEditingCategoryId(null)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                              >
                                <option value="">Uncategorized</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.icon} {c.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <button
                                onClick={() => setEditingCategoryId(txn.id)}
                                className="group flex items-center gap-1"
                              >
                                {category ? (
                                  <Badge color={category.color}>
                                    <CategoryIcon name={category.icon} className="h-3 w-3" /> {category.name}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-gray-400 group-hover:text-gray-600">
                                    + Add category
                                  </span>
                                )}
                                {txn.aiConfidence != null && (
                                  <span title={`AI confidence: ${Math.round(txn.aiConfidence * 100)}%`}>
                                    <Sparkles className="h-3 w-3 text-amber-400" />
                                  </span>
                                )}
                              </button>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                              isPositive ? "text-green-600" : "text-gray-900"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {formatAmount(txn.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {txn.plaidAccount ? (
                              <span className="text-xs text-gray-500">
                                {txn.plaidAccount.name}
                                {txn.plaidAccount.mask && (
                                  <span className="text-gray-400"> •{txn.plaidAccount.mask}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleExclude(txn)}
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                title={txn.isExcluded ? "Include in budgets" : "Exclude from budgets"}
                              >
                                {txn.isExcluded ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(txn.id)}
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3 sm:px-4">
            <p className="hidden text-sm text-gray-500 sm:block">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </p>
            <p className="text-sm text-gray-500 sm:hidden">
              {pagination.page}/{pagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {/* Show fewer page buttons on mobile */}
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 7) {
                  pageNum = i + 1;
                } else if (pagination.page <= 4) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 3) {
                  pageNum = pagination.totalPages - 6 + i;
                } else {
                  pageNum = pagination.page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPagination((p) => ({ ...p, page: pageNum }))}
                    className={`hidden rounded-lg px-3 py-1 text-sm font-medium transition-colors sm:block ${
                      pagination.page === pageNum
                        ? "bg-brand-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
