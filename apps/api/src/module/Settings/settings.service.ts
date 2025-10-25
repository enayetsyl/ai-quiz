import { PrismaClient } from "@prisma/client";
import { HttpError } from "../../lib/http";

const prisma = new PrismaClient();

export async function getAppSettings() {
  // single-row settings table with id = 1
  let settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.appSettings.create({ data: {} });
  }
  return settings;
}

export async function updateAppSettings(data: Partial<any>) {
  // ensure row exists
  const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!existing)
    throw new HttpError("Settings not initialized", 500, "settings_missing");
  const allowed: Partial<any> = {};
  // whitelist updatable fields
  const fields = [
    "rpmCap",
    "workerConcurrency",
    "queueProvider",
    "rateLimitSafetyFactor",
    "tokenEstimateInitial",
  ];
  for (const f of fields) {
    if (f in data) (allowed as any)[f] = (data as any)[f];
  }
  const updated = await prisma.appSettings.update({
    where: { id: 1 },
    data: allowed,
  });
  return updated;
}

export default {
  getAppSettings,
  updateAppSettings,
};
