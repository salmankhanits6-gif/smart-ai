import { APP_LIMITS, UsageLimits } from "../config";

interface DailyRecord {
  date: string; // YYYY-MM-DD
  screenshotAi: number;
  scamChecker: number;
  fileTools: number;
}

// clientKey -> DailyRecord
const usageStore = new Map<string, DailyRecord>();

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getOrCreateRecord(clientKey: string): DailyRecord {
  const today = getTodayString();
  let record = usageStore.get(clientKey);
  if (!record || record.date !== today) {
    record = {
      date: today,
      screenshotAi: 0,
      scamChecker: 0,
      fileTools: 0,
    };
    usageStore.set(clientKey, record);
  }
  return record;
}

export type FeatureKey = "screenshotAi" | "scamChecker" | "fileTools";

export function checkAndConsumeUsage(
  clientKey: string,
  feature: FeatureKey,
  isAuthenticated: boolean
): { allowed: boolean; remaining: number; total: number; used: number } {
  const limits: UsageLimits = isAuthenticated
    ? APP_LIMITS.authenticated
    : APP_LIMITS.anonymous;

  const record = getOrCreateRecord(clientKey);
  const currentCount = record[feature];
  const maxLimit = limits[feature];

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      remaining: 0,
      total: maxLimit,
      used: currentCount,
    };
  }

  // Increment usage count
  record[feature] += 1;
  const newUsed = record[feature];

  return {
    allowed: true,
    remaining: Math.max(0, maxLimit - newUsed),
    total: maxLimit,
    used: newUsed,
  };
}

export function refundUsage(clientKey: string, feature: FeatureKey): void {
  const record = usageStore.get(clientKey);
  if (record && record[feature] > 0) {
    record[feature] -= 1;
  }
}

export function getCurrentUsage(
  clientKey: string,
  isAuthenticated: boolean
): {
  limits: UsageLimits;
  used: { screenshotAi: number; scamChecker: number; fileTools: number };
  remaining: { screenshotAi: number; scamChecker: number; fileTools: number };
} {
  const limits: UsageLimits = isAuthenticated
    ? APP_LIMITS.authenticated
    : APP_LIMITS.anonymous;

  const record = getOrCreateRecord(clientKey);

  return {
    limits,
    used: {
      screenshotAi: record.screenshotAi,
      scamChecker: record.scamChecker,
      fileTools: record.fileTools,
    },
    remaining: {
      screenshotAi: Math.max(0, limits.screenshotAi - record.screenshotAi),
      scamChecker: Math.max(0, limits.scamChecker - record.scamChecker),
      fileTools: Math.max(0, limits.fileTools - record.fileTools),
    },
  };
}
