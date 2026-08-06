import { useCallback, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useToast } from "../ui/Toast.tsx";
import * as plaidApi from "../../api/plaid.ts";
import { RefreshCw } from "lucide-react";

interface ReconnectButtonProps {
  itemId: string;
  onSuccess: () => void;
}

export function ReconnectButton({ itemId, onSuccess }: ReconnectButtonProps) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    try {
      const token = await plaidApi.createUpdateLinkToken(itemId);
      setLinkToken(token);
    } catch {
      toast("error", "Failed to initialize reconnect");
      setLoading(false);
    }
  }, [itemId, toast]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async () => {
      try {
        const result = await plaidApi.reconnectItem(itemId);
        toast("success", `Reconnected — ${result.added} transactions synced`);
        setLinkToken(null);
        onSuccess();
      } catch {
        toast("error", "Failed to complete reconnect");
      } finally {
        setLoading(false);
      }
    },
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  });

  if (linkToken && ready) {
    setTimeout(() => open(), 0);
  }

  return (
    <button
      onClick={fetchToken}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
    >
      <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      Reconnect
    </button>
  );
}
