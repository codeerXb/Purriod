import { COLLECTIONS } from "../constants/config";
import { normalizePeriodRecord } from "../constants/options";
import {
  getSyncQueue,
  setSyncQueue,
} from "../repositories/local-store";
import {
  PeriodRecord,
  SaveResult,
  SyncOperation,
  UserSettings,
} from "../types/period";

const PAGE_SIZE = 20;

function database() {
  return wx.cloud.database();
}

function recordPayload(record: PeriodRecord, isNew: boolean) {
  const serverDate = database().serverDate();
  const payload: any = {
    date: record.date,
    isPeriodStart: record.isPeriodStart,
    isPeriodEnd: record.isPeriodEnd,
    flow: record.flow,
    pain: record.pain,
    discharge: record.discharge,
    mood: record.mood,
    symptoms: record.symptoms,
    notes: record.notes || "",
    schemaVersion: 1,
    updatedAt: serverDate,
  };
  if (isNew) payload.createdAt = serverDate;
  return payload;
}

function settingsPayload(settings: UserSettings, isNew: boolean) {
  const serverDate = database().serverDate();
  const payload: any = {
    cycleLength: settings.cycleLength,
    periodLength: settings.periodLength,
    schemaVersion: 1,
    updatedAt: serverDate,
  };
  if (isNew) payload.createdAt = serverDate;
  return payload;
}

async function upsertRecord(record: PeriodRecord): Promise<void> {
  const collection = database().collection(COLLECTIONS.PERIOD_RECORDS);
  const { data } = await collection.where({ date: record.date }).limit(20).get();
  if (data.length) {
    await collection.doc(data[0]._id).update({ data: recordPayload(record, false) });
    await Promise.all(data.slice(1).map((item) => collection.doc(item._id).remove()));
    return;
  }
  await collection.add({ data: recordPayload(record, true) });
}

async function deleteRemoteRecord(date: string): Promise<void> {
  const collection = database().collection(COLLECTIONS.PERIOD_RECORDS);
  const { data } = await collection.where({ date }).limit(20).get();
  await Promise.all(data.map((item) => collection.doc(item._id).remove()));
}

async function upsertSettings(settings: UserSettings): Promise<void> {
  const collection = database().collection(COLLECTIONS.USER_SETTINGS);
  const { data } = await collection.orderBy("updatedAt", "desc").limit(20).get();
  if (data.length) {
    await collection.doc(data[0]._id).update({ data: settingsPayload(settings, false) });
    await Promise.all(data.slice(1).map((item) => collection.doc(item._id).remove()));
    return;
  }
  await collection.add({ data: settingsPayload(settings, true) });
}

async function applyOperation(operation: SyncOperation): Promise<void> {
  if (operation.entity === "settings") {
    if (operation.action === "upsert" && operation.payload) {
      await upsertSettings(operation.payload as UserSettings);
    }
    return;
  }

  if (operation.action === "delete") {
    await deleteRemoteRecord(operation.key);
    return;
  }
  if (operation.payload) {
    await upsertRecord(operation.payload as PeriodRecord);
  }
}

export function enqueueSyncOperation(operation: SyncOperation): void {
  const withoutSameEntity = getSyncQueue().filter(
    (item) => !(item.entity === operation.entity && item.key === operation.key),
  );
  setSyncQueue([...withoutSameEntity, operation]);
}

export function getPendingSyncCount(): number {
  return getSyncQueue().length;
}

export function hasPendingOperation(entity: SyncOperation["entity"], key: string): boolean {
  return getSyncQueue().some((item) => item.entity === entity && item.key === key);
}

export async function flushPendingSync(): Promise<SaveResult> {
  const snapshot = getSyncQueue();
  for (const operation of snapshot) {
    try {
      await applyOperation(operation);
      const current = getSyncQueue();
      setSyncQueue(
        current.filter(
          (item) =>
            !(
              item.entity === operation.entity &&
              item.key === operation.key &&
              item.localUpdatedAt === operation.localUpdatedAt
            ),
        ),
      );
    } catch (error) {
      console.warn("Purriod sync operation pending", operation.entity, operation.key, error);
    }
  }

  const pendingCount = getPendingSyncCount();
  return { synced: pendingCount === 0, pendingCount };
}

export async function pullRemoteRecords(): Promise<PeriodRecord[]> {
  const collection = database().collection(COLLECTIONS.PERIOD_RECORDS);
  const records: PeriodRecord[] = [];
  let offset = 0;

  while (true) {
    const { data } = await collection
      .orderBy("date", "asc")
      .skip(offset)
      .limit(PAGE_SIZE)
      .get();
    records.push(...data.map(normalizePeriodRecord));
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return records;
}

export async function pullRemoteSettings(): Promise<UserSettings | null> {
  const { data } = await database()
    .collection(COLLECTIONS.USER_SETTINGS)
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get();
  if (!data.length) return null;
  return {
    cycleLength: data[0].cycleLength,
    periodLength: data[0].periodLength,
    schemaVersion: 1,
  };
}
