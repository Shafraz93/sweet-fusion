"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getSettings() {
  let settings = await prisma.appSettings.findFirst();
  if (!settings) {
    settings = await prisma.appSettings.create({ data: {} });
  }
  return settings;
}

export async function updateSettings(data: {
  allowNegativeInventory?: boolean;
  companyName?: string;
  currency?: string;
  currencySymbol?: string;
}) {
  const existing = await prisma.appSettings.findFirst();
  if (existing) {
    await prisma.appSettings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.appSettings.create({ data });
  }
  revalidatePath("/settings");
}

export async function updateSettingsFromForm(data: Record<string, string>) {
  await updateSettings({
    companyName: data.companyName || undefined,
    currency: data.currency || undefined,
    currencySymbol: data.currencySymbol || undefined,
    allowNegativeInventory: data.allowNegativeInventory === "true",
  });
}
