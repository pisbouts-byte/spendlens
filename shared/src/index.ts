// Types
export type {
  User,
  UserSettings,
  PlaidItem,
  PlaidAccount,
  Category,
  Transaction,
  CategoryCorrection,
  Budget,
  BudgetProgress,
  RecurringPattern,
  CashFlowItem,
  CashFlowOverride,
} from "./types/models.js";

export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  AuthResponse,
  SpendingByCategory,
  SpendingOverTime,
  TopMerchant,
  RecurringSummary,
  CashFlowBalance,
  CashFlowEvent,
  CashFlowSnapshot,
  CashFlowAlert,
  CashFlowMonthSummary,
  CashFlowForecast,
} from "./types/api.js";

export {
  BudgetType,
  WeekDay,
  PlaidItemStatus,
  RecurringFrequency,
  CashFlowType,
  CashFlowFrequency,
} from "./types/enums.js";

// Schemas
export {
  CreateCategorySchema,
  UpdateCategorySchema,
  MergeCategoriesSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type MergeCategoriesInput,
} from "./schemas/category.js";

export {
  UpdateTransactionSchema,
  BulkUpdateTransactionsSchema,
  BulkDeleteTransactionsSchema,
  TransactionQuerySchema,
  type UpdateTransactionInput,
  type BulkUpdateTransactionsInput,
  type BulkDeleteTransactionsInput,
  type TransactionQuery,
} from "./schemas/transaction.js";

export {
  CreateBudgetSchema,
  UpdateBudgetSchema,
  BudgetProgressQuerySchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type BudgetProgressQuery,
} from "./schemas/budget.js";

export {
  UpdateSettingsSchema,
  type UpdateSettingsInput,
} from "./schemas/settings.js";

export {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "./schemas/auth.js";

export {
  CreateCashFlowItemSchema,
  UpdateCashFlowItemSchema,
  UpsertCashFlowOverrideSchema,
  UpdateBillsBalanceSchema,
  type CreateCashFlowItemInput,
  type UpdateCashFlowItemInput,
  type UpsertCashFlowOverrideInput,
  type UpdateBillsBalanceInput,
} from "./schemas/cashflow.js";

// Constants
export { DEFAULT_CATEGORIES } from "./constants/categories.js";
export { CATEGORY_COLORS } from "./constants/colors.js";
