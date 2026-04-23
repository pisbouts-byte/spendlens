import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";

// Known subscription merchants (lowercase for matching)
const KNOWN_SUBSCRIPTION_MERCHANTS: Record<string, string> = {
  netflix: "MONTHLY",
  spotify: "MONTHLY",
  hulu: "MONTHLY",
  "disney+": "MONTHLY",
  "disney plus": "MONTHLY",
  "apple.com/bill": "MONTHLY",
  "apple music": "MONTHLY",
  icloud: "MONTHLY",
  "amazon prime": "MONTHLY",
  "prime video": "MONTHLY",
  "youtube premium": "MONTHLY",
  "youtube music": "MONTHLY",
  "google storage": "MONTHLY",
  "google one": "MONTHLY",
  "hbo max": "MONTHLY",
  "max.com": "MONTHLY",
  "paramount+": "MONTHLY",
  "paramount plus": "MONTHLY",
  peacock: "MONTHLY",
  crunchyroll: "MONTHLY",
  dropbox: "MONTHLY",
  "microsoft 365": "MONTHLY",
  "office 365": "YEARLY",
  adobe: "MONTHLY",
  chatgpt: "MONTHLY",
  openai: "MONTHLY",
  claude: "MONTHLY",
  anthropic: "MONTHLY",
  "ny times": "MONTHLY",
  nytimes: "MONTHLY",
  "new york times": "MONTHLY",
  "wall street journal": "MONTHLY",
  wsj: "MONTHLY",
  "washington post": "MONTHLY",
  "linkedin premium": "MONTHLY",
  "linkedin learning": "MONTHLY",
  slack: "MONTHLY",
  zoom: "MONTHLY",
  notion: "MONTHLY",
  "1password": "YEARLY",
  nordvpn: "MONTHLY",
  expressvpn: "MONTHLY",
  audible: "MONTHLY",
  "kindle unlimited": "MONTHLY",
  "xbox game pass": "MONTHLY",
  "playstation plus": "MONTHLY",
  "ps plus": "MONTHLY",
  nintendo: "YEARLY",
  github: "MONTHLY",
  heroku: "MONTHLY",
  vercel: "MONTHLY",
  netlify: "MONTHLY",
  figma: "MONTHLY",
  canva: "MONTHLY",
  grammarly: "MONTHLY",
  dashlane: "MONTHLY",
  lastpass: "MONTHLY",
  bitwarden: "YEARLY",
  "planet fitness": "MONTHLY",
  "la fitness": "MONTHLY",
  "anytime fitness": "MONTHLY",
  equinox: "MONTHLY",
  peloton: "MONTHLY",
  crossfit: "MONTHLY",
  geico: "MONTHLY",
  "state farm": "MONTHLY",
  progressive: "MONTHLY",
  allstate: "MONTHLY",
  "t-mobile": "MONTHLY",
  "at&t": "MONTHLY",
  verizon: "MONTHLY",
  comcast: "MONTHLY",
  xfinity: "MONTHLY",
  spectrum: "MONTHLY",
  cox: "MONTHLY",
  sirius: "MONTHLY",
  siriusxm: "MONTHLY",
  strava: "MONTHLY",
  duolingo: "MONTHLY",
  headspace: "MONTHLY",
  calm: "MONTHLY",
  midjourney: "MONTHLY",
  cursor: "MONTHLY",
  render: "MONTHLY",
};

function matchKnownMerchant(merchantName: string): { matched: boolean; frequency: string } {
  const lower = merchantName.toLowerCase();
  for (const [keyword, frequency] of Object.entries(KNOWN_SUBSCRIPTION_MERCHANTS)) {
    if (lower.includes(keyword)) {
      return { matched: true, frequency };
    }
  }
  return { matched: false, frequency: "MONTHLY" };
}

