import { useEffect, useState } from "react";
import * as settingsApi from "../api/settings.ts";
import * as authApi from "../api/auth.ts";
import type { UserSettings } from "../api/settings.ts";
import { Button } from "../components/ui/Button.tsx";
import { Select } from "../components/ui/Select.tsx";
import { Card, CardContent, CardHeader } from "../components/ui/Card.tsx";
import { useToast } from "../components/ui/Toast.tsx";
import { useAuth } from "../hooks/useAuth.ts";

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (\u20ac)" },
  { value: "GBP", label: "GBP (\u00a3)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "JPY", label: "JPY (\u00a5)" },
];

export function SettingsPage() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [weekStartDay, setWeekStartDay] = useState("1");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    settingsApi
      .getSettings()
      .then((s) => {
        setSettings(s);
        setWeekStartDay(String(s.weekStartDay));
        setCurrency(s.currency);
      })
      .catch(() => toast("error", "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleSave() {
    if (!settings) return;

    const updates: { weekStartDay?: number; currency?: string } = {};
    const newDay = parseInt(weekStartDay, 10);
    if (newDay !== settings.weekStartDay) updates.weekStartDay = newDay;
    if (currency !== settings.currency) updates.currency = currency;

    if (Object.keys(updates).length === 0) {
      toast("info", "No changes to save");
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsApi.updateSettings(updates);
      setSettings(updated);
      toast("success", "Settings saved");
    } catch {
      toast("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Configure your Budget Wisely preferences
      </p>

      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
        </CardHeader>
        <CardContent className="space-y-5">
          <Select
            label="Week starts on"
            value={weekStartDay}
            onChange={(e) => setWeekStartDay(e.target.value)}
            options={DAY_OPTIONS}
          />
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={CURRENCY_OPTIONS}
          />
          <div className="pt-2">
            <Button onClick={handleSave} isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="mt-8 max-w-lg border-red-200">
        <CardHeader>
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete your account and all associated data including
            transactions, categories, budgets, and linked bank connections. This
            action cannot be undone.
          </p>
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Account
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete your account and all your data. This
              action is irreversible.
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Type <span className="font-semibold text-red-600">DELETE</span> to
              confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <Button
                variant="danger"
                disabled={deleteConfirmText !== "DELETE" || deleting}
                isLoading={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await authApi.deleteAccount();
                    toast("success", "Account deleted successfully");
                    logout();
                  } catch {
                    toast("error", "Failed to delete account. Please try again.");
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
