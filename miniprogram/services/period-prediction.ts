import { normalizePeriodRecord } from "../constants/options";
import {
  PeriodPrediction,
  PeriodRecord,
  UserSettings,
} from "../types/period";
import { addDays, daysBetween, formatDate, isBetween } from "../utils/date";

export const DEFAULT_SETTINGS: UserSettings = {
  cycleLength: 28,
  periodLength: 5,
  schemaVersion: 1,
};

function uniqueStartDates(records: PeriodRecord[]): string[] {
  return Array.from(
    new Set(records.filter((record) => record.isPeriodStart).map((record) => record.date)),
  ).sort();
}

function averageRecentCycle(startDates: string[], fallback: number): number {
  const recentStarts = startDates.slice(-7);
  const intervals: number[] = [];

  for (let index = 1; index < recentStarts.length; index += 1) {
    const interval = daysBetween(recentStarts[index - 1], recentStarts[index]);
    if (interval >= 18 && interval <= 45) {
      intervals.push(interval);
    }
  }

  if (!intervals.length) {
    return fallback;
  }

  return Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length);
}

function findCurrentPeriodEnd(
  records: PeriodRecord[],
  lastStart: string,
  estimatedLength: number,
): string {
  const explicitEnd = records
    .map(normalizePeriodRecord)
    .filter((record) => record.isPeriodEnd && record.date > lastStart)
    .map((record) => record.date)
    .sort()[0];

  return explicitEnd || addDays(lastStart, estimatedLength - 1);
}

export function getPeriodPrediction(
  records: PeriodRecord[],
  settings: UserSettings = DEFAULT_SETTINGS,
  today: string = formatDate(new Date()),
): PeriodPrediction {
  const startDates = uniqueStartDates(records);
  const averageCycleLength = averageRecentCycle(startDates, settings.cycleLength);

  if (!startDates.length) {
    return {
      hasRecords: false,
      phaseName: "等待记录",
      phaseKey: "unknown",
      dayText: "还没有经期记录",
      helperText: "记录一次月经开始后，我就能帮你预测下一次经期。",
      averageCycleLength,
      cycleLength: averageCycleLength,
      cycleDay: 1,
      isStale: false,
    };
  }

  const lastStart = startDates[startDates.length - 1];
  const currentPeriodEnd = findCurrentPeriodEnd(
    records,
    lastStart,
    settings.periodLength,
  );
  const nextPeriodStart = addDays(lastStart, averageCycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, settings.periodLength - 1);
  const ovulationDate = addDays(nextPeriodStart, -14);
  const cycleDay = Math.max(1, daysBetween(lastStart, today) + 1);
  const common = {
    hasRecords: true,
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    averageCycleLength,
    cycleLength: averageCycleLength,
    cycleDay,
    currentCycleStart: lastStart,
    currentPeriodEnd,
  };

  if (isBetween(today, lastStart, currentPeriodEnd)) {
    const daysLeft = Math.max(0, daysBetween(today, currentPeriodEnd));
    return {
      ...common,
      phaseName: "月经期",
      phaseKey: "period",
      dayText: `第 ${cycleDay} 天`,
      helperText:
        daysLeft === 0
          ? "预计今天结束，记得更新状态。"
          : `预计还有 ${daysLeft} 天结束。`,
      isStale: false,
    };
  }

  if (today > nextPeriodEnd) {
    return {
      ...common,
      phaseName: "记录待更新",
      phaseKey: "unknown",
      dayText: "预测已过期",
      helperText: "补充最近一次经期开始日期后，将重新计算周期。",
      isStale: true,
    };
  }

  const daysToNext = daysBetween(today, nextPeriodStart);
  const daysToOvulation = daysBetween(today, ovulationDate);
  let phaseName = "卵泡期";
  let phaseKey: PeriodPrediction["phaseKey"] = "follicular";
  let helperText = `距离下次经期约 ${Math.max(0, daysToNext)} 天。`;

  if (today >= nextPeriodStart) {
    phaseName = "预计经期";
    phaseKey = "period";
    helperText = "当前处于预计经期范围，请按实际情况更新记录。";
  } else if (Math.abs(daysToOvulation) <= 1) {
    phaseName = "排卵期";
    phaseKey = "ovulation";
    helperText = "预计处于排卵期附近，可留意身体变化。";
  } else if (daysToNext <= 10) {
    phaseName = "黄体期";
    phaseKey = "luteal";
    helperText = `距离下次经期约 ${daysToNext} 天，注意休息。`;
  }

  return {
    ...common,
    phaseName,
    phaseKey,
    dayText:
      daysToNext === 0 ? "预计今天开始" : `距离经期 ${Math.max(0, daysToNext)} 天`,
    helperText,
    isStale: false,
  };
}
