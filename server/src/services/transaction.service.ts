import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import type {
  UpdateTransactionInput,
  BulkUpdateTransactionsInput,
  TransactionQuery,
} from "@spendlens/shared";

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
  if (query.accountId) {
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

  const orderBy: Prisma.TransactionOrderByWithRelationInput = {
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

  const data: Prisma.TransactionUncheckedUpdateManyInput = {};
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
  const rows = result.data.map((t) => {
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

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
