export type CashFlowItemKind = "INCOME" | "BILL";

export type CashFlowFrequencyKind =
  | "ONE_TIME"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

export interface CashFlowOverrideInput {
  amountCents: number | null;
  isSkipped: boolean;
}

export interface CashFlowItemInput {
  id: string;
  type: CashFlowItemKind;
  name: string;
  amountCents: number;
  frequency: CashFlowFrequencyKind;
  anchorDate: Date; // UTC-midnight
  endDate: Date | null; // UTC-midnight
  isActive: boolean;
  overrides: Map<string, CashFlowOverrideInput>; // keyed by periodKey
}

export interface ForecastInput {
  items: CashFlowItemInput[];
  startingBalanceCents: number;
  asOfDate: Date;
  today: Date;
}

export interface CashFlowEventResult {
  date: Date;
  itemId: string;
  itemName: string;
  type: CashFlowItemKind;
  cents: number; // signed: positive for income, negative for bills
  isOverridden: boolean;
}

export interface SnapshotResult {
  label: "endOfMonth" | "endOfYear" | "oneYearOut";
  date: Date;
  endingBalanceCents: number;
  netChangeCents: number;
}

export interface AlertRangeResult {
  startDate: Date;
  endDate: Date | null;
  lowestBalanceCents: number;
  lowestBalanceDate: Date;
  events: CashFlowEventResult[];
}

export interface MonthSummaryResult {
  month: string; // YYYY-MM
  totalIncomeCents: number;
  totalBillsCents: number;
  netCents: number;
  endingBalanceCents: number;
}

export interface ForecastResult {
  snapshots: SnapshotResult[];
  alerts: AlertRangeResult[];
  timeline: MonthSummaryResult[];
  events: CashFlowEventResult[];
}

const MONTHLY_STEP: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUALLY: 6,
  YEARLY: 12,
};

export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function parseUTCDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y as number, (m as number) - 1, d as number));
}

