import {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import { applyRules } from "./transaction.service.js";

const plaidEnvMap: Record<string, string> = {
  sandbox: PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production: PlaidEnvironments.production,
};

const configuration = new Configuration({
  basePath: plaidEnvMap[env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
      "PLAID-SECRET": env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export async function createLinkToken(userId: string) {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "BudgetWisely",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
    webhook: env.PLAID_WEBHOOK_URL || undefined,
  });

  return { linkToken: response.data.link_token };
}

export async function createUpdateLinkToken(userId: string, itemId: string) {
  const plaidItem = await prisma.plaidItem.findFirst({ where: { id: itemId, userId } });
  if (!plaidItem) throw new NotFoundError("Plaid item");

  const accessToken = decrypt(plaidItem.plaidAccessToken);
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "BudgetWisely",
    access_token: accessToken,
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return { linkToken: response.data.link_token };
}

export async function exchangeToken(
  userId: string,
  publicToken: string,
  institutionId?: string,
  institutionName?: string,
) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const { access_token, item_id } = response.data;

  const encryptedToken = encrypt(access_token);

  const plaidItem = await prisma.plaidItem.create({
    data: {
      userId,
      plaidItemId: item_id,
      plaidAccessToken: encryptedToken,
      institutionId: institutionId ?? null,
      institutionName: institutionName ?? null,
      status: "ACTIVE",
    },
  });

  await ensureWebhookRegistered(plaidItem);

  // Fetch and store accounts
  const accountsResponse = await plaidClient.accountsGet({
    access_token,
  });

  const accounts = await Promise.all(
    accountsResponse.data.accounts.map((account) =>
      prisma.plaidAccount.upsert({
        where: { plaidAccountId: account.account_id },
        update: {
          name: account.name,
          officialName: account.official_name ?? null,
          type: account.type,
          subtype: account.subtype ?? null,
          mask: account.mask ?? null,
        },
        create: {
          plaidItemId: plaidItem.id,
          plaidAccountId: account.account_id,
          name: account.name,
          officialName: account.official_name ?? null,
          type: account.type,
          subtype: account.subtype ?? null,
          mask: account.mask ?? null,
        },
      }),
    ),
  );

  return { plaidItem, accounts };
}

async function ensureWebhookRegistered(plaidItem: { id: string; plaidAccessToken: string; webhookUrl: string | null }) {
  const targetUrl = env.PLAID_WEBHOOK_URL || null;
  if (!targetUrl || plaidItem.webhookUrl === targetUrl) return;

  const accessToken = decrypt(plaidItem.plaidAccessToken);
  try {
    await plaidClient.itemWebhookUpdate({ access_token: accessToken, webhook: targetUrl });
    await prisma.plaidItem.update({ where: { id: plaidItem.id }, data: { webhookUrl: targetUrl } });
  } catch (err) {
    console.error(`Failed to register webhook for item ${plaidItem.id}:`, err instanceof Error ? err.message : err);
  }
}

export async function syncTransactions(userId: string, itemId: string, trigger: "manual" | "webhook" | "auto" | "background" = "manual") {
  const plaidItem = await prisma.plaidItem.findFirst({
    where: { id: itemId, userId },
    include: { accounts: true },
  });

  if (!plaidItem) {
    throw new NotFoundError("Plaid item");
  }

  if (plaidItem.status !== "ACTIVE") {
    throw new BadRequestError("Plaid item is not active");
  }

  await ensureWebhookRegistered(plaidItem);

  const accessToken = decrypt(plaidItem.plaidAccessToken);
  let cursor = plaidItem.transactionCursor ?? undefined;
  let hasMore = true;

  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  // Build account ID -> internal ID map
  const accountMap = new Map(
    plaidItem.accounts.map((a) => [a.plaidAccountId, a.id]),
  );

  try {
   while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });

    const { added, modified, removed, next_cursor, has_more } = response.data;

    // Process added transactions
    if (added.length > 0) {
      await prisma.transaction.createMany({
        data: added.map((txn) => ({
          userId,
          plaidAccountId: accountMap.get(txn.account_id) ?? null,
          plaidTransactionId: txn.transaction_id,
          amount: txn.amount,
          merchantName: txn.merchant_name ?? null,
          originalName: txn.name,
          date: new Date(txn.authorized_date || txn.date),
          postedDate: txn.date ? new Date(txn.date) : null,
          originalCategory: txn.personal_finance_category?.primary ?? null,
          isPending: txn.pending,
          pendingTransactionId: txn.pending_transaction_id ?? null,
        })),
        skipDuplicates: true,
      });
      addedCount += added.length;
    }

    // Process modified transactions
    for (const txn of modified) {
      await prisma.transaction.updateMany({
        where: { plaidTransactionId: txn.transaction_id, userId },
        data: {
          amount: txn.amount,
          merchantName: txn.merchant_name ?? null,
          originalName: txn.name,
          date: new Date(txn.authorized_date || txn.date),
          postedDate: txn.date ? new Date(txn.date) : null,
          originalCategory: txn.personal_finance_category?.primary ?? null,
          isPending: txn.pending,
          pendingTransactionId: txn.pending_transaction_id ?? null,
        },
      });
      modifiedCount++;
    }

    // Process removed transactions
    if (removed.length > 0) {
      const removedIds = removed
        .map((r) => r.transaction_id)
        .filter((id): id is string => id != null);
      if (removedIds.length > 0) {
        await prisma.transaction.deleteMany({
          where: {
            plaidTransactionId: { in: removedIds },
            userId,
          },
        });
        removedCount += removedIds.length;
      }
    }

    cursor = next_cursor;
    hasMore = has_more;
   }
  } catch (err: unknown) {
    const code = (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
    if (code === "ITEM_LOGIN_REQUIRED" || code === "ITEM_NOT_FOUND") {
      await prisma.plaidItem.update({ where: { id: itemId }, data: { status: "ERROR" } });
    }
    await prisma.syncLog.create({
      data: {
        userId,
        plaidItemId: itemId,
        trigger,
        added: addedCount,
        modified: modifiedCount,
        removed: removedCount,
        status: "ERROR",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }

  // Update cursor
  await prisma.plaidItem.update({
    where: { id: itemId },
    data: { transactionCursor: cursor },
  });

  await prisma.syncLog.create({
    data: { userId, plaidItemId: itemId, trigger, added: addedCount, modified: modifiedCount, removed: removedCount, status: "SUCCESS" },
  });

  // Auto-apply saved merchant rules to any newly added uncategorized transactions
  if (addedCount > 0) {
    await applyRules(userId);
  }

  return { added: addedCount, modified: modifiedCount, removed: removedCount };
}

export async function reconnectItem(userId: string, itemId: string) {
  const plaidItem = await prisma.plaidItem.findFirst({ where: { id: itemId, userId } });
  if (!plaidItem) throw new NotFoundError("Plaid item");

  await prisma.plaidItem.update({ where: { id: itemId }, data: { status: "ACTIVE", webhookUrl: null } });
  const updated = await prisma.plaidItem.findUniqueOrThrow({ where: { id: itemId } });
  await ensureWebhookRegistered(updated);
  const result = await syncTransactions(userId, itemId, "manual");
  return result;
}

export async function syncAllItems(userId: string) {
  const items = await prisma.plaidItem.findMany({
    where: { userId, status: "ACTIVE" },
  });

  const results = [];
  for (const item of items) {
    try {
      const result = await syncTransactions(userId, item.id, "manual");
      results.push({ itemId: item.id, ...result });
    } catch (error) {
      results.push({
        itemId: item.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export async function syncAllActiveItems() {
  const items = await prisma.plaidItem.findMany({
    where: { status: "ACTIVE" },
    include: { accounts: true },
  });

  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;
  let errors = 0;

  for (const item of items) {
    try {
      const settings = await prisma.userSettings.findUnique({ where: { userId: item.userId } });
      if (settings?.autoSyncEnabled === false) continue;
      const result = await syncTransactions(item.userId, item.id, "auto");
      totalAdded += result.added;
      totalModified += result.modified;
      totalRemoved += result.removed;
    } catch (error) {
      errors++;
      console.error(`Auto-sync failed for item ${item.id}:`, error instanceof Error ? error.message : error);
    }
  }

  return { items: items.length, totalAdded, totalModified, totalRemoved, errors };
}

export async function getAccounts(userId: string) {
  const items = await prisma.plaidItem.findMany({
    where: { userId },
    include: {
      accounts: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items;
}

export async function removeItem(userId: string, itemId: string) {
  const plaidItem = await prisma.plaidItem.findFirst({
    where: { id: itemId, userId },
  });

  if (!plaidItem) {
    throw new NotFoundError("Plaid item");
  }

  // Try to remove from Plaid
  try {
    const accessToken = decrypt(plaidItem.plaidAccessToken);
    await plaidClient.itemRemove({ access_token: accessToken });
  } catch {
    // Continue even if Plaid removal fails
  }

  // Delete from our DB (cascades to accounts, transactions set null)
  await prisma.plaidItem.delete({
    where: { id: itemId },
  });

  return { deleted: true };
}

export async function handleWebhook(body: {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
}) {
  if (
    body.webhook_type === "TRANSACTIONS" &&
    body.webhook_code === "SYNC_UPDATES_AVAILABLE"
  ) {
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { plaidItemId: body.item_id },
    });

    if (plaidItem && plaidItem.status === "ACTIVE") {
      const settings = await prisma.userSettings.findUnique({ where: { userId: plaidItem.userId } });
      if (settings?.autoSyncEnabled !== false) {
        await syncTransactions(plaidItem.userId, plaidItem.id, "webhook");
      }
    }
  }

  if (body.webhook_type === "ITEM" && body.webhook_code === "ERROR") {
    await prisma.plaidItem.updateMany({
      where: { plaidItemId: body.item_id },
      data: { status: "ERROR" },
    });
  }
}
