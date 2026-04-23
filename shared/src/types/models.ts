import type { BudgetType, PlaidItemStatus, RecurringFrequency } from "./enums.js";

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  weekStartDay: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaidItem {
  id: string;
  userId: string;
  plaidItemId: string;
  institutionId: string | null;
  institutionName: string | null;
  status: PlaidItemStatus;
  createdAt: string;
  updatedAt: string;
  accounts?: PlaidAccount[];
}

export interface PlaidAccount {
  id: string;
  plaidItemId: string;
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  plaidAccountId: string | null;
  plaidTransactionId: string | null;
  categoryId: string | null;
  amount: string; // Decimal serialized as string
  merchantName: string | null;
  originalName: string;
  date: string; // Authorized/transaction date (when the purchase happened)
  postedDate: string | null; // Posted/cleared date (when the bank processed it)
  originalCategory: string | null;
  isExcluded: boolean;
  isPending: boolean;
  notes: string | null;
  aiConfidence: number | null;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
  plaidAccount?: PlaidAccount | null;
}

export interface CategoryCorrection {
  id: string;
  userId: string;
  merchantName: string;
  originalName: string;
  originalCategoryId: string | null;
  correctedCategoryId: string;
  transactionAmount: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string | null;
  type: BudgetType;
  amount: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
}

export interface RecurringPattern {
  id: string;
  userId: string;
  merchantName: string;
  amount: string;
  frequency: RecurringFrequency;
  confidence: number;
  detectionType: 'KNOWN_MERCHANT' | 'PATTERN_DETECTED';
  lastSeen: string;
  nextExpected: string | null;
  isActive: boolean;
  isDismissed: boolean;
  occurrences: number;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
}

export interface BudgetProgress {
  budget: Budget;
  spent: string;
  remaining: string;
  percentage: number;
  periodStart: string;
  periodEnd: string;
}
