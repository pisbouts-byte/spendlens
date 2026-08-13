import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  BulkUpdateTransactionsInput,
  TransactionQuery,
} from "@spendlens/shared";

const RECONCILE_DATE_WINDOW_MS = 5 * 86400000;

export async function getTransactions(userId: string, query: TransactionQuery) {
  const where: Prisma.TransactionWhereInput = { userId };

  if (query.startDate) {
    where.date = { ...((where.date as Prisma.DateTimeFilter) || {}), gte: new Date(query.startDate) };
  }
  if (query.endDate) {
    where.date = { ...((where.date as Prisma.DateTimeFilter) || {}), lte: new Date(query.endDate) };
  }
  if (query.categoryId) {
    where.categoryId = query.categoryId === "uncategorized" ? null : query.categoryId;
  }
  if (query.accountId === "unlinked") {
    where.plaidAccountId = null;
  } else if (query.accountId) {
    where.plaidAccountId = query.accountId;
  }
  if (query.isExcluded === "true") {
    where.isExcluded = true;
  } else if (query.isExcluded === "false") {
    where.isExcluded = false;
  }
  if (query.search) {
    where.OR = [
      { merchantName: { contains: query.search, mode: "insensitive" } },
      { originalName: { contains: query.search, mode: "insensitive" } },
      { notes: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Record<string, string> = {
    [query.sortBy]: query.sortOrder,
  };

  const [transactions, total, uncategorizedTotal] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        category: true,
        plaidAccount: true,
      },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.count({ where: { userId, categoryId: null } }),
  ]);

  return {
    data: transactions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
    uncategorizedTotal,
  };
}

export async function getTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { category: true, plaidAccount: true },
  });

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  return transaction;
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount: input.amount,
      originalName: input.name,
      date: new Date(input.date),
      categoryId: input.categoryId ?? null,
      notes: input.notes ?? null,
      isManual: true,
    },
    include: { category: true, plaidAccount: true },
  });
  return transaction;
}

export async function unlinkTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, isManual: true },
  });

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }
  if (!transaction.matchedTransactionId) {
    throw new BadRequestError("This transaction isn't reconciled");
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: { matchedTransactionId: null, isExcluded: false },
    include: { category: true, plaidAccount: true },
  });
  return updated;
}

// Fuzzy-matches newly-synced transactions against the user's still-pending manual entries
// (e.g. an expected refund), linking a match via matchedTransactionId and excluding the
// manual row from totals so it stops double-counting once the real transaction has landed.
export async function reconcileManualTransactions(
  userId: string,
  addedTransactions: { id: string; amount: Prisma.Decimal; date: Date }[],
) {
  if (addedTransactions.length === 0) return;

  const pending = await prisma.transaction.findMany({
    where: { userId, isManual: true, matchedTransactionId: null, isExcluded: false },
  });
  if (pending.length === 0) return;

  const used = new Set<string>();
  for (const manual of pending) {
    const manualAmt = manual.amount.toNumber();
    let best: { txn: (typeof addedTransactions)[number]; dateDiff: number; amtDiff: number } | null = null;

    for (const txn of addedTransactions) {
      if (used.has(txn.id)) continue;
      const amt = txn.amount.toNumber();
      if (manualAmt > 0 !== amt > 0) continue; // same sign (expense vs. income)
      const dateDiff = Math.abs(txn.date.getTime() - manual.date.getTime());
      if (dateDiff > RECONCILE_DATE_WINDOW_MS) continue;
      const expectedCents = Math.round(Math.abs(manualAmt) * 100);
      const actualCents = Math.round(Math.abs(amt) * 100);
      const tolerance = Math.max(1000, expectedCents * 0.1);
      const amtDiff = Math.abs(actualCents - expectedCents);
      if (amtDiff > tolerance) continue;
      if (!best || dateDiff < best.dateDiff || (dateDiff === best.dateDiff && amtDiff < best.amtDiff)) {
        best = { txn, dateDiff, amtDiff };
      }
    }

    if (best) {
      used.add(best.txn.id);
      await prisma.transaction.update({
        where: { id: manual.id },
        data: { matchedTransactionId: best.txn.id, isExcluded: true },
      });
    }
  }
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  // If category is being changed, create a CategoryCorrection
  if (
    input.categoryId !== undefined &&
    input.categoryId !== transaction.categoryId
  ) {
    const merchantName = transaction.merchantName || transaction.originalName;
    if (input.categoryId) {
      await prisma.categoryCorrection.create({
        data: {
          userId,
          merchantName,
          originalName: transaction.originalName,
          originalCategoryId: transaction.categoryId,
          correctedCategoryId: input.categoryId,
          transactionAmount: transaction.amount,
        },
      });
    }
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: input,
    include: { category: true, plaidAccount: true },
  });

  return updated;
}

