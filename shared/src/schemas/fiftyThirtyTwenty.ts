import { z } from "zod";
import { FiftyThirtyTwentyCategory, CashFlowFrequency } from "../types/enums.js";

export const CreateFiftyThirtyTwentyItemSchema = z.object({
  category: z.nativeEnum(FiftyThirtyTwentyCategory),
  name: z.string().min(1).max(100),
  amount: z.number().positive().max(999999999999),
  frequency: z.nativeEnum(CashFlowFrequency),
  note: z.string().max(500).nullable().optional(),
});

export const UpdateFiftyThirtyTwentyItemSchema = z.object({
  category: z.nativeEnum(FiftyThirtyTwentyCategory).optional(),
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(999999999999).optional(),
  frequency: z.nativeEnum(CashFlowFrequency).optional(),
  isActive: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

export type CreateFiftyThirtyTwentyItemInput = z.infer<typeof CreateFiftyThirtyTwentyItemSchema>;
export type UpdateFiftyThirtyTwentyItemInput = z.infer<typeof UpdateFiftyThirtyTwentyItemSchema>;
