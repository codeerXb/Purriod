import { buildCalendarDays, formatDate, getMonthTitle, parseDate } from "../../utils/date";
import { getAnalysis, getPeriodPrediction } from "../../utils/period";
import { getPeriodRecords, getUserSettings, savePeriodRecord } from "../../utils/storage";
import { PeriodRecord } from "../../types/period";

const FLOW_OPTIONS = [
  { label: "无", value: "none" },
  { label: "少", value: "light" },
  { label: "中", value: "medium" },
  { label: "多", value: "heavy" },
];

const PAIN_OPTIONS = [
  { label: "无", value: "none" },
  { label: "轻度", value: "mild" },
  { label: "中度", value: "moderate" },
  { label: "重度", value: "severe" },
];

const DISCHARGE_OPTIONS = [
  { label: "无", value: "none" },
  { label: "少", value: "light" },
  { label: "中", value: "medium" },
  { label: "多", value: "heavy" },
];

const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MOOD_OPTIONS = ["平静", "开心", "疲惫", "焦虑", "敏感"];
const SYMPTOM_OPTIONS = ["腹胀", "头痛", "腰酸", "疲劳", "痘痘", "乳房胀痛"];

function buildSymptomItems(selected: string[]) {
  return SYMPTOM_OPTIONS.map((label) => ({
    label,
    active: selected.includes(label),
  }));
}

function createDefaultRecord(date: string): PeriodRecord {
  return {
    date,
    isPeriodStart: false,
    isPeriodEnd: false,
    flow: "none",
    pain: "none",
    discharge: "none",
    mood: "平静",
    symptoms: [],
    notes: "",
  };
}

Page({
  data: {
    monthTitle: "",
    currentMonth: formatDate(new Date()),
    calendarDays: [],
    selectedDate: formatDate(new Date()),
    selectedRecord: createDefaultRecord(formatDate(new Date())),
    weekDays: WEEK_DAYS,
    flowOptions: FLOW_OPTIONS,
    painOptions: PAIN_OPTIONS,
    dischargeOptions: DISCHARGE_OPTIONS,
    moodOptions: MOOD_OPTIONS,
    symptomItems: buildSymptomItems([]),
    analysis: {
      averageCycle: 28,
      averagePeriod: 5,
      recordCount: 0,
      periodCount: 0,
      cycleIntervals: [],
      periodLengths: [],
    },
  },

  onShow() {
    this.loadPage();
  },

  async loadPage() {
    const [settings, records] = await Promise.all([getUserSettings(), getPeriodRecords()]);
    const currentMonthDate = parseDate(this.data.currentMonth);
    const prediction = getPeriodPrediction(records, settings);
    const selectedRecord = records.find((item) => item.date === this.data.selectedDate) || createDefaultRecord(this.data.selectedDate);
    const analysis = getAnalysis(records, settings);
    const calendarDays = buildCalendarDays(currentMonthDate).map((day) => {
      const record = records.find((item) => item.date === day.date);
      const isPredicted = prediction.nextPeriodStart && prediction.nextPeriodEnd
        ? day.date >= prediction.nextPeriodStart && day.date <= prediction.nextPeriodEnd
        : false;
      return {
        ...day,
        status: record && (record.flow !== "none" || record.isPeriodStart || record.isPeriodEnd)
          ? "period"
          : day.date === prediction.ovulationDate
            ? "ovulation"
            : isPredicted
              ? "predicted"
              : "",
        isSelected: day.date === this.data.selectedDate,
      };
    });

    this.setData({
      monthTitle: getMonthTitle(currentMonthDate),
      calendarDays,
      selectedRecord,
      symptomItems: buildSymptomItems(selectedRecord.symptoms),
      analysis,
    });
  },

  prevMonth() {
    const date = parseDate(this.data.currentMonth);
    date.setMonth(date.getMonth() - 1);
    this.setData({ currentMonth: formatDate(date) }, () => this.loadPage());
  },

  nextMonth() {
    const date = parseDate(this.data.currentMonth);
    date.setMonth(date.getMonth() + 1);
    this.setData({ currentMonth: formatDate(date) }, () => this.loadPage());
  },

  selectDate(event) {
    const date = event.currentTarget.dataset.date;
    this.setData({ selectedDate: date }, () => this.loadPage());
  },

  setPeriodStart(event) {
    this.updateSelectedRecord("isPeriodStart", event.detail.value);
  },

  setPeriodEnd(event) {
    this.updateSelectedRecord("isPeriodEnd", event.detail.value);
  },

  chooseFlow(event) {
    this.updateSelectedRecord("flow", event.currentTarget.dataset.value);
  },

  choosePain(event) {
    this.updateSelectedRecord("pain", event.currentTarget.dataset.value);
  },

  chooseDischarge(event) {
    this.updateSelectedRecord("discharge", event.currentTarget.dataset.value);
  },

  chooseMood(event) {
    this.updateSelectedRecord("mood", event.currentTarget.dataset.value);
  },

  toggleSymptom(event) {
    const value = event.currentTarget.dataset.value;
    const record = this.data.selectedRecord as PeriodRecord;
    const symptoms = record.symptoms.includes(value)
      ? record.symptoms.filter((item) => item !== value)
      : [...record.symptoms, value];
    this.updateSelectedRecord("symptoms", symptoms);
  },

  onNotesInput(event) {
    this.updateSelectedRecord("notes", event.detail.value);
  },

  updateSelectedRecord(key: string, value) {
    const selectedRecord = {
      ...(this.data.selectedRecord as PeriodRecord),
      [key]: value,
    };
    this.setData({
      selectedRecord,
      symptomItems: buildSymptomItems(selectedRecord.symptoms),
    });
  },

  async saveRecord() {
    wx.showLoading({ title: "保存中" });
    const record = this.data.selectedRecord as PeriodRecord;
    try {
      await savePeriodRecord(record);
      wx.hideLoading();
      wx.showToast({ title: "已保存", icon: "success" });
      this.loadPage();
    } catch (error) {
      wx.hideLoading();
      console.warn("save record failed", error);
      wx.showToast({ title: "已本地保存", icon: "none" });
      this.loadPage();
    }
  },
});
