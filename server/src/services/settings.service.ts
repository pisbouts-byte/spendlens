import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import type { UpdateSettingsInput } from "@spendlens/shared";

export async function getSettings(userId: string) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    throw new NotFoundError("Settings");
  }

  return settings;
}

export async function updateSettings(userId: string, input: UpdateSettingsInput) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    throw new NotFoundError("Settings");
  }

  return prisma.userSettings.update({
    where: { userId },
    data: input,
  });
}
