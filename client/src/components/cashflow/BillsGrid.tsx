import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import type { CashFlowEvent, CashFlowForecast } from "@spendlens/shared";
import * as cashflowApi from "../../api/cashflow.ts";
import { useToast } from "../ui/Toast.tsx";

const PERIOD_COUNT = 10;
const DAY_MS = 86400000;
const LABEL_COL = "200px";
const PERIOD_COL = "116px";

interface BillsGridProps {
  forecast: CashFlowForecast;
  payPeriodLengthDays: number | null;
  payPeriodAnchorDate: string | null;
  onChanged: () => void | Promise<void>;
}

interface Period {
  index: number;
  startMs: number;
  label: string;
}

interface GridRow {
  id: string;
  name: string;
  cells: (CashFlowEvent | undefined)[];
}

interface UnplannedCell {
  items: CashFlowEvent[];
  total: number;
}

interface LedgerColumn {
  startBalance: number;
  income: number;
  needToPay: number;
  extra: number;
}

function parseUTCDate(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00Z`);
}

function formatCurrency(value: number): string {
  return Math.abs(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function buildPeriods(anchorDate: string, lengthDays: number): Period[] {
  const anchorMs = parseUTCDate(anchorDate);
  const lengthMs = lengthDays * DAY_MS;
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const currentIndex = Math.floor((todayMs - anchorMs) / lengthMs);

  const periods: Period[] = [];
  for (let i = 0; i < PERIOD_COUNT; i++) {
    const index = currentIndex + i;
    const startMs = anchorMs + index * lengthMs;
    const endMs = startMs + lengthMs - DAY_MS;
    const label =
      new Date(startMs).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) +
      " – " +
      new Date(endMs).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    periods.push({ index, startMs, label });
  }
  return periods;
}

function periodIndexFor(dateStr: string, anchorMs: number, lengthMs: number): number {
  return Math.floor((parseUTCDate(dateStr) - anchorMs) / lengthMs);
}

function gridTemplate(periodCount: number): string {
  return `${LABEL_COL} repeat(${periodCount}, ${PERIOD_COL})`;
}

export function BillsGrid({ forecast, payPeriodLengthDays, payPeriodAnchorDate, onChanged }: BillsGridProps) {
  const { toast } = useToast();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const periods = useMemo(() => {
    if (!payPeriodLengthDays || !payPeriodAnchorDate) return [];
    return buildPeriods(payPeriodAnchorDate, payPeriodLengthDays);
  }, [payPeriodLengthDays, payPeriodAnchorDate]);

  const { rows, unplannedRows, ledger } = useMemo(() => {
    if (periods.length === 0 || !payPeriodLengthDays || !payPeriodAnchorDate) {
      return { rows: [] as GridRow[], unplannedRows: [] as { label: string; cells: (UnplannedCell | undefined)[] }[], ledger: [] as LedgerColumn[] };
    }
    const lengthMs = payPeriodLengthDays * DAY_MS;
    const anchorMs = parseUTCDate(payPeriodAnchorDate);
    const firstIndex = periods[0].index;
    const lastIndex = periods[periods.length - 1].index;
    const inRange = (idx: number) => idx >= firstIndex && idx <= lastIndex;

    // Recurring bills: one row per CashFlowItem, cells aligned to `periods`.
    // Unexpected transactions are excluded here (they share a single
    // "unexpected" cashFlowItemId in forecast.events) — they're handled
    // separately below via forecast.unexpectedTransactions instead.
    const billMap = new Map<string, { name: string; cells: Map<number, CashFlowEvent> }>();
    for (const ev of forecast.events) {
      if (ev.type !== "BILL" || ev.isUnexpected) continue;
      const idx = periodIndexFor(ev.date, anchorMs, lengthMs);
      if (!inRange(idx)) continue;
      let row = billMap.get(ev.cashFlowItemId);
      if (!row) {
        row = { name: ev.name, cells: new Map() };
        billMap.set(ev.cashFlowItemId, row);
      }
      row.cells.set(idx, ev);
    }
    const rows: GridRow[] = Array.from(billMap.entries())
      .map(([id, r]) => ({ id, name: r.name, cells: periods.map((p) => r.cells.get(p.index)) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Unplanned/unexpected transactions: grouped by period, spread across 3
    // generic rows (1st item, 2nd item, rest summed) so the common case is
    // visible without a hover, and overflow is still reachable via hover.
    const unplannedByPeriod = new Map<number, CashFlowEvent[]>();
    for (const ev of forecast.unexpectedTransactions) {
      const idx = periodIndexFor(ev.date, anchorMs, lengthMs);
      if (!inRange(idx)) continue;
      const list = unplannedByPeriod.get(idx) ?? [];
      list.push(ev);
      unplannedByPeriod.set(idx, list);
    }
    function slotCell(items: CashFlowEvent[]): UnplannedCell | undefined {
      if (items.length === 0) return undefined;
      return { items, total: items.reduce((s, e) => s + parseFloat(e.amount), 0) };
    }
    const unplannedRows = [
      { label: "Unplanned charges", slice: [0, 1] as [number, number] },
      { label: "", slice: [1, 2] as [number, number] },
      { label: "", slice: [2, Infinity] as [number, number] },
    ].map(({ label, slice }) => ({
      label,
      cells: periods.map((p) => slotCell((unplannedByPeriod.get(p.index) ?? []).slice(slice[0], slice[1]))),
    }));

    // Ledger: starting balance carries forward using every planned bill
    // (paid or not) so it reflects the true forecast trajectory; "need to
    // pay" / "extra" are the personal to-do countdown that moves as bills
    // get marked paid.
    let runningStart = parseFloat(forecast.startingBalance);
    const ledger: LedgerColumn[] = periods.map((p) => {
      const periodEvents = forecast.events.filter(
        (ev) => !ev.isUnexpected && periodIndexFor(ev.date, anchorMs, lengthMs) === p.index,
      );
      const income = periodEvents.filter((ev) => ev.type === "INCOME").reduce((s, ev) => s + parseFloat(ev.amount), 0);
      const allBills = periodEvents.filter((ev) => ev.type === "BILL").reduce((s, ev) => s + parseFloat(ev.amount), 0);
      const needToPay = periodEvents
        .filter((ev) => ev.type === "BILL" && !ev.isPaid)
        .reduce((s, ev) => s + parseFloat(ev.amount), 0);
      const startBalance = runningStart;
      const extra = startBalance + income - needToPay;
      runningStart = startBalance + income - allBills;
      return { startBalance, income, needToPay, extra };
    });

    return { rows, unplannedRows, ledger };
  }, [periods, forecast, payPeriodLengthDays, payPeriodAnchorDate]);

  async function handleToggle(event: CashFlowEvent) {
    if (event.isReconciled) return;
    const key = `${event.cashFlowItemId}|${event.date}`;
    setTogglingKey(key);
    try {
      if (event.isPaid) {
        await cashflowApi.unmarkPaid(event.cashFlowItemId, event.date);
      } else {
        await cashflowApi.markPaid(event.cashFlowItemId, event.date);
      }
      await onChanged();
    } catch {
      toast("error", "Failed to update payment status");
    } finally {
      setTogglingKey(null);
    }
  }

  if (!payPeriodLengthDays || !payPeriodAnchorDate) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Set up your pay period in{" "}
          <Link to="/settings" className="font-medium text-brand-600 hover:text-brand-700">
            Settings
          </Link>{" "}
          to see the Bills Grid.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start gap-5 border-b border-gray-100 px-4 py-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 flex-shrink-0 rounded border border-gray-300 bg-white" />
          Pending
        </span>
        <span className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 flex-shrink-0 rounded border border-green-300 bg-green-50" />
            Paid
          </span>
          <span className="ml-[18px] text-[10px] text-gray-400">marked done — click to undo</span>
        </span>
        <span className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 flex-shrink-0 rounded border border-blue-300 bg-blue-50" />
            Synced from bank
          </span>
          <span className="ml-[18px] text-[10px] text-gray-400">auto-matched — can't be undone here</span>
        </span>
        <span className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 flex-shrink-0 rounded border border-dashed border-amber-300 bg-amber-50" />
            Unplanned
          </span>
          <span className="ml-[18px] text-[10px] text-gray-400">hover a cell for details</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: gridTemplate(periods.length) }}>
            <div className="sticky left-0 bg-gray-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Biller
            </div>
            {periods.map((p) => (
              <div key={p.index} className="border-l border-gray-100 px-2 py-2 text-right text-xs font-semibold text-gray-600">
                {p.label}
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-400">No active bills in this range.</div>
          )}

          {rows.map((row, i) => {
            const rowBg = i % 2 === 1 ? "bg-gray-50/60" : "bg-white";
            return (
              <div
                key={row.id}
                className="grid border-b border-gray-100"
                style={{ gridTemplateColumns: gridTemplate(periods.length) }}
              >
                <div className={`sticky left-0 truncate px-4 py-2 text-sm text-gray-800 ${rowBg}`}>{row.name}</div>
                {row.cells.map((cell, j) => (
                  <GridCell key={j} event={cell} togglingKey={togglingKey} onToggle={handleToggle} />
                ))}
              </div>
            );
          })}

          {unplannedRows.map((row, i) => (
            <div key={`unplanned-${i}`} className="grid border-b border-gray-100" style={{ gridTemplateColumns: gridTemplate(periods.length) }}>
              <div className="sticky left-0 bg-white px-4 py-2 text-sm font-medium text-amber-700">{row.label}</div>
              {row.cells.map((cell, j) => (
                <UnplannedGridCell key={j} cell={cell} />
              ))}
            </div>
          ))}

          <div className="grid border-t-2 border-gray-200 bg-gray-50" style={{ gridTemplateColumns: gridTemplate(periods.length) }}>
            <div className="sticky left-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">Starting balance</div>
            {ledger.map((l, i) => (
              <div key={i} className="border-l border-gray-200 px-2 py-2 text-right text-sm text-gray-700">
                {formatCurrency(l.startBalance)}
              </div>
            ))}
          </div>
          <div className="grid bg-gray-50" style={{ gridTemplateColumns: gridTemplate(periods.length) }}>
            <div className="sticky left-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">Income</div>
            {ledger.map((l, i) => (
              <div key={i} className="border-l border-gray-200 px-2 py-2 text-right text-sm text-green-600">
                {formatCurrency(l.income)}
              </div>
            ))}
          </div>
          <div className="grid border-t border-gray-200 bg-gray-50" style={{ gridTemplateColumns: gridTemplate(periods.length) }}>
            <div className="sticky left-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
              Need to pay <span className="font-normal text-gray-400">(unpaid only)</span>
            </div>
            {ledger.map((l, i) => (
              <div key={i} className="border-l border-gray-200 px-2 py-2 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(l.needToPay)}
              </div>
            ))}
          </div>
          <div className="grid rounded-b-xl border-t border-gray-200 bg-gray-100" style={{ gridTemplateColumns: gridTemplate(periods.length) }}>
            <div className="sticky left-0 rounded-bl-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-900">Extra</div>
            {ledger.map((l, i) => (
              <div
                key={i}
                className={`border-l border-gray-200 px-2 py-2.5 text-right text-sm font-bold ${l.extra >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {l.extra < 0 ? "-" : ""}
                {formatCurrency(l.extra)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GridCell({
  event,
  togglingKey,
  onToggle,
}: {
  event: CashFlowEvent | undefined;
  togglingKey: string | null;
  onToggle: (event: CashFlowEvent) => void;
}) {
  if (!event) return <div className="border-l border-gray-100" />;

  const key = `${event.cashFlowItemId}|${event.date}`;
  const isToggling = togglingKey === key;
  const amount = formatCurrency(parseFloat(event.amount));

  if (event.isReconciled) {
    return (
      <div className="flex cursor-default items-center justify-end gap-1 border-l border-gray-100 bg-blue-50 px-2 py-2 text-sm text-blue-700">
        <Link2 className="h-2.5 w-2.5 flex-shrink-0" />
        <span className="line-through decoration-blue-300">{amount}</span>
      </div>
    );
  }

  if (event.isPaid) {
    return (
      <button
        onClick={() => onToggle(event)}
        disabled={isToggling}
        title="Mark as unpaid"
        className="w-full border-l border-gray-100 bg-green-50 px-2 py-2 text-right text-sm text-green-700 transition-colors hover:bg-green-100 disabled:opacity-60"
      >
        <span className="line-through decoration-green-300">{amount}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onToggle(event)}
      disabled={isToggling}
      title="Mark as paid"
      className="w-full border-l border-gray-100 px-2 py-2 text-right text-sm text-gray-900 transition-colors hover:bg-blue-50 disabled:opacity-60"
    >
      {amount}
    </button>
  );
}

function UnplannedGridCell({ cell }: { cell: UnplannedCell | undefined }) {
  if (!cell) return <div className="border-l border-gray-100" />;

  return (
    <div className="group relative border-l border-dashed border-amber-300 bg-amber-50 px-2 py-2 text-right text-sm text-amber-800">
      {formatCurrency(cell.total)}
      {cell.items.length > 1 && <span className="ml-0.5 text-[9px] font-bold text-amber-600">×{cell.items.length}</span>}
      <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden min-w-max rounded-lg bg-gray-900 px-2.5 py-2 text-left text-xs text-white shadow-lg group-hover:block">
        {cell.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-0.5">
            <span>{it.name}</span>
            <span className="font-semibold">{formatCurrency(parseFloat(it.amount))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
