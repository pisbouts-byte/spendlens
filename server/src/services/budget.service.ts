import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError, BadRequestError, ConflictError } from "../utils/errors.js";
import type {
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetProgressQuery,
} from "@spendlens/shared";

export async function getBudgets(userId: string) {
  return prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
}

export async function createBudget(userId: string, input: CreateBudgetInput) {
  // Validate category belongs to user if specified
  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, userId },
    });
    if (!category) {
      throw new NotFoundError("Category");
    }
  }

  // Check for duplicate budget (same user, category, type)
  const existing = await prisma.budget.findFirst({
    where: {
      userId,
      categoryId: input.categoryId,
      type: input.type,
    },
  });
  if (existing) {
    throw new ConflictError(
      `A ${input.type.toLowerCase()} budget already exists for this ${input.categoryId ? "category" : "overall spending"}`,
    );
  }

  return prisma.budget.create({
    data: {
      userId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
    },
    include: { category: true },
  });
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput,
) {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });

  if (!budget) {
    throw new NotFoundError("Budget");
  }

  return prisma.budget.update({
    where: { id: budgetId },
    data: input,
    include: { category: true },
  });
}

export async function deleteBudget(userId: string, budgetId: string) {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });

  if (!budget) {
    throw new NotFoundError("Budget");
  }

  await prisma.budget.delete({ where: { id: budgetId } });
}

export async function getBudgetProgress(
  userId: string,
  query: BudgetProgressQuery,
) {
  // Get user settings for week start day
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const weekStartDay = settings?.weekStartDay ?? 1; // default Monday

  const referenceDate = query.date ? new Date(query.date) : new Date();

  // Get active budgets, optionally filtered by type
  const where: Prisma.BudgetWhereInput = { userId, isActive: true };
  if (query.type) {
    where.type = query.type;
  }

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
  });

  const results = await Promise.all(
    budgets.map(async (budget) => {
      const { periodStart, periodEnd } = getPeriodBounds(
        budget.type,
        referenceDate,
        weekStartDay,
      );
      const periodKey = formatDateKey(periodStart);

      const spent = await getSpendForPeriod(userId, budget, periodStart, periodEnd);
      const budgetAmount = budget.amount.toNumber();

      const [carryoverIn, carriedOverOut] = await Promise.all([
        prisma.budgetCarryover.findUnique({
          where: { budgetId_periodStart: { budgetId: budget.id, periodStart: periodKey } },
        }),
        prisma.budgetCarryover.findFirst({
          where: { budgetId: budget.id, sourcePeriodStart: periodKey },
        }),
      ]);

      const carryoverAmount = carryoverIn ? carryoverIn.amount.toNumber() : 0;
      const adjustedAmount = budgetAmount + carryoverAmount;
      const remaining = Math.max(0, adjustedAmount - spent);
      const percentageDivisor = Math.max(adjustedAmount, 0.01);
      const percentage = (spent / percentageDivisor) * 100;

      return {
        budget: {
          ...budget,
          amount: budget.amount.toString(),
          category: budget.category
            ? {
                ...budget.category,
              }
            : null,
        },
        spent: spent.toFixed(2),
        remaining: remaining.toFixed(2),
        percentage: Math.round(percentage * 100) / 100,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        adjustedAmount: adjustedAmount.toFixed(2),
        carryoverIn: carryoverIn
          ? {
              amount: carryoverIn.amount.toString(),
              sourcePeriodStart: carryoverIn.sourcePeriodStart,
              sourceOverage: carryoverIn.sourceOverage.toString(),
            }
          : null,
        carriedOverTo: carriedOverOut ? carriedOverOut.periodStart : null,
      };
    }),
  );

  return results;
}

export async function carryOverBudget(userId: string, budgetId: string, periodStartKey: string) {
  const budget = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!budget) {
    throw new NotFoundError("Budget");
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const weekStartDay = settings?.weekStartDay ?? 1;

  const referenceDate = parseDateKeyLocal(periodStartKey);
  const { periodStart, periodEnd } = getPeriodBounds(budget.type, referenceDate, weekStartDay);

  if (periodEnd.getTime() > Date.now()) {
    throw new BadRequestError("Can't carry over a period that hasn't ended yet");
  }

  const spend = await getSpendForPeriod(userId, budget, periodStart, periodEnd);
  const overage = spend - budget.amount.toNumber();
  if (overage <= 0) {
    throw new BadRequestError("This period wasn't over budget");
  }

  const { periodStart: nextStart } = getNextPeriodBounds(budget.type, periodEnd, weekStartDay);
  const nextPeriodKey = formatDateKey(nextStart);
  const sourcePeriodKey = formatDateKey(periodStart);

  const carryover = await prisma.budgetCarryover.upsert({
    where: { budgetId_periodStart: { budgetId, periodStart: nextPeriodKey } },
    create: {
      budgetId,
      periodStart: nextPeriodKey,
      amount: -overage,
      sourcePeriodStart: sourcePeriodKey,
      sourceOverage: overage,
    },
    update: {
      amount: -overage,
      sourcePeriodStart: sourcePeriodKey,
      sourceOverage: overage,
    },
  });

  return {
    ...carryover,
    amount: carryover.amount.toString(),
    sourceOverage: carryover.sourceOverage.toString(),
  };
}

export async function removeCarryover(userId: string, budgetId: string, periodStartKey: string) {
  const budget = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!budget) {
    throw new NotFoundError("Budget");
  }
  await prisma.budgetCarryover.deleteMany({ where: { budgetId, periodStart: periodStartKey } });
}

async function getSpendForPeriod(
  userId: string,
  budget: { categoryId: string | null },
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  const txnWhere: Prisma.TransactionWhereInput = {
    userId,
    isExcluded: false,
    date: { gte: periodStart, lte: periodEnd },
    amount: { gt: 0 }, // Only expenses (positive amounts in Plaid = spending)
  };

  if (budget.categoryId) {
    txnWhere.categoryId = budget.categoryId;
  }

  const aggregate = await prisma.transaction.aggregate({
    where: txnWhere,
    _sum: { amount: true },
  });

  return aggregate._sum.amount?.toNumber() ?? 0;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKeyLocal(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y as number, (m as number) - 1, d as number);
}

function getNextPeriodBounds(
  type: string,
  currentPeriodEnd: Date,
  weekStartDay: number,
): { periodStart: Date; periodEnd: Date } {
  const dayAfter = new Date(currentPeriodEnd.getTime() + 1);
  return getPeriodBounds(type, dayAfter, weekStartDay);
}

function getPeriodBounds(
  type: string,
  referenceDate: Date,
  weekStartDay: number,
): { periodStart: Date; periodEnd: Date } {
  if (type === "MONTHLY") {
    const periodStart = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1,
    );
    const periodEnd = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0, // last day of month
      23,
      59,
      59,
      999,
    );
    return { periodStart, periodEnd };
  }

  // WEEKLY
  const day = referenceDate.getDay(); // 0=Sun, 1=Mon, ...
  let diff = day - weekStartDay;
  if (diff < 0) diff += 7;

  const periodStart = new Date(referenceDate);
  periodStart.setDate(referenceDate.getDate() - diff);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + 6);
  periodEnd.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd };
}
