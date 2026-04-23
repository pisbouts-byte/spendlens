import type { ApiResponse } from "@spendlens/shared";
import client from "./client.ts";

export interface RecurringPattern {
  id: string;
  merchantName: string;
  amount: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  confidence: number;
  detectionType: "KNOWN_MERCHANT" | "PATTERN_DETECTED";
  lastSeen: string;
  nextExpected: string | null;
  isActive: boolean;
  isDismissed: boolean;
  occurrences: number;
  categoryId: string | null;
  category?: { id: string; name: string; color: string; icon: string } | null;
}

export interface RecurringSummary {
  patterns: RecurringPattern[];
  monthlyTotal: string;
  yearlyTotal: string;
}

export async function getRecurringPatterns(): Promise<RecurringSummary> {
  const res = await client.get<ApiResponse<RecurringSummary>>("/recurring");
  return res.data.data;
}

export async function dismissPattern(id: string): Promise<void> {
  await client.patch(`/recurring/${id}/dismiss`);
}

export async function togglePatternActive(id: string): Promise<RecurringPattern> {
  const res = await client.patch<ApiResponse<RecurringPattern>>(`/recurring/${id}/toggle`);
  return res.data.data;
}

export async function updateFrequency(
  id: string,
  frequency: RecurringPattern["frequency"],
): Promise<RecurringPattern> {
  const res = await client.patch<ApiResponse<RecurringPattern>>(
    `/recurring/${id}/frequency`,
    { frequency },
  );
  return res.data.data;
}
