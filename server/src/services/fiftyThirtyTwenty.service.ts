import { Prisma, type FiftyThirtyTwentyItem } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import type {
  FiftyThirtyTwentyCategory,
  CreateFiftyThirtyTwentyItemInput,
  UpdateFiftyThirtyTwentyItemInput,
} from "@spendlens/shared";

function formatItem(item: FiftyThirtyTwentyItem) {
  return {
    ...item,
    amount: item.amount.toString(),
  };
}

export async function getItems(userId: string, category?: FiftyThirtyTwentyCategory) {
  const items = await prisma.fiftyThirtyTwentyItem.findMany({
    where: { userId, ...(category ? { category } : {}) },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
  return items.map(formatItem);
}

export async function createItem(userId: string, input: CreateFiftyThirtyTwentyItemInput) {
  const item = await prisma.fiftyThirtyTwentyItem.create({
    data: {
      userId,
      category: input.category,
      name: input.name,
      amount: input.amount,
      frequency: input.frequency,
      note: input.note ?? null,
    },
  });
  return formatItem(item);
}

export async function updateItem(userId: string, itemId: string, input: UpdateFiftyThirtyTwentyItemInput) {
  const existing = await prisma.fiftyThirtyTwentyItem.findFirst({ where: { id: itemId, userId } });
  if (!existing) {
    throw new NotFoundError("Budget item");
  }

  const data: Prisma.FiftyThirtyTwentyItemUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.frequency !== undefined) data.frequency = input.frequency;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.note !== undefined) data.note = input.note;

  const item = await prisma.fiftyThirtyTwentyItem.update({
    where: { id: itemId },
    data,
  });
  return formatItem(item);
}

export async function deleteItem(userId: string, itemId: string) {
  const existing = await prisma.fiftyThirtyTwentyItem.findFirst({ where: { id: itemId, userId } });
  if (!existing) {
    throw new NotFoundError("Budget item");
  }
  await prisma.fiftyThirtyTwentyItem.delete({ where: { id: itemId } });
}
