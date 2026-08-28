import {
  DischargeLevel,
  FlowLevel,
  PainLevel,
  PeriodRecord,
} from "../types/period";

interface SelectOption<T extends string> {
  label: string;
  value: T;
}

export const FLOW_OPTIONS: SelectOption<FlowLevel>[] = [
  { label: "无", value: "none" },
  { label: "少量", value: "light" },
  { label: "中等", value: "medium" },
  { label: "较多", value: "heavy" },
];

export const PAIN_OPTIONS: SelectOption<PainLevel>[] = [
  { label: "无", value: "none" },
  { label: "轻微", value: "mild" },
  { label: "中等", value: "moderate" },
  { label: "明显", value: "severe" },
];

export const DISCHARGE_OPTIONS: SelectOption<DischargeLevel>[] = [
  { label: "无", value: "none" },
  { label: "少量", value: "light" },
  { label: "中等", value: "medium" },
  { label: "较多", value: "heavy" },
];

export const MOOD_OPTIONS = ["平静", "开心", "疲惫", "焦虑", "敏感"];
export const SYMPTOM_OPTIONS = [
  "腹胀",
  "头痛",
  "腰酸",
  "疲劳",
  "痘痘",
  "乳房胀痛",
];

export const FLOW_LABELS: Record<FlowLevel, string> = {
  none: "未记录",
  light: "少量",
  medium: "中等",
  heavy: "较多",
};

export const PAIN_LABELS: Record<PainLevel, string> = {
  none: "无痛经",
  mild: "轻微",
  moderate: "中等",
  severe: "明显",
};

export const DISCHARGE_LABELS: Record<DischargeLevel, string> = {
  none: "未记录",
  light: "少量",
  medium: "中等",
  heavy: "较多",
};

export function createEmptyRecord(date: string): PeriodRecord {
  return {
    date,
    isPeriodStart: false,
    isPeriodEnd: false,
    flow: "none",
    pain: "none",
    discharge: "none",
    mood: "",
    symptoms: [],
    notes: "",
    schemaVersion: 1,
  };
}

export function normalizePeriodRecord(
  record: Partial<PeriodRecord> & Pick<PeriodRecord, "date">,
): PeriodRecord {
  const normalized = {
    ...createEmptyRecord(record.date),
    ...record,
    symptoms: Array.from(new Set(record.symptoms || [])),
    notes: record.notes || "",
    schemaVersion: 1 as const,
  };

  if (normalized.isPeriodStart) {
    normalized.isPeriodEnd = false;
  }

  return normalized;
}

export function isRecordEmpty(record: PeriodRecord): boolean {
  const normalized = normalizePeriodRecord(record);
  return (
    !normalized.isPeriodStart &&
    !normalized.isPeriodEnd &&
    normalized.flow === "none" &&
    normalized.pain === "none" &&
    normalized.discharge === "none" &&
    !normalized.mood.trim() &&
    normalized.symptoms.length === 0 &&
    !normalized.notes?.trim()
  );
}
