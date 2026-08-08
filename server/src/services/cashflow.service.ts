import { Prisma, type CashFlowItem, type CashFlowOverride } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import {
  computeForecast,
  parseUTCDateString,
  formatUTCDate,
  type CashFlowItemInput,
  type CashFlowFrequencyKind,
} from "../utils/cashflowForecast.js";
import type {
  CashFlowType,
  CreateCashFlowItemInput,
  UpdateCashFlowItemInput,
  UpsertCashFlowOverrideInput,
  UpdateBillsBalanceInput,
} from "@spendlens/shared";

const STALE_BALANCE_DAYS = 7;

function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatOverride(override: CashFlowOverride) {
  return {
    ...override,
    amount: override.amount ? override.amount.toString() : null,
  };
}

function formatItem(item: CashFlowItem & { overrides?: CashFlowOverride[] }) {
  return {
    ...item,
    amount: item.amount.toString(),
    anchorDate: formatUTCDate(item.anchorDate),
    endDate: item.endDate ? formatUTCDate(item.endDate) : null,
    overrides: item.overrides?.map(formatOverride) ?? [],
  };
}

export async function getItems(userId: string, type?: CashFlowType) {
  const items = await prisma.cashFlowItem.findMany({
    where: { userId, ...(type ? { type } : {}) },
    include: { overrides: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
  return items.map(formatItem);
}

export async function createItem(userId: string, input: CreateCashFlowItemInput) {
  const item = await prisma.cashFlowItem.create({
    data: {
      userId,
      type: input.type,
      name: input.name,
      amount: input.amount,
      frequency: input.frequency,
      anchorDate: parseUTCDateString(input.anchorDate),
      endDate: input.endDate ? parseUTCDateString(input.endDate) : null,
      note: input.note ?? null,
    },
    include: { overrides: true },
  });
  return formatItem(item);
}

export async function updateItem(userId: string, itemId: string, input: UpdateCashFlowItemInput) {
  const existing = await prisma.cashFlowItem.findFirst({ where: { id: itemId, userId } });
  if (!existing) {
    throw new NotFoundError("Cash flow item");
  }

  const data: Prisma.CashFlowItemUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.anchorDate !== undefined) data.anchorDate = parseUTCDateString(input.anchorDate);
  if (input.endDate !== undefined) data.endDate = input.endDate ? parseUTCDateString(input.endDate) : null;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.note !== undefined) data.note = input.note;

  const item = await prisma.cashFlowItem.update({
    where: { id: itemId },
    data,
    include: { overrides: true },
  });
  return formatItem(item);
}

export async function deleteItem(userId: string, itemId: string) {
  const existing = await prisma.cashFlowItem.findFirst({ where: { id: itemId, userId } });
  if (!existing) {
    throw new NotFoundError("Cash flow item");
  }
  await prisma.cashFlowItem.delete({ where: { id: itemId } });
}

export async function upsertOverride(userId: string, itemId: string, input: UpsertCashFlowOverrideInput) {
  const item = await prisma.cashFlowItem.findFirst({ where: { id: itemId, userId } });
  if (!item) {
    throw new NotFoundError("Cash flow item");
  }

  const override = await prisma.cashFlowOverride.upsert({
    where: { cashFlowItemId_periodKey: { cashFlowItemId: itemId, periodKey: input.periodKey } },
    create: {
      cashFlowItemId: itemId,
      periodKey: input.periodKey,
      amount: input.amount ?? null,
      isSkipped: input.isSkipped ?? false,
      note: input.note ?? null,
    },
    update: {
      amount: input.amount ?? null,
      isSkipped: input.isSkipped ?? false,
      note: input.note ?? null,
    },
  });
  return formatOverride(override);
}

export async function deleteOverride(userId: string, itemId: string, periodKey: string) {
  const item = await prisma.cashFlowItem.findFirst({ where: { id: itemId, userId } });
  if (!item) {
    throw new NotFoundError("Cash flow item");
  }
  await prisma.cashFlowOverride.deleteMany({ where: { cashFlowItemId: itemId, periodKey } });
}

export async function getBalance(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    throw new NotFoundError("Settings");
  }
  return {
    balance: settings.billsAccountBalance ? settings.billsAccountBalance.toString() : null,
    asOf: settings.billsAccountBalanceAsOf ? formatUTCDate(settings.billsAccountBalanceAsOf) : null,
  };
}

