import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { BadRequestError } from "../utils/errors.js";

interface CategorizationResult {
  transactionId: string;
  categoryId: string;
  confidence: number;
}

export async function categorizeTransactions(
  userId: string,
  transactionIds: string[],
) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new BadRequestError(
      "Anthropic API key not configured. Set it in your environment variables.",
    );
  }

  if (transactionIds.length > 50) {
    throw new BadRequestError("Maximum 50 transactions per categorization request");
  }

  // Fetch transactions
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, userId },
    select: {
      id: true,
      merchantName: true,
      originalName: true,
      amount: true,
      originalCategory: true,
    },
  });

  if (transactions.length === 0) {
    return [];
  }

  return categorizeBatch(userId, transactions);
}

/**
 * Categorize ALL uncategorized transactions for a user, processing in batches of 50.
 */
export async function categorizeAllUncategorized(userId: string) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new BadRequestError(
      "Anthropic API key not configured. Set it in your environment variables.",
    );
  }

  // Fetch ALL uncategorized transactions
  const allUncategorized = await prisma.transaction.findMany({
    where: { userId, categoryId: null },
    select: {
      id: true,
      merchantName: true,
      originalName: true,
      amount: true,
      originalCategory: true,
    },
    orderBy: { date: "desc" },
  });

  if (allUncategorized.length === 0) {
    return { categorized: 0, total: 0 };
  }

  // Process in batches of 50
  const BATCH_SIZE = 50;
  let totalCategorized = 0;

  for (let i = 0; i < allUncategorized.length; i += BATCH_SIZE) {
    const batch = allUncategorized.slice(i, i + BATCH_SIZE);
    const results = await categorizeBatch(userId, batch);
    totalCategorized += results.length;
  }

  return { categorized: totalCategorized, total: allUncategorized.length };
}

/**
 * Internal: categorize a batch of transactions (max 50), apply results to DB.
 */
async function categorizeBatch(
  userId: string,
  transactions: {
    id: string;
    merchantName: string | null;
    originalName: string;
    amount: Prisma_Decimal;
    originalCategory: string | null;
  }[],
): Promise<CategorizationResult[]> {
  // Fetch user's categories
  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  if (categories.length === 0) {
    throw new BadRequestError("No categories found. Create categories first.");
  }

  // Fetch recent corrections as few-shot examples
  const corrections = await prisma.categoryCorrection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      correctedCategory: { select: { name: true } },
    },
  });

  // Try merchant-name lookup first from corrections
  const merchantLookup = new Map<string, string>();
  for (const correction of corrections) {
    const key = correction.merchantName.toLowerCase();
    if (!merchantLookup.has(key)) {
      merchantLookup.set(key, correction.correctedCategoryId);
    }
  }

  // Split into lookup-matched and needs-AI
  const results: CategorizationResult[] = [];
  const needsAI: typeof transactions = [];

  for (const txn of transactions) {
    const merchant = (txn.merchantName || txn.originalName).toLowerCase();
    const matchedCategoryId = merchantLookup.get(merchant);
    if (matchedCategoryId) {
      results.push({
        transactionId: txn.id,
        categoryId: matchedCategoryId,
        confidence: 0.95,
      });
    } else {
      needsAI.push(txn);
    }
  }

  // Call Claude for remaining transactions
  if (needsAI.length > 0) {
    const aiResults = await callClaude(needsAI, categories, corrections);
    results.push(...aiResults);
  }

  // Apply results to database
  for (const result of results) {
    await prisma.transaction.update({
      where: { id: result.transactionId },
      data: {
        categoryId: result.categoryId,
        aiConfidence: result.confidence,
      },
    });
  }

  return results;
}

async function callClaude(
  transactions: {
    id: string;
    merchantName: string | null;
    originalName: string;
    amount: Prisma_Decimal;
    originalCategory: string | null;
  }[],
  categories: { id: string; name: string }[],
  corrections: {
    merchantName: string;
    correctedCategory: { name: string };
  }[],
): Promise<CategorizationResult[]> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const categoryList = categories
    .map((c) => `- "${c.name}" (id: ${c.id})`)
    .join("\n");

  const exampleLines = corrections.slice(0, 30).map(
    (c) => `  "${c.merchantName}" → "${c.correctedCategory.name}"`,
  );
  const examplesBlock =
    exampleLines.length > 0
      ? `\nHere are examples of how the user categorizes merchants:\n${exampleLines.join("\n")}\n`
      : "";

  const txnList = transactions.map(
    (t, i) =>
      `${i + 1}. id="${t.id}" merchant="${t.merchantName || "N/A"}" description="${t.originalName}" amount=${t.amount} plaid_category="${t.originalCategory || "N/A"}"`,
  );

  const prompt = `You are a personal finance categorization assistant. Categorize each transaction into the most appropriate user category.

IMPORTANT RULES:
1. Every transaction MUST be categorized — pick the best match even if uncertain (use a lower confidence score).
2. The "plaid_category" field is a strong hint from the bank — use it to inform your decision.
3. Common mappings: "Food and Drink" → food/dining, "Travel" → transportation/travel, "Shops" → shopping, "Payment" → transfers/bills, "Transfer" → transfers, "Recreation" → entertainment.
4. Look at the merchant name AND description together for context.
5. If the merchant is clearly a grocery store (Walmart, Kroger, Costco, etc.), categorize as groceries/food.
6. If the merchant is a gas station, categorize as transportation/auto.
7. Subscriptions (Netflix, Spotify, etc.) should go to entertainment or subscriptions if available.

Available categories:
${categoryList}
${examplesBlock}
Transactions to categorize:
${txnList.join("\n")}

Return ONLY a valid JSON array. Every transaction above MUST appear in your response.
Fields: transactionId (the id), categoryId (matching category id), confidence (0.0-1.0).

Example: [{"transactionId":"abc","categoryId":"xyz","confidence":0.9}]`;

  try {
    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Claude returned no JSON array. Response:", text.slice(0, 500));
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as CategorizationResult[];

    // Validate category IDs
    const validCategoryIds = new Set(categories.map((c) => c.id));
    const valid = parsed.filter(
      (r) =>
        r.transactionId &&
        r.categoryId &&
        validCategoryIds.has(r.categoryId) &&
        typeof r.confidence === "number",
    );

    if (valid.length < parsed.length) {
      const invalid = parsed.filter((r) => !validCategoryIds.has(r.categoryId));
      console.warn(
        `Claude returned ${parsed.length} results, ${valid.length} valid. Invalid category IDs:`,
        invalid.map((r) => r.categoryId).slice(0, 5),
      );
    }

    return valid;
  } catch (error: unknown) {
    console.error("Claude categorization error:", error);
    // Surface billing/auth errors to the user instead of silently returning empty
    const errMsg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";
    if (errMsg.includes("credit balance")) {
      throw new BadRequestError(
        "AI categorization unavailable: Anthropic API credits are insufficient. Add credits at console.anthropic.com/settings/billing",
      );
    }
    if (errMsg.includes("invalid x-api-key") || errMsg.includes("authentication")) {
      throw new BadRequestError("AI categorization unavailable: Invalid Anthropic API key");
    }
    if (errMsg.includes("overloaded") || errMsg.includes("rate_limit")) {
      throw new BadRequestError("AI categorization unavailable: API rate limited. Try again in a minute.");
    }
    throw new BadRequestError(`AI categorization failed: ${errMsg || "Unknown error"}`);
  }
  }
}

// Prisma Decimal type alias for readability
type Prisma_Decimal = { toString(): string };