export function formatUTCDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Clamps `day` to the last valid day of the target month (y, m may be outside 0-11). */
function clampToMonth(y: number, m: number, day: number): Date {
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = ((m % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
}

function addMonthsClamped(d: Date, months: number): Date {
  return clampToMonth(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate());
}

/** k-th occurrence of a monthly-family item, always clamped against the ORIGINAL anchor day
 *  (never the previous occurrence's clamped day) so a Jan-31 anchor doesn't permanently drift
 *  to the 28th after landing on a short month once. */
function occurrenceForK(anchor: Date, stepMonths: number, k: number): Date {
  return clampToMonth(anchor.getUTCFullYear(), anchor.getUTCMonth() + k * stepMonths, anchor.getUTCDate());
}

function periodKeyFor(item: CashFlowItemInput, occ: Date): string {
  if (item.frequency === "WEEKLY" || item.frequency === "BIWEEKLY") {
    return formatUTCDate(occ);
  }
  const y = occ.getUTCFullYear();
  const m = String(occ.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function generateOccurrences(item: CashFlowItemInput, asOfDate: Date, horizonEnd: Date): Date[] {
  if (!item.isActive) return [];
  const results: Date[] = [];
  const asOfMs = asOfDate.getTime();
  const horizonMs = horizonEnd.getTime();
  const endMs = item.endDate ? item.endDate.getTime() : null;

  if (item.frequency === "ONE_TIME") {
    const t = item.anchorDate.getTime();
    if (t > asOfMs && t <= horizonMs) results.push(item.anchorDate);
    return results;
  }

  if (item.frequency === "WEEKLY" || item.frequency === "BIWEEKLY") {
    const stepMs = (item.frequency === "WEEKLY" ? 7 : 14) * 86400000;
    let kStart = Math.floor((asOfMs - item.anchorDate.getTime()) / stepMs) - 1;
    if (kStart < 0) kStart = 0;
    for (let k = kStart; ; k++) {
      const occ = new Date(item.anchorDate.getTime() + k * stepMs);
      if (occ.getTime() > horizonMs) break;
      if (endMs !== null && occ.getTime() > endMs) break;
      if (occ.getTime() > asOfMs) results.push(occ);
    }
    return results;
  }

  const stepMonths = MONTHLY_STEP[item.frequency] as number;
  const anchorMonthIndex = item.anchorDate.getUTCFullYear() * 12 + item.anchorDate.getUTCMonth();
  const asOfMonthIndex = asOfDate.getUTCFullYear() * 12 + asOfDate.getUTCMonth();
  let kStart = Math.floor((asOfMonthIndex - anchorMonthIndex) / stepMonths) - 1;
  if (kStart < 0) kStart = 0;
  for (let k = kStart; ; k++) {
    const occ = occurrenceForK(item.anchorDate, stepMonths, k);
    if (occ.getTime() > horizonMs) break;
    if (endMs !== null && occ.getTime() > endMs) break;
    if (occ.getTime() > asOfMs) results.push(occ);
  }
  return results;
}

function eventsForItem(item: CashFlowItemInput, asOfDate: Date, horizonEnd: Date): CashFlowEventResult[] {
  const occurrences = generateOccurrences(item, asOfDate, horizonEnd);
  const events: CashFlowEventResult[] = [];
  for (const occ of occurrences) {
    let cents = item.amountCents;
    let isOverridden = false;
    if (item.frequency !== "ONE_TIME") {
      const override = item.overrides.get(periodKeyFor(item, occ));
      if (override) {
        if (override.isSkipped) continue;
        if (override.amountCents !== null) {
          cents = override.amountCents;
          isOverridden = true;
        }
      }
    }
    events.push({
      date: occ,
      itemId: item.id,
      itemName: item.name,
      type: item.type,
      cents: item.type === "INCOME" ? cents : -cents,
      isOverridden,
    });
  }
  return events;
}

export function computeForecast(input: ForecastInput): ForecastResult {
  const today = utcMidnight(input.today);
  const asOfDate = utcMidnight(input.asOfDate);
  const horizonEnd = addMonthsClamped(today, 12);

  const events: CashFlowEventResult[] = [];
  for (const item of input.items) {
    events.push(...eventsForItem(item, asOfDate, horizonEnd));
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime() || a.itemId.localeCompare(b.itemId));

  const runningAtEvent: number[] = [];
  let running = input.startingBalanceCents;
  for (const ev of events) {
    running += ev.cents;
    runningAtEvent.push(running);
  }

  // --- Snapshots ---
  const endOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  const endOfYear = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));
  const snapshotDefs: { label: SnapshotResult["label"]; date: Date }[] = [
    { label: "endOfMonth", date: endOfMonth },
    { label: "endOfYear", date: endOfYear },
    { label: "oneYearOut", date: horizonEnd },
  ];
  const snapshots: SnapshotResult[] = snapshotDefs.map(({ label, date }) => {
    let balance = input.startingBalanceCents;
    for (let i = 0; i < events.length; i++) {
      if ((events[i] as CashFlowEventResult).date.getTime() <= date.getTime()) {
        balance = runningAtEvent[i] as number;
      } else {
        break;
      }
    }
    return { label, date, endingBalanceCents: balance, netChangeCents: balance - input.startingBalanceCents };
  });

  // --- Alerts: contiguous negative-balance ranges ---
  const alerts: AlertRangeResult[] = [];
  let currentRange: AlertRangeResult | null = null;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i] as CashFlowEventResult;
    const bal = runningAtEvent[i] as number;
    if (bal < 0) {
      if (!currentRange) {
        currentRange = {
          startDate: ev.date,
          endDate: null,
          lowestBalanceCents: bal,
          lowestBalanceDate: ev.date,
          events: [ev],
        };
      } else {
        currentRange.events.push(ev);
        if (bal < currentRange.lowestBalanceCents) {
          currentRange.lowestBalanceCents = bal;
          currentRange.lowestBalanceDate = ev.date;
        }
      }
    } else if (currentRange) {
      currentRange.endDate = ev.date;
      alerts.push(currentRange);
      currentRange = null;
    }
  }
  if (currentRange) alerts.push(currentRange);

  // --- 12-month timeline ---
  const timeline: MonthSummaryResult[] = [];
  let monthCursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const horizonMonthCursor = new Date(Date.UTC(horizonEnd.getUTCFullYear(), horizonEnd.getUTCMonth(), 1));
  let runningForTimeline = input.startingBalanceCents;
  let eventIdx = 0;
  while (monthCursor.getTime() <= horizonMonthCursor.getTime()) {
    const monthEnd = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0));
    let totalIncome = 0;
    let totalBills = 0;
    while (eventIdx < events.length && (events[eventIdx] as CashFlowEventResult).date.getTime() <= monthEnd.getTime()) {
      const ev = events[eventIdx] as CashFlowEventResult;
      if (ev.type === "INCOME") totalIncome += ev.cents;
      else totalBills += -ev.cents;
      runningForTimeline += ev.cents;
      eventIdx++;
    }
    const monthKey = `${monthCursor.getUTCFullYear()}-${String(monthCursor.getUTCMonth() + 1).padStart(2, "0")}`;
    timeline.push({
      month: monthKey,
      totalIncomeCents: totalIncome,
      totalBillsCents: totalBills,
      netCents: totalIncome - totalBills,
      endingBalanceCents: runningForTimeline,
    });
    monthCursor = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 1));
  }

  return { snapshots, alerts, timeline, events };
}