export async function updateBalance(userId: string, input: UpdateBillsBalanceInput) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    throw new NotFoundError("Settings");
  }
  const updated = await prisma.userSettings.update({
    where: { userId },
    data: {
      billsAccountBalance: input.balance,
      billsAccountBalanceAsOf: parseUTCDateString(input.asOf),
    },
  });
  return {
    balance: updated.billsAccountBalance ? updated.billsAccountBalance.toString() : null,
    asOf: updated.billsAccountBalanceAsOf ? formatUTCDate(updated.billsAccountBalanceAsOf) : null,
  };
}

export async function getForecast(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    throw new NotFoundError("Settings");
  }

  if (!settings.billsAccountBalance || !settings.billsAccountBalanceAsOf) {
    return {
      balanceConfigured: false,
      startingBalance: "0.00",
      asOf: null,
      isStale: false,
      snapshots: [],
      alerts: [],
      timeline: [],
      events: [],
    };
  }

  const items = await prisma.cashFlowItem.findMany({
    where: { userId, isActive: true },
    include: { overrides: true },
  });

  const engineItems: CashFlowItemInput[] = items.map((item) => {
    const overridesMap = new Map(
      item.overrides.map((o) => [
        o.periodKey,
        { amountCents: o.amount ? dollarsToCents(o.amount.toNumber()) : null, isSkipped: o.isSkipped },
      ]),
    );
    return {
      id: item.id,
      type: item.type,
      name: item.name,
      amountCents: dollarsToCents(item.amount.toNumber()),
      frequency: item.frequency as CashFlowFrequencyKind,
      anchorDate: item.anchorDate,
      endDate: item.endDate,
      isActive: item.isActive,
      overrides: overridesMap,
    };
  });

  const asOfDate = settings.billsAccountBalanceAsOf;
  const today = new Date();
  const result = computeForecast({
    items: engineItems,
    startingBalanceCents: dollarsToCents(settings.billsAccountBalance.toNumber()),
    asOfDate,
    today,
  });

  const staleDays = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - asOfDate.getTime()) / 86400000);

  return {
    balanceConfigured: true,
    startingBalance: settings.billsAccountBalance.toString(),
    asOf: formatUTCDate(asOfDate),
    isStale: staleDays > STALE_BALANCE_DAYS,
    snapshots: result.snapshots.map((s) => ({
      label: s.label,
      date: formatUTCDate(s.date),
      endingBalance: centsToDollars(s.endingBalanceCents),
      netChange: centsToDollars(s.netChangeCents),
    })),
    alerts: result.alerts.map((a) => ({
      startDate: formatUTCDate(a.startDate),
      endDate: a.endDate ? formatUTCDate(a.endDate) : null,
      lowestBalance: centsToDollars(a.lowestBalanceCents),
      lowestBalanceDate: formatUTCDate(a.lowestBalanceDate),
      events: a.events.map(formatEvent),
    })),
    timeline: result.timeline.map((m) => ({
      month: m.month,
      totalIncome: centsToDollars(m.totalIncomeCents),
      totalBills: centsToDollars(m.totalBillsCents),
      net: centsToDollars(m.netCents),
      endingBalance: centsToDollars(m.endingBalanceCents),
    })),
    events: result.events.map(formatEvent),
  };
}

function formatEvent(ev: {
  date: Date;
  itemId: string;
  itemName: string;
  type: "INCOME" | "BILL";
  cents: number;
  isOverridden: boolean;
}) {
  return {
    date: formatUTCDate(ev.date),
    cashFlowItemId: ev.itemId,
    name: ev.itemName,
    type: ev.type,
    amount: centsToDollars(Math.abs(ev.cents)),
    isOverridden: ev.isOverridden,
  };
}
