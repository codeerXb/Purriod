import { normalizePeriodRecord } from "../constants/options";
import { PeriodRecord, SyncOperation, UserSettings } from "../types/period";

export const STORAGE_KEYS = {
  SETTINGS: "purriod_user_settings",
  RECORDS: "purriod_period_records",
  SYNC_QUEUE: "purriod_sync_queue",
} as const;

export function getCachedSettings(): UserSettings | null {
  return wx.getStorageSync(STORAGE_KEYS.SETTINGS) || null;
}

export function setCachedSettings(settings: UserSettings): void {
  wx.setStorageSync(STORAGE_KEYS.SETTINGS, {
    ...settings,
    schemaVersion: 1,
  });
}

export function getCachedRecords(): PeriodRecord[] {
  const records = wx.getStorageSync(STORAGE_KEYS.RECORDS) || [];
  return records.map(normalizePeriodRecord).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

export function setCachedRecords(records: PeriodRecord[]): void {
  const normalized = records
    .map(normalizePeriodRecord)
    .sort((left, right) => left.date.localeCompare(right.date));
  wx.setStorageSync(STORAGE_KEYS.RECORDS, normalized);
}

export function getSyncQueue(): SyncOperation[] {
  return wx.getStorageSync(STORAGE_KEYS.SYNC_QUEUE) || [];
}

export function setSyncQueue(queue: SyncOperation[]): void {
  wx.setStorageSync(STORAGE_KEYS.SYNC_QUEUE, queue);
}

export function clearLocalUserData(): void {
  wx.removeStorageSync(STORAGE_KEYS.SETTINGS);
  wx.removeStorageSync(STORAGE_KEYS.RECORDS);
  wx.removeStorageSync(STORAGE_KEYS.SYNC_QUEUE);
}
