import client from "./client.ts";
import type { ApiResponse, UpdateSettingsInput } from "@spendlens/shared";

export interface UserSettings {
  id: string;
  userId: string;
  weekStartDay: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSettings(): Promise<UserSettings> {
  const { data } = await client.get<ApiResponse<UserSettings>>("/settings");
  return data.data;
}

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<UserSettings> {
  const { data } = await client.patch<ApiResponse<UserSettings>>(
    "/settings",
    input,
  );
  return data.data;
}
