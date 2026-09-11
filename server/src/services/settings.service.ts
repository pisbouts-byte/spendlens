import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import { parseUTCDateString, formatUTCDate } from "../utils/cashflowForecast.js";
import type { UpdateSettingsInput } from "@spendlens/shared";

function formatSettings<T extends { payPeriodAnchorDate: Date | null }>(settings: T) {
  return {
    ...settings,
    payPeriodAnchorDate: settings.payPeriodAnchorDate ? formatUTCDate(settings.payPeriodAnchorDate) : null,
  };
}

export async function getSettings(userId: string) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    throw new NotFoundError("Settings");
  }

  return formatSettings(settings);
}

export async function updateSettings(userId: string, input: UpdateSettingsInput) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    throw new NotFoundError("Settings");
  }

  const { payPeriodAnchorDate, ...rest } = input;

  const updated = await prisma.userSettings.update({
    where: { userId },
    data: {
      ...rest,
      ...(payPeriodAnchorDate !== undefined && {
        payPeriodAnchorDate: payPeriodAnchorDate ? parseUTCDateString(payPeriodAnchorDate) : null,
      }),
    },
  });

  return formatSettings(updated);
}
