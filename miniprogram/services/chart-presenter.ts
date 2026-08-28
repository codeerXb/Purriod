import {
  AnalysisChartModel,
  ChartBarItem,
  CycleRingModel,
  CycleRingSegment,
  PeriodAnalysis,
  PeriodPrediction,
  UserSettings,
} from "../types/period";

const SEGMENT_META: Record<
  CycleRingSegment["key"],
  { label: string; color: string }
> = {
  period: { label: "经期", color: "#D4768A" },
  follicular: { label: "卵泡期", color: "#C7D8C0" },
  ovulation: { label: "排卵期", color: "#A890C0" },
  luteal: { label: "黄体期", color: "#E9D9CF" },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function makeSegment(
  key: CycleRingSegment["key"],
  days: number,
): CycleRingSegment {
  return { key, days, ...SEGMENT_META[key] };
}

export function buildCycleRingModel(
  prediction: PeriodPrediction,
  settings: UserSettings,
): CycleRingModel {
  const totalDays = clamp(
    prediction.cycleLength || settings.cycleLength,
    21,
    45,
  );
  const periodDays = clamp(settings.periodLength, 1, totalDays - 5);
  const ovulationDays = 3;
  const availableAfterFixed = totalDays - periodDays - ovulationDays;
  const lutealDays = Math.min(14, Math.max(1, availableAfterFixed - 1));
  const follicularDays = availableAfterFixed - lutealDays;

  return {
    segments: [
      makeSegment("period", periodDays),
      makeSegment("follicular", follicularDays),
      makeSegment("ovulation", ovulationDays),
      makeSegment("luteal", lutealDays),
    ],
    totalDays,
    currentDay: clamp(prediction.cycleDay || 1, 1, totalDays),
    centerTitle: prediction.phaseName,
    centerValue: prediction.dayText,
    helperText: prediction.helperText,
    isStale: prediction.isStale,
  };
}

function shortDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日`;
}

function deltaLabel(delta: number): string {
  if (delta > 0) {
    return `比个人平均长 ${delta} 天`;
  }
  if (delta < 0) {
    return `比个人平均短 ${Math.abs(delta)} 天`;
  }
  return "与个人平均相同";
}

function cycleBar(
  item: PeriodAnalysis["cycleTrends"][number],
): ChartBarItem {
  return {
    key: `cycle-${item.startDate}-${item.endDate}`,
    label: shortDate(item.startDate),
    value: item.length,
    valueLabel: `${item.length}天`,
    deltaLabel: deltaLabel(item.deltaFromAverage),
    variant: "actual",
  };
}

function periodBar(
  item: PeriodAnalysis["periodTrends"][number],
): ChartBarItem {
  return {
    key: `period-${item.startDate}-${item.endDate}`,
    label: shortDate(item.startDate),
    value: item.length,
    valueLabel: `${item.length}天`,
    deltaLabel: deltaLabel(item.deltaFromAverage),
    variant: item.isEstimated ? "estimated" : "actual",
  };
}

export function buildAnalysisChartModel(
  analysis: PeriodAnalysis,
): AnalysisChartModel {
  return {
    cycleBars: analysis.cycleTrends.slice(-6).map(cycleBar),
    periodBars: analysis.periodTrends.slice(-6).map(periodBar),
  };
}
