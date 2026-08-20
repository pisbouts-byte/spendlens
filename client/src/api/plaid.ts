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
  includeInCashFlow: boolean;
  includeInSpending: boolean;
  currentBalance: string | null;
  balanceUpdatedAt: string | null;
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

export async function createUpdateLinkToken(itemId: string): Promise<string> {
  const { data } = await client.post<ApiResponse<LinkTokenResponse>>(
    `/plaid/create-update-link-token/${itemId}`,
  );
  return data.data.linkToken;
}

export async function reconnectItem(itemId: string): Promise<SyncResult> {
  const { data } = await client.post<ApiResponse<SyncResult>>(
    `/plaid/reconnect/${itemId}`,
  );
  return data.data;
}

export interface SyncLogEntry {
  id: string;
  plaidItemId: string;
  trigger: string;
  added: number;
  modified: number;
  removed: number;
  status: "SUCCESS" | "ERROR";
  error: string | null;
  createdAt: string;
  plaidItem: { institutionName: string | null };
}

export async function getSyncLogs(limit = 50): Promise<SyncLogEntry[]> {
  const { data } = await client.get<ApiResponse<SyncLogEntry[]>>(
    `/plaid/sync-logs?limit=${limit}`,
  );
  return data.data;
}

export async function removeItem(itemId: string): Promise<void> {
  await client.delete(`/plaid/items/${itemId}`);
}

export async function updateAccountSettings(
  accountId: string,
  input: { includeInCashFlow?: boolean; includeInSpending?: boolean },
): Promise<PlaidAccount> {
  const { data } = await client.patch<ApiResponse<PlaidAccount>>(
    `/plaid/accounts/${accountId}`,
    input,
  );
  return data.data;
}
