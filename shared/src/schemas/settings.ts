import { z } from "zod";

export const UpdateSettingsSchema = z.object({
  weekStartDay: z.number().int().min(0).max(6).optional(),
  currency: z.string().length(3).optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
