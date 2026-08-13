import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  RefreshCw,
  Trash2,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as plaidApi from "../../api/plaid.ts";
import type { PlaidItemWithAccounts, SyncLogEntry } from "../../api/plaid.ts";
import { Card } from "../ui/Card.tsx";
import { Badge } from "../ui/Badge.tsx";
import { Button } from "../ui/Button.tsx";
import { useToast } from "../ui/Toast.tsx";
import { PlaidLinkButton } from "./PlaidLinkButton.tsx";
import { ReconnectButton } from "./ReconnectButton.tsx";

export function ConnectedAccounts() {
  const { toast } = useToast();
  const [items, setItems] = useState<PlaidItemWithAccounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await plaidApi.getAccounts();
      setItems(data);
    } catch {
      toast("error", "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleSync(itemId: string) {
    setSyncing(itemId);
    try {
      const result = await plaidApi.syncTransactions(itemId);
      toast(
        "success",
        `Synced: ${result.added} added, ${result.modified} modified, ${result.removed} removed`,
      );
    } catch {
      toast("error", "Failed to sync transactions");
    } finally {
      setSyncing(null);
    }
  }

  async function handleSyncAll() {
    setSyncing("all");
    try {
      await plaidApi.syncAll();
      toast("success", "All accounts synced");
    } catch {
      toast("error", "Failed to sync accounts");
    } finally {
      setSyncing(null);
    }
  }

  async function handleToggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    setLoadingLogs(true);
    try {
      const logs = await plaidApi.getSyncLogs(50);
      setSyncLogs(logs);
    } catch {
      toast("error", "Failed to load sync history");
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleToggleAccountSetting(
    accountId: string,
    field: "includeInCashFlow" | "includeInSpending",
    value: boolean,
  ) {
    setSavingAccountId(accountId);
    try {
      const updated = await plaidApi.updateAccountSettings(accountId, { [field]: value });
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          accounts: item.accounts.map((account) =>
            account.id === accountId ? { ...account, ...updated } : account,
          ),
        })),
      );
    } catch {
      toast("error", "Failed to update account setting");
    } finally {
      setSavingAccountId(null);
    }
  }

  async function handleRemove(itemId: string, name: string) {
    if (!confirm(`Disconnect ${name}? Synced transactions will be kept.`)) {
      return;
    }
    try {
      await plaidApi.removeItem(itemId);
      toast("success", `Disconnected ${name}`);
      fetchAccounts();
    } catch {
      toast("error", "Failed to disconnect account");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Connected Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your linked bank accounts
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={handleToggleHistory}
              >
                <History className="mr-1.5 h-4 w-4" />
                History
                {showHistory ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSyncAll}
                isLoading={syncing === "all"}
                disabled={syncing !== null}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Sync All
              </Button>
            </>
          )}
          <PlaidLinkButton onSuccess={fetchAccounts} />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="mt-6 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No accounts connected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your bank accounts to start tracking spending automatically.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="font-medium text-gray-900">
                      {item.institutionName || "Unknown Institution"}
                    </span>
                    <Badge
                      color={item.status === "ACTIVE" ? "#22c55e" : "#ef4444"}
                      className="ml-2"
                    >
                      {item.status === "ACTIVE" ? "Active" : item.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSync(item.id)}
                    disabled={syncing !== null}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    title="Sync transactions"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${syncing === item.id ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() =>
                      handleRemove(
                        item.id,
                        item.institutionName || "this institution",
                      )
                    }
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Disconnect"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {item.status !== "ACTIVE" && (
                <div className="flex items-center justify-between gap-2 bg-red-50 px-5 py-2 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Your bank session has expired. Reconnect to resume syncing.
                  </div>
                  <ReconnectButton itemId={item.id} onSuccess={fetchAccounts} />
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {item.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <CreditCard className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-[120px]">
                      <span className="text-sm font-medium text-gray-700">
                        {account.name}
                      </span>
                      {account.mask && (
                        <span className="ml-2 text-xs text-gray-400">
                          ****{account.mask}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 capitalize">
                      {account.subtype || account.type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          handleToggleAccountSetting(
                            account.id,
                            "includeInCashFlow",
                            !account.includeInCashFlow,
                          )
                        }
                        disabled={savingAccountId === account.id}
                        title="Include this account's transactions in Cash Flow reconciliation"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          account.includeInCashFlow
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        Cash Flow
                      </button>
                      <button
                        onClick={() =>
                          handleToggleAccountSetting(
                            account.id,
                            "includeInSpending",
                            !account.includeInSpending,
                          )
                        }
                        disabled={savingAccountId === account.id}
                        title="Include this account's transactions in spending tracking"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          account.includeInSpending
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        Spending
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showHistory && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Sync History</h2>
          {loadingLogs ? (
            <div className="rounded-xl border border-gray-200 bg-white py-8 text-center text-sm text-gray-400">
              Loading…
            </div>
          ) : syncLogs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-8 text-center text-sm text-gray-400">
              No syncs recorded yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium">Account</th>
                    <th className="px-4 py-2 font-medium">Trigger</th>
                    <th className="px-4 py-2 font-medium text-center">Status</th>
                    <th className="px-4 py-2 font-medium text-right">+Added</th>
                    <th className="px-4 py-2 font-medium text-right">~Modified</th>
                    <th className="px-4 py-2 font-medium text-right">−Removed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50" title={log.error ?? undefined}>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {log.plaidItem.institutionName ?? "—"}
                      </td>
                      <td className="px-4 py-2 capitalize text-gray-500">{log.trigger}</td>
                      <td className="px-4 py-2 text-center">
                        {log.status === "SUCCESS" ? (
                          <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-green-700">OK</span>
                        ) : (
                          <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-red-700" title={log.error ?? undefined}>Error</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">+{log.added}</td>
                      <td className="px-4 py-2 text-right text-gray-500">~{log.modified}</td>
                      <td className="px-4 py-2 text-right text-red-500">−{log.removed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
