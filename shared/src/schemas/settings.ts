import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const UpdateSettingsSchema = z.object({
  weekStartDay: z.number().int().min(0).max(6).optional(),
  currency: z.string().length(3).optional(),
  autoSyncEnabled: z.boolean().optional(),
  payPeriodLengthDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).nullable().optional(),
  payPeriodAnchorDate: dateString.nullable().optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
