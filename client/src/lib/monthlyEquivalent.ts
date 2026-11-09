import { CashFlowFrequency } from "@spendlens/shared";

// Fallback multiplier for open-ended recurring items (no endDate).
const ANNUAL_OCCURRENCES: Partial<Record<CashFlowFrequency, number>> = {
  [CashFlowFrequency.WEEKLY]: 52,
  [CashFlowFrequency.BIWEEKLY]: 26,
  [CashFlowFrequency.MONTHLY]: 12,
  [CashFlowFrequency.QUARTERLY]: 4,
  [CashFlowFrequency.SEMIANNUALLY]: 2,
  [CashFlowFrequency.YEARLY]: 1,
};

// Count how many times a frequency fires between two dates (inclusive of start).
function countOccurrences(
  frequency: CashFlowFrequency,
  start: Date,
  end: Date,
): number {
  if (end < start) return 0;
  const days = (end.getTime() - start.getTime()) / 86400000;

  switch (frequency) {
    case CashFlowFrequency.WEEKLY:
      return Math.floor(days / 7) + 1;
    case CashFlowFrequency.BIWEEKLY:
      return Math.floor(days / 14) + 1;
    case CashFlowFrequency.MONTHLY: {
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      return months + 1;
    }
    case CashFlowFrequency.QUARTERLY: {
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      return Math.floor(months / 3) + 1;
    }
    case CashFlowFrequency.SEMIANNUALLY: {
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      return Math.floor(months / 6) + 1;
    }
    case CashFlowFrequency.YEARLY: {
      return end.getFullYear() - start.getFullYear() + 1;
    }
    default:
      return 0;
  }
}

interface RecurringAmount {
  amount: string | number;
  frequency: CashFlowFrequency;
  isActive: boolean;
  anchorDate?: string | null;
  endDate?: string | null;
}

export function monthlyEquivalentTotal(items: RecurringAmount[]): number {
  return items
    .filter((i) => i.isActive && i.frequency !== CashFlowFrequency.ONE_TIME)
    .reduce((sum, i) => {
      const amount =
        typeof i.amount === "string" ? parseFloat(i.amount) : i.amount;

      let monthlyAmount: number;

      if (i.anchorDate && i.endDate) {
        // Bounded item: count exact occurrences, amortise over 12 months
        const start = new Date(i.anchorDate);
        const end = new Date(i.endDate);
        const occurrences = countOccurrences(i.frequency, start, end);
        monthlyAmount = (occurrences * amount) / 12;
      } else {
        // Open-ended: use standard annual rate
        const annualOccurrences = ANNUAL_OCCURRENCES[i.frequency] ?? 0;
        monthlyAmount = (annualOccurrences * amount) / 12;
      }

      return sum + monthlyAmount;
    }, 0);
}
