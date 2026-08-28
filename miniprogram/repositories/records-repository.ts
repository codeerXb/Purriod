import { isRecordEmpty, normalizePeriodRecord } from "../constants/options";
import {
  getCachedRecords,
  getSyncQueue,
  setCachedRecords,
} from "./local-store";
import {
  enqueueSyncOperation,
  flushPendingSync,
  pullRemoteRecords,
} from "../services/sync-service";
import { PeriodRecord, SaveResult } from "../types/period";

function pendingRecordOperations() {
  return getSyncQueue().filter((item) => item.entity === "record");
}

function mergeRemoteWithPending(remote: PeriodRecord[]): PeriodRecord[] {
  const byDate = new Map(
    remote.map((record) => [record.date, normalizePeriodRecord(record)]),
  );
  for (const operation of pendingRecordOperations()) {
    if (operation.action === "delete") {
      byDate.delete(operation.key);
    } else if (operation.payload) {
      byDate.set(
        operation.key,
        normalizePeriodRecord(operation.payload as PeriodRecord),
      );
    }
  }
  return Array.from(byDate.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

export async function loadRecords(): Promise<PeriodRecord[]> {
  const cached = getCachedRecords();
  try {
    await flushPendingSync();
    const remote = await pullRemoteRecords();
    const merged = mergeRemoteWithPending(remote);
    setCachedRecords(merged);
    return merged;
  } catch (error) {
    console.warn("Purriod records cloud fallback", error);
    return cached;
  }
}

export async function loadRecord(date: string): Promise<PeriodRecord | undefined> {
  const records = await loadRecords();
  return records.find((record) => record.date === date);
}

export async function saveRecord(record: PeriodRecord): Promise<SaveResult> {
  const normalized = normalizePeriodRecord(record);
  if (isRecordEmpty(normalized)) {
    return deleteRecord(normalized.date);
  }
  const records = getCachedRecords().filter((item) => item.date !== normalized.date);
  setCachedRecords([...records, normalized]);
  enqueueSyncOperation({
    entity: "record",
    key: normalized.date,
    action: "upsert",
    payload: normalized,
    localUpdatedAt: Date.now(),
  });
  return flushPendingSync();
}

export async function deleteRecord(date: string): Promise<SaveResult> {
  setCachedRecords(getCachedRecords().filter((record) => record.date !== date));
  enqueueSyncOperation({
    entity: "record",
    key: date,
    action: "delete",
    localUpdatedAt: Date.now(),
  });
  return flushPendingSync();
}
