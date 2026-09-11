import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { CashFlowItem } from "@spendlens/shared";
import { CashFlowFrequency } from "@spendlens/shared";
import * as cashflowApi from "../../api/cashflow.ts";
import { Button } from "../ui/Button.tsx";
import { Modal } from "../ui/Modal.tsx";
import { useToast } from "../ui/Toast.tsx";

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
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

interface OverrideModalProps {
  item: CashFlowItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  /** The exact occurrence date being edited (e.g. from a Bills Grid cell). Defaults to today's period when omitted. */
  initialDate?: string;
}

export function OverrideModal({ item, onClose, onSaved, initialDate }: OverrideModalProps) {
  const { toast } = useToast();
  const isMonthly = ![CashFlowFrequency.WEEKLY, CashFlowFrequency.BIWEEKLY].includes(item.frequency);
  const referenceDate = initialDate ?? todayDateString();
  const defaultPeriodKey = isMonthly ? referenceDate.slice(0, 7) : referenceDate;
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
