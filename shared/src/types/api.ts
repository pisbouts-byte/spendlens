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
