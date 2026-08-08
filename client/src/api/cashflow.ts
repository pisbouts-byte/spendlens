import client from "./client.ts";
import type {
  ApiResponse,
  CashFlowItem,
  CashFlowOverride,
  CashFlowBalance,
  CashFlowForecast,
  CashFlowType,
  CreateCashFlowItemInput,
  UpdateCashFlowItemInput,
  UpsertCashFlowOverrideInput,
  UpdateBillsBalanceInput,
} from "@spendlens/shared";

export async function getItems(type?: CashFlowType): Promise<CashFlowItem[]> {
  const { data } = await client.get<ApiResponse<CashFlowItem[]>>("/cashflow/items", {
    params: type ? { type } : undefined,
  });
  return data.data;
}

export async function createItem(input: CreateCashFlowItemInput): Promise<CashFlowItem> {
  const { data } = await client.post<ApiResponse<CashFlowItem>>("/cashflow/items", input);
  return data.data;
}

export async function updateItem(id: string, input: UpdateCashFlowItemInput): Promise<CashFlowItem> {
  const { data } = await client.patch<ApiResponse<CashFlowItem>>(`/cashflow/items/${id}`, input);
  return data.data;
}

export async function deleteItem(id: string): Promise<void> {
  await client.delete(`/cashflow/items/${id}`);
}

export async function upsertOverride(
  itemId: string,
  input: UpsertCashFlowOverrideInput,
): Promise<CashFlowOverride> {
  const { data } = await client.put<ApiResponse<CashFlowOverride>>(
    `/cashflow/items/${itemId}/overrides`,
    input,
  );
  return data.data;
}

export async function deleteOverride(itemId: string, periodKey: string): Promise<void> {
  await client.delete(`/cashflow/items/${itemId}/overrides/${periodKey}`);
}

export async function getBalance(): Promise<CashFlowBalance> {
  const { data } = await client.get<ApiResponse<CashFlowBalance>>("/cashflow/balance");
  return data.data;
}

export async function updateBalance(input: UpdateBillsBalanceInput): Promise<CashFlowBalance> {
  const { data } = await client.put<ApiResponse<CashFlowBalance>>("/cashflow/balance", input);
  return data.data;
}

export async function getForecast(): Promise<CashFlowForecast> {
  const { data } = await client.get<ApiResponse<CashFlowForecast>>("/cashflow/forecast");
  return data.data;
}
