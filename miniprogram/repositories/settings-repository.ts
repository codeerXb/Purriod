import {
  getCachedSettings,
  setCachedSettings,
} from "./local-store";
import { DEFAULT_SETTINGS } from "../services/period-prediction";
import {
  enqueueSyncOperation,
  flushPendingSync,
  hasPendingOperation,
  pullRemoteSettings,
} from "../services/sync-service";
import { SaveResult, UserSettings } from "../types/period";

function normalizeSettings(settings: UserSettings): UserSettings {
  return {
    cycleLength: Math.min(45, Math.max(21, Number(settings.cycleLength) || 28)),
    periodLength: Math.min(10, Math.max(2, Number(settings.periodLength) || 5)),
    schemaVersion: 1,
  };
}

export async function loadSettings(): Promise<UserSettings> {
  const cached = getCachedSettings() || DEFAULT_SETTINGS;
  try {
    await flushPendingSync();
    if (hasPendingOperation("settings", "settings")) return cached;
    const remote = await pullRemoteSettings();
    if (remote) {
      const normalized = normalizeSettings(remote);
      setCachedSettings(normalized);
      return normalized;
    }
  } catch (error) {
    console.warn("Purriod settings cloud fallback", error);
  }
  return cached;
}

export async function saveSettings(settings: UserSettings): Promise<SaveResult> {
  const normalized = normalizeSettings(settings);
  setCachedSettings(normalized);
  enqueueSyncOperation({
    entity: "settings",
    key: "settings",
    action: "upsert",
    payload: normalized,
    localUpdatedAt: Date.now(),
  });
  return flushPendingSync();
}
