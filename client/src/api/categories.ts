import client from "./client.ts";
import type {
  ApiResponse,
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  MergeCategoriesInput,
} from "@spendlens/shared";

export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get<ApiResponse<Category[]>>("/categories");
  return data.data;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { data } = await client.post<ApiResponse<Category>>("/categories", input);
  return data.data;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const { data } = await client.patch<ApiResponse<Category>>(
    `/categories/${id}`,
    input,
  );
  return data.data;
}

export async function deleteCategory(
  id: string,
  reassignTo?: string,
): Promise<void> {
  const params = reassignTo ? { reassignTo } : {};
  await client.delete(`/categories/${id}`, { params });
}

export async function mergeCategories(input: MergeCategoriesInput): Promise<Category> {
  const { data } = await client.post<ApiResponse<Category>>(
    "/categories/merge",
    input,
  );
  return data.data;
}
