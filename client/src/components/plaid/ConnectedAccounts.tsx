import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  RefreshCw,
  Trash2,
  AlertCircle,
} from "lucide-react";
import * as plaidApi from "../../api/plaid.ts";
import type { PlaidItemWithAccounts } from "../../api/plaid.ts";
import { Card } from "../ui/Card.tsx";
import { Badge } from "../ui/Badge.tsx";
import { Button } from "../ui/Button.tsx";
import { useToast } from "../ui/Toast.tsx";
import { PlaidLinkButton } from "./PlaidLinkButton.tsx";

export function ConnectedAccounts() {
  const { toast } = useToast();
  const [items, setItems] = useState<PlaidItemWithAccounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

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
            <Button
              variant="secondary"
              onClick={handleSyncAll}
              isLoading={syncing === "all"}
              disabled={syncing !== null}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Sync All
            </Button>
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
                <div className="flex items-center gap-2 bg-red-50 px-5 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Connection error. Please reconnect this account.
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {item.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
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
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