function detectFrequency(dates: Date[]): { frequency: string; confidence: number } | null {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = sorted[i].getTime() - sorted[i - 1].getTime();
    gaps.push(Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (gaps.length === 0) return null;

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);
  const coefficient = avgGap > 0 ? stdDev / avgGap : 1;

  let frequency: string;
  let expectedGap: number;

  if (avgGap >= 3 && avgGap <= 10) {
    frequency = "WEEKLY";
    expectedGap = 7;
  } else if (avgGap >= 11 && avgGap <= 18) {
    frequency = "BIWEEKLY";
    expectedGap = 14;
  } else if (avgGap >= 25 && avgGap <= 38) {
    frequency = "MONTHLY";
    expectedGap = 30;
  } else if (avgGap >= 80 && avgGap <= 100) {
    frequency = "QUARTERLY";
    expectedGap = 91;
  } else if (avgGap >= 340 && avgGap <= 400) {
    frequency = "YEARLY";
    expectedGap = 365;
  } else {
    return null;
  }

  const gapAccuracy = 1 - Math.min(1, Math.abs(avgGap - expectedGap) / expectedGap);
  const consistency = Math.max(0, 1 - coefficient);
  const sampleBonus = Math.min(1, dates.length / 5);

  const confidence = gapAccuracy * 0.3 + consistency * 0.4 + sampleBonus * 0.3;

  if (confidence < 0.4) return null;

  return { frequency, confidence: Math.round(confidence * 100) / 100 };
}

function addFrequencyDays(date: Date, frequency: string): Date {
  const result = new Date(date);
  switch (frequency) {
    case "WEEKLY":
      result.setDate(result.getDate() + 7);
      break;
    case "BIWEEKLY":
      result.setDate(result.getDate() + 14);
      break;
    case "MONTHLY":
      result.setMonth(result.getMonth() + 1);
      break;
    case "QUARTERLY":
      result.setMonth(result.getMonth() + 3);
      break;
    case "YEARLY":
      result.setFullYear(result.getFullYear() + 1);
      break;
  }
  return result;
}

export async function detectRecurringPatterns(userId: string) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      isExcluded: false,
      isPending: false,
      date: { gte: twelveMonthsAgo },
      amount: { gt: 0 },
    },
    orderBy: { date: "asc" },
    include: { category: true },
  });

  const detected: Array<{
    merchantName: string;
    amount: Prisma.Decimal;
    frequency: string;
    confidence: number;
    detectionType: string;
    lastSeen: Date;
    nextExpected: Date | null;
    occurrences: number;
    categoryId: string | null;
  }> = [];

  // Group by merchant
  const merchantGroups = new Map<string, typeof transactions>();
  for (const txn of transactions) {
    const name = txn.merchantName || txn.originalName;
    if (!merchantGroups.has(name)) {
      merchantGroups.set(name, []);
    }
    merchantGroups.get(name)!.push(txn);
  }

  const processedMerchantAmounts = new Set<string>();

  // --- Method 1: Known merchant detection ---
  for (const [merchant, txns] of merchantGroups) {
    const knownMatch = matchKnownMerchant(merchant);
    if (knownMatch.matched && txns.length >= 1) {
      const amountCounts = new Map<string, number>();
      for (const t of txns) {
        const amt = t.amount.toString();
        amountCounts.set(amt, (amountCounts.get(amt) || 0) + 1);
      }
      const [topAmount] = [...amountCounts.entries()].sort((a, b) => b[1] - a[1])[0];

      const relevantTxns = txns.filter((t) => t.amount.toString() === topAmount);
      const lastTxn = relevantTxns[relevantTxns.length - 1];
      const lastSeenDate = new Date(lastTxn.date);
      const key = `${merchant}|${topAmount}`;
      processedMerchantAmounts.add(key);

      detected.push({
        merchantName: merchant,
        amount: new Prisma.Decimal(topAmount),
        frequency: knownMatch.frequency,
        confidence: Math.min(0.95, 0.7 + relevantTxns.length * 0.05),
        detectionType: "KNOWN_MERCHANT",
        lastSeen: lastSeenDate,
        nextExpected: addFrequencyDays(lastSeenDate, knownMatch.frequency),
        occurrences: relevantTxns.length,
        categoryId: lastTxn.categoryId,
      });
    }
  }

  // --- Method 2: Pattern detection (same merchant + same amount at regular intervals) ---
  const merchantAmountGroups = new Map<string, typeof transactions>();
  for (const txn of transactions) {
    const name = txn.merchantName || txn.originalName;
    const key = `${name}|${txn.amount.toString()}`;
    if (processedMerchantAmounts.has(key)) continue;
    if (!merchantAmountGroups.has(key)) {
      merchantAmountGroups.set(key, []);
    }
    merchantAmountGroups.get(key)!.push(txn);
  }

  for (const [key, txns] of merchantAmountGroups) {
    if (txns.length < 2) continue;

    const dates = txns.map((t) => new Date(t.date));
    const result = detectFrequency(dates);

    if (result) {
      const lastTxn = txns[txns.length - 1];
      const lastSeenDate = new Date(lastTxn.date);
      const [merchant] = key.split("|");

      detected.push({
        merchantName: merchant,
        amount: lastTxn.amount,
        frequency: result.frequency,
        confidence: result.confidence,
        detectionType: "PATTERN_DETECTED",
        lastSeen: lastSeenDate,
        nextExpected: addFrequencyDays(lastSeenDate, result.frequency),
        occurrences: txns.length,
        categoryId: lastTxn.categoryId,
      });
    }
  }

  // Upsert all detected patterns
  for (const pattern of detected) {
    await prisma.recurringPattern.upsert({
      where: {
        userId_merchantName_amount: {
          userId,
          merchantName: pattern.merchantName,
          amount: pattern.amount,
        },
      },
      create: {
        userId,
        ...pattern,
      },
      update: {
        frequency: pattern.frequency,
        confidence: pattern.confidence,
        detectionType: pattern.detectionType,
        lastSeen: pattern.lastSeen,
        nextExpected: pattern.nextExpected,
        occurrences: pattern.occurrences,
        categoryId: pattern.categoryId,
        isActive: true,
      },
    });
  }

  return detected.length;
}

