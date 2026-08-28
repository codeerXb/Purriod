export type FlowLevel = "none" | "light" | "medium" | "heavy";
export type PainLevel = "none" | "mild" | "moderate" | "severe";
export type DischargeLevel = "none" | "light" | "medium" | "heavy";
export type PeriodPhaseKey =
  | "period"
  | "follicular"
  | "ovulation"
  | "luteal"
  | "unknown";

export interface UserSettings {
  _id?: string;
  cycleLength: number;
  periodLength: number;
  schemaVersion?: 1;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PeriodRecord {
  _id?: string;
  date: string;
  isPeriodStart: boolean;
  isPeriodEnd: boolean;
  flow: FlowLevel;
  pain: PainLevel;
  discharge: DischargeLevel;
  mood: string;
  symptoms: string[];
  notes?: string;
  schemaVersion?: 1;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PeriodPrediction {
  hasRecords: boolean;
  phaseName: string;
  phaseKey: PeriodPhaseKey;
  dayText: string;
  helperText: string;
  nextPeriodStart?: string;
  nextPeriodEnd?: string;
  ovulationDate?: string;
  averageCycleLength: number;
  isStale: boolean;
  cycleDay: number;
  cycleLength: number;
  currentCycleStart?: string;
  currentPeriodEnd?: string;
}

export interface PeriodInterval {
  startDate: string;
  endDate: string;
  length: number;
  isEstimated: boolean;
}

export interface CycleTrendItem {
  startDate: string;
  endDate: string;
  length: number;
  deltaFromAverage: number;
}

export interface PeriodDurationItem extends PeriodInterval {
  deltaFromAverage: number;
}

export interface PeriodAnalysis {
  averageCycle: number;
  averagePeriod: number;
  recordCount: number;
  periodCount: number;
  cycleTrends: CycleTrendItem[];
  periodTrends: PeriodDurationItem[];
}
