import { CashFlowFrequency } from "@spendlens/shared";

// Amortizes a recurring item's amount into an average monthly figure.
// One-time items aren't part of the regular monthly rhythm, so they're excluded.
const MONTHLY_MULTIPLIER: Partial<Record<CashFlowFrequency, number>> = {
  [CashFlowFrequency.WEEKLY]: 52 / 12,
  [CashFlowFrequency.BIWEEKLY]: 26 / 12,
  [CashFlowFrequency.MONTHLY]: 1,
  [CashFlowFrequency.QUARTERLY]: 1 / 3,
  [CashFlowFrequency.SEMIANNUALLY]: 1 / 6,
  [CashFlowFrequency.YEARLY]: 1 / 12,
};

interface RecurringAmount {
  amount: string;
  frequency: CashFlowFrequency;
  isActive: boolean;
}

export function monthlyEquivalentTotal(items: RecurringAmount[]): number {
  return items
    .filter((i) => i.isActive && i.frequency !== CashFlowFrequency.ONE_TIME)
    .reduce((sum, i) => sum + parseFloat(i.amount) * (MONTHLY_MULTIPLIER[i.frequency] ?? 0), 0);
}
