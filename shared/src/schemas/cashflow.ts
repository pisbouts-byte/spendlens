import { z } from "zod";
import { CashFlowType, CashFlowFrequency, FiftyThirtyTwentyCategory } from "../types/enums.js";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const CreateCashFlowItemSchema = z.object({
  type: z.nativeEnum(CashFlowType),
  name: z.string().min(1).max(100),
  amount: z.number().positive().max(999999999999),
  frequency: z.nativeEnum(CashFlowFrequency),
  anchorDate: dateString,
  endDate: dateString.nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const UpdateCashFlowItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(999999999999).optional(),
  anchorDate: dateString.optional(),
  endDate: dateString.nullable().optional(),
  isActive: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
  fiftyThirtyTwentyCategory: z.nativeEnum(FiftyThirtyTwentyCategory).nullable().optional(),
  excludeFromFiftyThirtyTwenty: z.boolean().optional(),
});

export const UpsertCashFlowOverrideSchema = z.object({
  periodKey: z.string().min(1).max(10),
  amount: z.number().positive().max(999999999999).nullable().optional(),
  isSkipped: z.boolean().optional().default(false),
  note: z.string().max(500).nullable().optional(),
});

export const UpdateBillsBalanceSchema = z.object({
  balance: z.number().max(999999999999),
  asOf: dateString,
});

export const ForecastQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).optional(),
});

export type CreateCashFlowItemInput = z.infer<typeof CreateCashFlowItemSchema>;
export type UpdateCashFlowItemInput = z.infer<typeof UpdateCashFlowItemSchema>;
export type UpsertCashFlowOverrideInput = z.infer<typeof UpsertCashFlowOverrideSchema>;
export type UpdateBillsBalanceInput = z.infer<typeof UpdateBillsBalanceSchema>;
export type ForecastQuery = z.infer<typeof ForecastQuerySchema>;
