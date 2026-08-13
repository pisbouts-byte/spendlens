import { z } from "zod";

export const UpdatePlaidAccountSettingsSchema = z.object({
  includeInCashFlow: z.boolean().optional(),
  includeInSpending: z.boolean().optional(),
});

export type UpdatePlaidAccountSettingsInput = z.infer<typeof UpdatePlaidAccountSettingsSchema>;
