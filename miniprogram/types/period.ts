export type FlowLevel = "none" | "light" | "medium" | "heavy";
export type PainLevel = "none" | "mild" | "moderate" | "severe";
export type DischargeLevel = "none" | "light" | "medium" | "heavy";

export interface UserSettings {
  _id?: string;
  cycleLength: number;
  periodLength: number;
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PeriodPrediction {
  hasRecords: boolean;
  phaseName: string;
  phaseKey: "period" | "follicular" | "ovulation" | "luteal" | "unknown";
  dayText: string;
  helperText: string;
  nextPeriodStart?: string;
  nextPeriodEnd?: string;
  ovulationDate?: string;
  averageCycleLength: number;
}
