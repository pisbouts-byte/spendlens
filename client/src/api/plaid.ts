import client from "./client.ts";
import type { ApiResponse } from "@spendlens/shared";

interface LinkTokenResponse {
  linkToken: string;
}

interface PlaidAccount {
  id: string;
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
}

export interface PlaidItemWithAccounts {
  id: string;
  plaidItemId: string;
  institutionId: string | null;
  institutionName: string | null;
  status: string;
  createdAt: string;
  accounts: PlaidAccount[];
}

interface SyncResult {
  added: number;
  modified: number;
  removed: number;
}

export async function createLinkToken(): Promise<string> {
  const { data } = await client.post<ApiResponse<LinkTokenResponse>>(
    "/plaid/create-link-token",
  );
  return data.data.linkToken;
}

export async function exchangeToken(
  publicToken: string,
  institutionId?: string,
  institutionName?: string,
): Promise<void> {
  await client.post("/plaid/exchange-token", {
    publicToken,
    institutionId,
    institutionName,
  });
}

export async function syncTransactions(itemId: string): Promise<SyncResult> {
  const { data } = await client.post<ApiResponse<SyncResult>>(
    `/plaid/sync/${itemId}`,
  );
  return data.data;
}

export async function syncAll(): Promise<SyncResult[]> {
  const { data } = await client.post<ApiResponse<SyncResult[]>>(
    "/plaid/sync-all",
  );
  return data.data;
}

export async function getAccounts(): Promise<PlaidItemWithAccounts[]> {
  const { data } = await client.get<ApiResponse<PlaidItemWithAccounts[]>>(
    "/plaid/accounts",
  );
  return data.data;
}

export async function removeItem(itemId: string): Promise<void> {
  await client.delete(`/plaid/items/${itemId}`);
}
