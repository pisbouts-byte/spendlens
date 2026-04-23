import { prisma } from "../config/prisma.js";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../utils/errors.js";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  MergeCategoriesInput,
} from "@spendlens/shared";

export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: input.name } },
  });

  if (existing) {
    throw new ConflictError(`Category "${input.name}" already exists`);
  }

  const maxSort = await prisma.category.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });

  return prisma.category.create({
    data: {
      userId,
      name: input.name,
      color: input.color,
      icon: input.icon,
      isDefault: false,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    throw new NotFoundError("Category");
  }

  if (input.name && input.name !== category.name) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name: input.name } },
    });
    if (existing) {
      throw new ConflictError(`Category "${input.name}" already exists`);
    }
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: input,
  });
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
  reassignTo?: string,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    throw new NotFoundError("Category");
  }

  if (reassignTo) {
    const target = await prisma.category.findFirst({
      where: { id: reassignTo, userId },
    });
    if (!target) {
      throw new NotFoundError("Target category");
    }
    if (reassignTo === categoryId) {
      throw new BadRequestError("Cannot reassign to the same category");
    }
  }

  return prisma.$transaction(async (tx) => {
    if (reassignTo) {
      await tx.transaction.updateMany({
        where: { userId, categoryId },
        data: { categoryId: reassignTo },
      });
      await tx.budget.updateMany({
        where: { userId, categoryId },
        data: { categoryId: reassignTo },
      });
    } else {
      await tx.transaction.updateMany({
        where: { userId, categoryId },
        data: { categoryId: null },
      });
      await tx.budget.deleteMany({
        where: { userId, categoryId },
      });
    }

    await tx.categoryCorrection.deleteMany({
      where: {
        userId,
        OR: [
          { originalCategoryId: categoryId },
          { correctedCategoryId: categoryId },
        ],
      },
    });

    await tx.category.delete({
      where: { id: categoryId },
    });

    return { deleted: true };
  });
}

export async function mergeCategories(userId: string, input: MergeCategoriesInput) {
  if (input.sourceCategoryId === input.targetCategoryId) {
    throw new BadRequestError("Source and target categories must be different");
  }

  const [source, target] = await Promise.all([
    prisma.category.findFirst({
      where: { id: input.sourceCategoryId, userId },
    }),
    prisma.category.findFirst({
      where: { id: input.targetCategoryId, userId },
    }),
  ]);

  if (!source) throw new NotFoundError("Source category");
  if (!target) throw new NotFoundError("Target category");

  return prisma.$transaction(async (tx) => {
    await tx.transaction.updateMany({
      where: { userId, categoryId: input.sourceCategoryId },
      data: { categoryId: input.targetCategoryId },
    });

    await tx.budget.deleteMany({
      where: { userId, categoryId: input.sourceCategoryId },
    });

    await tx.categoryCorrection.updateMany({
      where: { userId, correctedCategoryId: input.sourceCategoryId },
      data: { correctedCategoryId: input.targetCategoryId },
    });

    await tx.categoryCorrection.deleteMany({
      where: {
        userId,
        originalCategoryId: input.sourceCategoryId,
      },
    });

    await tx.category.delete({
      where: { id: input.sourceCategoryId },
    });

    return target;
  });
}
