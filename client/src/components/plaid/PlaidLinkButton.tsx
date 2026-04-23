import { useCallback, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "../ui/Button.tsx";
import { useToast } from "../ui/Toast.tsx";
import * as plaidApi from "../../api/plaid.ts";
import { Plus } from "lucide-react";

interface PlaidLinkButtonProps {
  onSuccess: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    try {
      const token = await plaidApi.createLinkToken();
      setLinkToken(token);
    } catch {
      toast("error", "Failed to initialize bank connection");
      setLoading(false);
    }
  }, [toast]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      try {
        await plaidApi.exchangeToken(
          publicToken,
          metadata.institution?.institution_id,
          metadata.institution?.name,
        );
        toast("success", `Connected to ${metadata.institution?.name || "bank"}`);
        setLinkToken(null);
        onSuccess();
      } catch {
        toast("error", "Failed to connect bank account");
      }
    },
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  });

  // Open Plaid Link when token is ready
  if (linkToken && ready) {
    // Use setTimeout to avoid calling open during render
    setTimeout(() => open(), 0);
  }

  return (
    <Button
      onClick={fetchToken}
      isLoading={loading}
      disabled={loading}
    >
      <Plus className="mr-1.5 h-4 w-4" />
      Connect Bank Account
    </Button>
  );
}