export async function getRecurringPatterns(userId: string) {
  await detectRecurringPatterns(userId);

  const patterns = await prisma.recurringPattern.findMany({
    where: {
      userId,
      isDismissed: false,
    },
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { amount: "desc" }],
  });

  let monthlyTotal = 0;
  for (const p of patterns) {
    if (!p.isActive) continue;
    const amt = Number(p.amount);
    switch (p.frequency) {
      case "WEEKLY":
        monthlyTotal += amt * 4.33;
        break;
      case "BIWEEKLY":
        monthlyTotal += amt * 2.17;
        break;
      case "MONTHLY":
        monthlyTotal += amt;
        break;
      case "QUARTERLY":
        monthlyTotal += amt / 3;
        break;
      case "YEARLY":
        monthlyTotal += amt / 12;
        break;
    }
  }

  return {
    patterns,
    monthlyTotal: monthlyTotal.toFixed(2),
    yearlyTotal: (monthlyTotal * 12).toFixed(2),
  };
}

export async function dismissPattern(userId: string, patternId: string) {
  const pattern = await prisma.recurringPattern.findFirst({
    where: { id: patternId, userId },
  });

  if (!pattern) {
    throw new NotFoundError("Recurring pattern");
  }

  return prisma.recurringPattern.update({
    where: { id: patternId },
    data: { isDismissed: true },
  });
}

export async function togglePatternActive(userId: string, patternId: string) {
  const pattern = await prisma.recurringPattern.findFirst({
    where: { id: patternId, userId },
  });

  if (!pattern) {
    throw new NotFoundError("Recurring pattern");
  }

  return prisma.recurringPattern.update({
    where: { id: patternId },
    data: { isActive: !pattern.isActive },
    include: { category: true },
  });
}

const VALID_FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

export async function updatePatternFrequency(userId: string, patternId: string, frequency: string) {
  if (!VALID_FREQUENCIES.includes(frequency)) {
    throw new BadRequestError(`Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}`);
  }

  const pattern = await prisma.recurringPattern.findFirst({
    where: { id: patternId, userId },
  });

  if (!pattern) {
    throw new NotFoundError("Recurring pattern");
  }

  const nextExpected = addFrequencyDays(new Date(pattern.lastSeen), frequency);

  return prisma.recurringPattern.update({
    where: { id: patternId },
    data: { frequency, nextExpected },
    include: { category: true },
  });
}
