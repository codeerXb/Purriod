import {
  DISCHARGE_LABELS,
  FLOW_LABELS,
  PAIN_LABELS,
  isRecordEmpty,
} from "../../constants/options";
import { loadRecords } from "../../repositories/records-repository";
import { loadSettings } from "../../repositories/settings-repository";
import { buildPeriodIntervals } from "../../services/period-analysis";
import { getPeriodPrediction } from "../../services/period-prediction";
import { PeriodRecord } from "../../types/period";
import {
  addDays,
  buildCalendarDays,
  formatDate,
  getMonthTitle,
  isBetween,
  parseDate,
} from "../../utils/date";

const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

function selectedSummary(record?: PeriodRecord) {
  if (!record || isRecordEmpty(record)) {
    return {
      hasRecord: false,
      statusText: "这一天还没有记录",
      detailText: "可以记录经期状态、身体感受和心情。",
      tags: [],
    };
  }

  const tags = [] as string[];
  if (record.isPeriodStart) tags.push("月经开始");
  if (record.isPeriodEnd) tags.push("月经结束");
  if (record.flow !== "none") tags.push(`流量 ${FLOW_LABELS[record.flow]}`);
  if (record.pain !== "none") tags.push(`痛经 ${PAIN_LABELS[record.pain]}`);
  if (record.discharge !== "none") {
    tags.push(`白带 ${DISCHARGE_LABELS[record.discharge]}`);
  }
  if (record.mood) tags.push(record.mood);
  tags.push(...record.symptoms);

  return {
    hasRecord: true,
    statusText: record.isPeriodStart
      ? "本次经期从这里开始"
      : record.isPeriodEnd
        ? "本次经期在这里结束"
        : "已记录身体状态",
    detailText: record.notes || "点开后可以继续补充或修改。",
    tags,
  };
}

Page({
  data: {
    monthTitle: "",
    currentMonth: formatDate(new Date()),
    calendarDays: [],
    selectedDate: formatDate(new Date()),
    weekDays: WEEK_DAYS,
    summary: selectedSummary(),
    isLoading: true,
  },

  onShow() {
    this.loadPage();
  },

  async loadPage() {
    this.setData({ isLoading: true });
    try {
      const [settings, records] = await Promise.all([
        loadSettings(),
        loadRecords(),
      ]);
      const currentMonthDate = parseDate(this.data.currentMonth);
      const prediction = getPeriodPrediction(records, settings);
      const intervals = buildPeriodIntervals(records, settings);
      const selectedRecord = records.find(
        (item) => item.date === this.data.selectedDate,
      );
      const ovulationRangeStart = prediction.ovulationDate
        ? addDays(prediction.ovulationDate, -1)
        : "";
      const ovulationRangeEnd = prediction.ovulationDate
        ? addDays(prediction.ovulationDate, 1)
        : "";
      const calendarDays = buildCalendarDays(currentMonthDate).map((day) => ({
        ...day,
        isActualPeriod: intervals.some(
          (interval) =>
            isBetween(day.date, interval.startDate, interval.endDate),
        ),
        isPredictedPeriod: Boolean(
          prediction.nextPeriodStart &&
            prediction.nextPeriodEnd &&
            isBetween(
              day.date,
              prediction.nextPeriodStart,
              prediction.nextPeriodEnd,
            ),
        ),
        isOvulationRange: Boolean(
          ovulationRangeStart &&
            ovulationRangeEnd &&
            isBetween(day.date, ovulationRangeStart, ovulationRangeEnd),
        ),
        isOvulationDay: day.date === prediction.ovulationDate,
        isSelected: day.date === this.data.selectedDate,
      }));

      this.setData({
        monthTitle: getMonthTitle(currentMonthDate),
        calendarDays,
        summary: selectedSummary(selectedRecord),
      });
    } catch (error) {
      console.warn("load calendar failed", error);
      wx.showToast({ title: "暂时无法更新日历", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
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
    this.setData({ selectedDate: event.currentTarget.dataset.date }, () =>
      this.loadPage(),
    );
  },

  editSelectedDate() {
    wx.navigateTo({
      url: `/pages/record-editor/index?date=${this.data.selectedDate}`,
    });
  },

  goAnalysis() {
    wx.navigateTo({ url: "/pages/analysis/index" });
  },
});
