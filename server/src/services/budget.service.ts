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

      // Calculate spent amount for this period
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

      const spent = aggregate._sum.amount?.toNumber() ?? 0;
      const budgetAmount = budget.amount.toNumber();
      const remaining = Math.max(0, budgetAmount - spent);
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

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
      };
    }),
  );

  return results;
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
