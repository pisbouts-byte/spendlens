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
  BudgetCarryoverInfo,
  RecurringPattern,
  CashFlowItem,
  CashFlowOverride,
  FiftyThirtyTwentyItem,
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
  FiftyThirtyTwentyCategory,
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
  CreateTransactionSchema,
  UpdateTransactionSchema,
  BulkUpdateTransactionsSchema,
  BulkDeleteTransactionsSchema,
  TransactionQuerySchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type BulkUpdateTransactionsInput,
  type BulkDeleteTransactionsInput,
  type TransactionQuery,
} from "./schemas/transaction.js";

export {
  CreateBudgetSchema,
  UpdateBudgetSchema,
  BudgetProgressQuerySchema,
  CarryOverBudgetSchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type BudgetProgressQuery,
  type CarryOverBudgetInput,
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
  ForecastQuerySchema,
  type CreateCashFlowItemInput,
  type UpdateCashFlowItemInput,
  type UpsertCashFlowOverrideInput,
  type UpdateBillsBalanceInput,
  type ForecastQuery,
} from "./schemas/cashflow.js";

export {
  CreateFiftyThirtyTwentyItemSchema,
  UpdateFiftyThirtyTwentyItemSchema,
  type CreateFiftyThirtyTwentyItemInput,
  type UpdateFiftyThirtyTwentyItemInput,
} from "./schemas/fiftyThirtyTwenty.js";

export {
  UpdatePlaidAccountSettingsSchema,
  type UpdatePlaidAccountSettingsInput,
} from "./schemas/plaid.js";

// Constants
export { DEFAULT_CATEGORIES } from "./constants/categories.js";
export { CATEGORY_COLORS } from "./constants/colors.js";
