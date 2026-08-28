import { addDays, daysBetween, formatDate, isBetween } from "./date";
import { PeriodPrediction, PeriodRecord, UserSettings } from "../types/period";

export const DEFAULT_SETTINGS: UserSettings = {
  cycleLength: 28,
  periodLength: 5,
};

function getStartDates(records: PeriodRecord[]): string[] {
  return records
    .filter((record) => record.isPeriodStart)
    .map((record) => record.date)
    .sort();
}

function getAverageCycle(startDates: string[], fallback: number): number {
  if (startDates.length < 2) {
    return fallback;
  }

  const intervals: number[] = [];
  for (let index = 1; index < startDates.length; index += 1) {
    const interval = daysBetween(startDates[index - 1], startDates[index]);
    if (interval >= 18 && interval <= 45) {
      intervals.push(interval);
    }
  }

  if (!intervals.length) {
    return fallback;
  }

  return Math.round(intervals.reduce((sum, item) => sum + item, 0) / intervals.length);
}

function rollNextStart(lastStart: string, cycleLength: number, today: string): string {
  let nextStart = addDays(lastStart, cycleLength);
  while (nextStart < today) {
    nextStart = addDays(nextStart, cycleLength);
  }
  return nextStart;
}

export function getPeriodPrediction(
  records: PeriodRecord[],
  settings: UserSettings = DEFAULT_SETTINGS,
  today: string = formatDate(new Date())
): PeriodPrediction {
  const startDates = getStartDates(records);
  const averageCycleLength = getAverageCycle(startDates, settings.cycleLength);

  if (!startDates.length) {
    return {
      hasRecords: false,
      phaseName: "等待记录",
      phaseKey: "unknown",
      dayText: "还没有经期记录",
      helperText: "记录一次月经开始后，我就能帮你预测下一次经期。",
      averageCycleLength,
    };
  }

  const lastStart = startDates[startDates.length - 1];
  const currentPeriodEnd = addDays(lastStart, settings.periodLength - 1);
  const nextPeriodStart = today <= currentPeriodEnd ? addDays(lastStart, averageCycleLength) : rollNextStart(lastStart, averageCycleLength, today);
  const nextPeriodEnd = addDays(nextPeriodStart, settings.periodLength - 1);
  const ovulationDate = addDays(nextPeriodStart, -14);

  if (isBetween(today, lastStart, currentPeriodEnd)) {
    const currentDay = daysBetween(lastStart, today) + 1;
    const daysLeft = Math.max(0, daysBetween(today, currentPeriodEnd));
    return {
      hasRecords: true,
      phaseName: "月经期",
      phaseKey: "period",
      dayText: `第 ${currentDay} 天`,
      helperText: daysLeft === 0 ? "预计今天结束，记得更新状态。" : `预计还有 ${daysLeft} 天结束。`,
      nextPeriodStart,
      nextPeriodEnd,
      ovulationDate,
      averageCycleLength,
    };
  }

  const daysToNext = daysBetween(today, nextPeriodStart);
  const daysToOvulation = daysBetween(today, ovulationDate);
  let phaseName = "卵泡期";
  let phaseKey: PeriodPrediction["phaseKey"] = "follicular";
  let helperText = `距离下次经期约 ${daysToNext} 天。`;

  if (Math.abs(daysToOvulation) <= 1) {
    phaseName = "排卵期";
    phaseKey = "ovulation";
    helperText = "预计处于排卵期附近，可留意身体变化。";
  } else if (daysToNext <= 10) {
    phaseName = "黄体期";
    phaseKey = "luteal";
    helperText = `距离下次经期约 ${daysToNext} 天，注意休息。`;
  }

  return {
    hasRecords: true,
    phaseName,
    phaseKey,
    dayText: daysToNext === 0 ? "预计今天开始" : `距离经期 ${daysToNext} 天`,
    helperText,
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    averageCycleLength,
  };
}

export function getAnalysis(records: PeriodRecord[], settings: UserSettings = DEFAULT_SETTINGS) {
  const startDates = getStartDates(records);
  const cycleIntervals: number[] = [];
  for (let index = 1; index < startDates.length; index += 1) {
    const interval = daysBetween(startDates[index - 1], startDates[index]);
    if (interval >= 18 && interval <= 45) {
      cycleIntervals.push(interval);
    }
  }

  const periodGroups = startDates.map((startDate) => {
    const periodRecords = records.filter((record) => {
      const distance = daysBetween(startDate, record.date);
      return distance >= 0 && distance < settings.periodLength && record.flow !== "none";
    });
    return periodRecords.length || settings.periodLength;
  });

  const averageCycle = cycleIntervals.length
    ? Math.round(cycleIntervals.reduce((sum, item) => sum + item, 0) / cycleIntervals.length)
    : settings.cycleLength;
  const averagePeriod = periodGroups.length
    ? Math.round(periodGroups.reduce((sum, item) => sum + item, 0) / periodGroups.length)
    : settings.periodLength;

  return {
    averageCycle,
    averagePeriod,
    cycleIntervals: cycleIntervals.slice(-6),
    periodLengths: periodGroups.slice(-6),
    recordCount: records.length,
    periodCount: startDates.length,
  };
}
