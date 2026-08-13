import client from "./client.ts";
import type {
  ApiResponse,
  FiftyThirtyTwentyItem,
  FiftyThirtyTwentyCategory,
  CreateFiftyThirtyTwentyItemInput,
  UpdateFiftyThirtyTwentyItemInput,
} from "@spendlens/shared";

export async function getItems(category?: FiftyThirtyTwentyCategory): Promise<FiftyThirtyTwentyItem[]> {
  const { data } = await client.get<ApiResponse<FiftyThirtyTwentyItem[]>>("/fifty-thirty-twenty/items", {
    params: category ? { category } : undefined,
  });
  return data.data;
}

export async function createItem(input: CreateFiftyThirtyTwentyItemInput): Promise<FiftyThirtyTwentyItem> {
  const { data } = await client.post<ApiResponse<FiftyThirtyTwentyItem>>("/fifty-thirty-twenty/items", input);
  return data.data;
}

export async function updateItem(
  id: string,
  input: UpdateFiftyThirtyTwentyItemInput,
): Promise<FiftyThirtyTwentyItem> {
  const { data } = await client.patch<ApiResponse<FiftyThirtyTwentyItem>>(
    `/fifty-thirty-twenty/items/${id}`,
    input,
  );
  return data.data;
}

export async function deleteItem(id: string): Promise<void> {
  await client.delete(`/fifty-thirty-twenty/items/${id}`);
}
