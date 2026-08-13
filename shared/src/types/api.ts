import type { RecurringPattern } from "./models.js";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: string;
  count: number;
  percentage: number;
}

export interface SpendingOverTime {
  period: string;
  total: string;
  categories: Record<string, string>;
}

export interface TopMerchant {
  merchantName: string;
  total: string;
  count: number;
  categoryName: string | null;
}

export interface RecurringSummary {
  patterns: RecurringPattern[];
  monthlyTotal: string;
  yearlyTotal: string;
}

export interface CashFlowBalance {
  balance: string | null;
  asOf: string | null;
}

export interface CashFlowEvent {
  date: string;
  cashFlowItemId: string;
  name: string;
  type: "INCOME" | "BILL";
  amount: string;
  isOverridden: boolean;
  isReconciled: boolean;
  isUnexpected: boolean;
  plannedAmount?: string;
}

export interface CashFlowSnapshot {
  label: "endOfMonth" | "endOfYear" | "oneYearOut";
  date: string;
  endingBalance: string;
  netChange: string;
}

export interface CashFlowAlert {
  startDate: string;
  endDate: string | null;
  lowestBalance: string;
  lowestBalanceDate: string;
  events: CashFlowEvent[];
}

export interface CashFlowMonthSummary {
  month: string; // YYYY-MM
  totalIncome: string;
  totalBills: string;
  net: string;
  endingBalance: string;
}

export interface CashFlowForecast {
  balanceConfigured: boolean;
  startingBalance: string;
  asOf: string | null;
  isStale: boolean;
  snapshots: CashFlowSnapshot[];
  alerts: CashFlowAlert[];
  timeline: CashFlowMonthSummary[];
  events: CashFlowEvent[];
  unexpectedTransactions: CashFlowEvent[];
}
