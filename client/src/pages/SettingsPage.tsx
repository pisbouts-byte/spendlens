import { useEffect, useState } from "react";
import * as settingsApi from "../api/settings.ts";
import type { UserSettings } from "../api/settings.ts";
import { Button } from "../components/ui/Button.tsx";
import { Select } from "../components/ui/Select.tsx";
import { Card, CardContent, CardHeader } from "../components/ui/Card.tsx";
import { useToast } from "../components/ui/Toast.tsx";

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
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        Configure your SpendLens preferences
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
    </div>
  );
}
