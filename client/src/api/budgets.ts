import client from "./client.ts";
import type {
  ApiResponse,
  Budget,
  BudgetProgress,
  CreateBudgetInput,
  UpdateBudgetInput,
} from "@spendlens/shared";

export async function getBudgets(): Promise<Budget[]> {
  const { data } = await client.get<ApiResponse<Budget[]>>("/budgets");
  return data.data;
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const { data } = await client.post<ApiResponse<Budget>>("/budgets", input);
  return data.data;
}

export async function updateBudget(
  id: string,
  input: UpdateBudgetInput,
): Promise<Budget> {
  const { data } = await client.patch<ApiResponse<Budget>>(
    `/budgets/${id}`,
    input,
  );
  return data.data;
}

export async function deleteBudget(id: string): Promise<void> {
  await client.delete(`/budgets/${id}`);
}

export async function getBudgetProgress(params?: {
  type?: string;
  date?: string;
}): Promise<BudgetProgress[]> {
  const { data } = await client.get<ApiResponse<BudgetProgress[]>>(
    "/budgets/progress",
    { params },
  );
  return data.data;
}
