import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#94a3b8"),
  icon: z.string().max(30).default("Tag"),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().max(30).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const MergeCategoriesSchema = z.object({
  sourceCategoryId: z.string().uuid(),
  targetCategoryId: z.string().uuid(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type MergeCategoriesInput = z.infer<typeof MergeCategoriesSchema>;
