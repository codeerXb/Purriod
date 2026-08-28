import { COLLECTIONS } from "../constants/config";
import { PeriodRecord, UserSettings } from "../types/period";
import { DEFAULT_SETTINGS } from "./period";

function db() {
  return wx.cloud.database();
}

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const result = await db().collection(COLLECTIONS.USER_SETTINGS).limit(1).get();
    if (result.data && result.data.length) {
      return { ...DEFAULT_SETTINGS, ...result.data[0] };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.warn("getUserSettings fallback", error);
    return wx.getStorageSync("purriod_user_settings") || DEFAULT_SETTINGS;
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const payload = {
    cycleLength: settings.cycleLength,
    periodLength: settings.periodLength,
    updatedAt: new Date(),
  };

  wx.setStorageSync("purriod_user_settings", payload);

  const result = await db().collection(COLLECTIONS.USER_SETTINGS).limit(1).get();
  if (result.data && result.data.length) {
    await db().collection(COLLECTIONS.USER_SETTINGS).doc(result.data[0]._id).update({ data: payload });
    return;
  }

  await db().collection(COLLECTIONS.USER_SETTINGS).add({
    data: {
      ...payload,
      createdAt: new Date(),
    },
  });
}

export async function getPeriodRecords(): Promise<PeriodRecord[]> {
  try {
    const result = await db().collection(COLLECTIONS.PERIOD_RECORDS).orderBy("date", "asc").get();
    return result.data || [];
  } catch (error) {
    console.warn("getPeriodRecords fallback", error);
    return wx.getStorageSync("purriod_period_records") || [];
  }
}

export async function savePeriodRecord(record: PeriodRecord): Promise<void> {
  const records = wx.getStorageSync("purriod_period_records") || [];
  const filtered = records.filter((item: PeriodRecord) => item.date !== record.date);
  wx.setStorageSync("purriod_period_records", [...filtered, record].sort((a, b) => a.date.localeCompare(b.date)));

  const payload = {
    date: record.date,
    isPeriodStart: record.isPeriodStart,
    isPeriodEnd: record.isPeriodEnd,
    flow: record.flow,
    pain: record.pain,
    discharge: record.discharge,
    mood: record.mood,
    symptoms: record.symptoms,
    notes: record.notes || "",
    updatedAt: new Date(),
  };

  const result = await db().collection(COLLECTIONS.PERIOD_RECORDS).where({ date: record.date }).limit(1).get();
  if (result.data && result.data.length) {
    await db().collection(COLLECTIONS.PERIOD_RECORDS).doc(result.data[0]._id).update({ data: payload });
    return;
  }

  await db().collection(COLLECTIONS.PERIOD_RECORDS).add({
    data: {
      ...payload,
      createdAt: new Date(),
    },
  });
}

export async function clearAllUserData(): Promise<void> {
  wx.removeStorageSync("purriod_user_settings");
  wx.removeStorageSync("purriod_period_records");

  const settings = await db().collection(COLLECTIONS.USER_SETTINGS).get();
  await Promise.all((settings.data || []).map((item) => db().collection(COLLECTIONS.USER_SETTINGS).doc(item._id).remove()));

  const records = await db().collection(COLLECTIONS.PERIOD_RECORDS).get();
  await Promise.all((records.data || []).map((item) => db().collection(COLLECTIONS.PERIOD_RECORDS).doc(item._id).remove()));
}
