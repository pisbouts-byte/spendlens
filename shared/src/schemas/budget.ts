import { z } from "zod";
import { BudgetType } from "../types/enums.js";

export const CreateBudgetSchema = z.object({
  categoryId: z.string().uuid().nullable().default(null),
  type: z.nativeEnum(BudgetType),
  amount: z.number().positive().max(999999999999),
});

export const UpdateBudgetSchema = z.object({
  amount: z.number().positive().max(999999999999).optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
});

export const BudgetProgressQuerySchema = z.object({
  type: z.nativeEnum(BudgetType).optional(),
  date: z.string().optional(),
});

export const CarryOverBudgetSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
});

export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type BudgetProgressQuery = z.infer<typeof BudgetProgressQuerySchema>;
export type CarryOverBudgetInput = z.infer<typeof CarryOverBudgetSchema>;
