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
} from "./types/api.js";

export { BudgetType, WeekDay, PlaidItemStatus, RecurringFrequency } from "./types/enums.js";

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

// Constants
export { DEFAULT_CATEGORIES } from "./constants/categories.js";
export { CATEGORY_COLORS } from "./constants/colors.js";
