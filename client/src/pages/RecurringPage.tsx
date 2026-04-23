import { useCallback, useEffect, useState } from "react";
import {
  Repeat,
  DollarSign,
  Calendar,
  X,
  Pause,
  Play,
  Zap,
  Search,
  Pencil,
  Check,
} from "lucide-react";
import * as recurringApi from "../api/recurring.ts";
import type { RecurringPattern, RecurringSummary } from "../api/recurring.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Spinner } from "../components/ui/Spinner.tsx";
import { Tooltip } from "../components/ui/Tooltip.tsx";
import { useToast } from "../components/ui/Toast.tsx";

const frequencyLabels: Record<RecurringPattern["frequency"], string> = {
  WEEKLY: "week",
  BIWEEKLY: "2 weeks",
  MONTHLY: "month",
  QUARTERLY: "quarter",
  YEARLY: "year",
};

const frequencyPluralLabels: Record<RecurringPattern["frequency"], string> = {
  WEEKLY: "weeks",
  BIWEEKLY: "cycles",
  MONTHLY: "months",
  QUARTERLY: "quarters",
  YEARLY: "years",
};

function formatAmount(amount: string): string {
  return `$${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecurringPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<RecurringSummary | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const result = await recurringApi.getRecurringPatterns();
      setData(result);
    } catch {
      setError(true);
      toast("error", "Failed to load recurring charges");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDismiss(pattern: RecurringPattern) {
    try {
      await recurringApi.dismissPattern(pattern.id);
      toast("success", `Dismissed ${pattern.merchantName}`);
      await fetchData();
    } catch {
      toast("error", "Failed to dismiss pattern");
    }
  }

  async function handleToggle(pattern: RecurringPattern) {
    try {
      await recurringApi.togglePatternActive(pattern.id);
      toast(
        "success",
        pattern.isActive
          ? `Paused ${pattern.merchantName}`
          : `Resumed ${pattern.merchantName}`,
      );
      await fetchData();
    } catch {
      toast("error", "Failed to update pattern");
    }
  }

  async function handleFrequencyChange(
    pattern: RecurringPattern,
    newFrequency: RecurringPattern["frequency"],
  ) {
    if (newFrequency === pattern.frequency) return;
    try {
      await recurringApi.updateFrequency(pattern.id, newFrequency);
      toast("success", `Updated ${pattern.merchantName} to ${frequencyLabels[newFrequency]}ly`);
      await fetchData();
    } catch {
      toast("error", "Failed to update frequency");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-white p-12 text-center">
        <Repeat className="mx-auto h-12 w-12 text-red-300" />
        <p className="mt-2 text-gray-500">
          Something went wrong loading recurring charges.
        </p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const patterns = data?.patterns ?? [];
  const activePatterns = patterns.filter((p) => p.isActive);
  const monthlyTotal = parseFloat(data?.monthlyTotal ?? "0");
  const yearlyTotal = parseFloat(data?.yearlyTotal ?? "0");

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recurring Charges</h1>
        <p className="mt-1 text-sm text-gray-500">
          Detected subscriptions and recurring payments
        </p>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="h-4 w-4" />
            Monthly Cost
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatAmount(monthlyTotal.toFixed(2))}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Yearly Cost
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatAmount(yearlyTotal.toFixed(2))}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Repeat className="h-4 w-4" />
            Active Subscriptions
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-600">
            {activePatterns.length}
          </p>
        </div>
      </div>

      {/* Patterns list */}
      <div className="mt-6 space-y-3">
        {patterns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Repeat className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-gray-500">
              No recurring charges detected yet
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Recurring transactions will appear here once patterns are
              identified
            </p>
          </div>
        ) : (
          patterns.map((pattern) => (
            <div
              key={pattern.id}
              className={`rounded-xl border bg-white p-4 transition-colors ${
                pattern.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: merchant info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium text-gray-900 truncate">
                      {pattern.merchantName}
                    </span>

                    {/* Detection type badge */}
                    {pattern.detectionType === "KNOWN_MERCHANT" ? (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Zap className="h-3 w-3" />
                        Known Service
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-100 text-purple-700">
                        <Search className="h-3 w-3" />
                        Pattern Detected
                      </Badge>
                    )}

                    {/* Category badge */}
                    {pattern.category && (
                      <Badge color={pattern.category.color}>
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: pattern.category.color }}
                        />
                        {pattern.category.name}
                      </Badge>
                    )}

                    {!pattern.isActive && (
                      <span className="text-xs text-gray-400">(paused)</span>
                    )}
                  </div>

                  {/* Amount and frequency */}
                  <p className="mt-1 text-lg font-semibold text-gray-800">
                    {formatAmount(pattern.amount)}{" "}
                    <FrequencyEditor
                      frequency={pattern.frequency}
                      onChange={(f) => handleFrequencyChange(pattern, f)}
                    />
                  </p>

                  {/* Metadata row */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>
                      Charged{" "}
                      <span className="font-medium text-gray-500">
                        {pattern.occurrences}{" "}
                        {pattern.occurrences === 1
                          ? frequencyLabels[pattern.frequency]
                          : frequencyPluralLabels[pattern.frequency]}
                      </span>
                    </span>
                    <span>
                      Last seen:{" "}
                      <span className="font-medium text-gray-500">
                        {formatDate(pattern.lastSeen)}
                      </span>
                    </span>
                    {pattern.nextExpected && (
                      <span>
                        Next expected:{" "}
                        <span className="font-medium text-gray-500">
                          {formatDate(pattern.nextExpected)}
                        </span>
                      </span>
                    )}
                    <span>
                      Confidence:{" "}
                      <span className="font-medium text-gray-500">
                        {Math.round(pattern.confidence * 100)}%
                      </span>
                    </span>
                  </div>
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Tooltip
                    text={
                      pattern.isActive
                        ? "Pause — exclude from monthly/yearly cost totals (e.g. if you've cancelled this subscription)"
                        : "Resume — include in cost totals again"
                    }
                  >
                    <button
                      onClick={() => handleToggle(pattern)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      {pattern.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip text="Dismiss — hide this charge permanently. Use if this isn't actually a subscription.">
                    <button
                      onClick={() => handleDismiss(pattern)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const ALL_FREQUENCIES: RecurringPattern["frequency"][] = [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
];

function FrequencyEditor({
  frequency,
  onChange,
}: {
  frequency: RecurringPattern["frequency"];
  onChange: (f: RecurringPattern["frequency"]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-sm font-normal text-gray-500 hover:text-brand-600 transition-colors rounded px-1 -mx-1 hover:bg-gray-50"
      >
        / {frequencyLabels[frequency]}
        <Pencil className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {ALL_FREQUENCIES.map((f) => (
              <button
                key={f}
                onClick={() => {
                  onChange(f);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors ${
                  f === frequency
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Every {frequencyLabels[f]}
                {f === frequency && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}
