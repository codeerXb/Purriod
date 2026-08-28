import { isRecordEmpty, normalizePeriodRecord } from "../constants/options";
import {
  CycleTrendItem,
  PeriodAnalysis,
  PeriodDurationItem,
  PeriodInterval,
  PeriodRecord,
  UserSettings,
} from "../types/period";
import { addDays, daysBetween } from "../utils/date";

function uniqueStartDates(records: PeriodRecord[]): string[] {
  return Array.from(
    new Set(records.filter((record) => record.isPeriodStart).map((record) => record.date)),
  ).sort();
}

export function buildPeriodIntervals(
  records: PeriodRecord[],
  settings: UserSettings,
): PeriodInterval[] {
  const normalized = records.map(normalizePeriodRecord);
  const starts = uniqueStartDates(normalized);

  return starts.map((startDate, index) => {
    const nextStart = starts[index + 1];
    const explicitEnd = normalized
      .filter(
        (record) =>
          record.isPeriodEnd &&
          record.date > startDate &&
          (!nextStart || record.date < nextStart),
      )
      .map((record) => record.date)
      .sort()[0];
    const endDate = explicitEnd || addDays(startDate, settings.periodLength - 1);

    return {
      startDate,
      endDate,
      length: daysBetween(startDate, endDate) + 1,
      isEstimated: !explicitEnd,
    };
  });
}

function validRecentCycleLengths(starts: string[]): Array<{
  startDate: string;
  endDate: string;
  length: number;
}> {
  const recentStarts = starts.slice(-7);
  const cycles: Array<{ startDate: string; endDate: string; length: number }> = [];

  for (let index = 1; index < recentStarts.length; index += 1) {
    const length = daysBetween(recentStarts[index - 1], recentStarts[index]);
    if (length >= 18 && length <= 45) {
      cycles.push({
        startDate: recentStarts[index - 1],
        endDate: recentStarts[index],
        length,
      });
    }
  }

  return cycles.slice(-6);
}

export function getPeriodAnalysis(
  records: PeriodRecord[],
  settings: UserSettings,
): PeriodAnalysis {
  const normalized = records.map(normalizePeriodRecord);
  const starts = uniqueStartDates(normalized);
  const cycleValues = validRecentCycleLengths(starts);
  const averageCycle = cycleValues.length
    ? Math.round(
        cycleValues.reduce((sum, item) => sum + item.length, 0) /
          cycleValues.length,
      )
    : settings.cycleLength;
  const cycleTrends: CycleTrendItem[] = cycleValues.map((item) => ({
    ...item,
    deltaFromAverage: item.length - averageCycle,
  }));

  const intervals = buildPeriodIntervals(normalized, settings);
  const actualIntervals = intervals.filter((interval) => !interval.isEstimated);
  const averagePeriod = actualIntervals.length
    ? Math.round(
        actualIntervals.reduce((sum, interval) => sum + interval.length, 0) /
          actualIntervals.length,
      )
    : settings.periodLength;
  const periodTrends: PeriodDurationItem[] = intervals.slice(-6).map((interval) => ({
    ...interval,
    deltaFromAverage: interval.length - averagePeriod,
  }));

  return {
    averageCycle,
    averagePeriod,
    recordCount: normalized.filter((record) => !isRecordEmpty(record)).length,
    periodCount: starts.length,
    cycleTrends,
    periodTrends,
  };
}