export async function bulkUpdateTransactions(
  userId: string,
  input: BulkUpdateTransactionsInput,
) {
  // Verify all transactions belong to user
  const count = await prisma.transaction.count({
    where: { id: { in: input.transactionIds }, userId },
  });

  if (count !== input.transactionIds.length) {
    throw new BadRequestError("Some transactions were not found");
  }

  const data: Record<string, unknown> = {};
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.isExcluded !== undefined) data.isExcluded = input.isExcluded;

  await prisma.transaction.updateMany({
    where: { id: { in: input.transactionIds }, userId },
    data,
  });

  return { updated: input.transactionIds.length };
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  });
}

export async function bulkDeleteTransactions(userId: string, transactionIds: string[]) {
  const count = await prisma.transaction.count({
    where: { id: { in: transactionIds }, userId },
  });

  if (count !== transactionIds.length) {
    throw new BadRequestError("Some transactions were not found");
  }

  await prisma.transaction.deleteMany({
    where: { id: { in: transactionIds }, userId },
  });

  return { deleted: transactionIds.length };
}

export async function exportTransactions(userId: string, query: TransactionQuery) {
  // Use the same filter logic but without pagination
  const modifiedQuery = { ...query, page: 1, limit: 10000 };
  const result = await getTransactions(userId, modifiedQuery);

  const header = "Date,Merchant,Amount,Category,Excluded,Notes";
  const rows = result.data.map((t: { date: Date | string; merchantName: string | null; originalName: string; amount: { toString(): string }; category: { name: string } | null; isExcluded: boolean; notes: string | null }) => {
    const date = new Date(t.date).toISOString().split("T")[0];
    const merchant = csvEscape(t.merchantName || t.originalName);
    const amount = t.amount.toString();
    const category = csvEscape(t.category?.name || "Uncategorized");
    const excluded = t.isExcluded ? "Yes" : "No";
    const notes = csvEscape(t.notes || "");
    return `${date},${merchant},${amount},${category},${excluded},${notes}`;
  });

  return [header, ...rows].join("\n");
}

export async function applyRules(userId: string): Promise<{ applied: number }> {
  // Build merchant → most-recent-correction map
  const corrections = await prisma.categoryCorrection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Keep only the latest correction per merchant name (case-insensitive)
  const ruleMap = new Map<string, string>(); // merchantKey -> categoryId
  for (const c of corrections) {
    const key = c.merchantName.toLowerCase();
    if (!ruleMap.has(key)) {
      ruleMap.set(key, c.correctedCategoryId);
    }
  }

  if (ruleMap.size === 0) return { applied: 0 };

  // Find all uncategorized transactions for this user
  const uncategorized = await prisma.transaction.findMany({
    where: { userId, categoryId: null },
    select: { id: true, merchantName: true, originalName: true },
  });

  let applied = 0;
  for (const txn of uncategorized) {
    const merchantKey = (txn.merchantName || txn.originalName).toLowerCase();
    const categoryId = ruleMap.get(merchantKey);
    if (categoryId) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { categoryId },
      });
      applied++;
    }
  }

  return { applied };
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
