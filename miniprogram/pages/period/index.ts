import { formatDate } from "../../utils/date";
import {
  DISCHARGE_LABELS,
  FLOW_LABELS,
  PAIN_LABELS,
  createEmptyRecord,
  isRecordEmpty,
} from "../../constants/options";
import {
  loadRecords,
  saveRecord,
} from "../../repositories/records-repository";
import { loadSettings } from "../../repositories/settings-repository";
import { buildCycleRingModel } from "../../services/chart-presenter";
import {
  DEFAULT_SETTINGS,
  getPeriodPrediction,
} from "../../services/period-prediction";
import { PeriodRecord } from "../../types/period";

const INITIAL_PREDICTION = getPeriodPrediction([], DEFAULT_SETTINGS);

Page({
  data: {
    today: formatDate(new Date()),
    phaseName: "加载中",
    phaseKey: "unknown",
    dayText: "正在读取记录",
    helperText: "Purriod 正在帮你整理周期信息。",
    nextPeriodStart: "--",
    nextPeriodEnd: "--",
    ovulationDate: "--",
    todayRecord: null,
    todaySummary: null,
    syncMessage: "",
    ringModel: buildCycleRingModel(INITIAL_PREDICTION, DEFAULT_SETTINGS),
    isLoading: true,
  },

  onShow() {
    this.loadOverview();
  },

  async loadOverview() {
    this.setData({ isLoading: true });
    try {
      const [settings, records] = await Promise.all([
        loadSettings(),
        loadRecords(),
      ]);
      const today = formatDate(new Date());
      const prediction = getPeriodPrediction(records, settings, today);
      const foundToday = records.find((record) => record.date === today);
      const todayRecord = foundToday && !isRecordEmpty(foundToday) ? foundToday : null;
      const periodStatus = todayRecord?.isPeriodStart
        ? "月经开始"
        : todayRecord?.isPeriodEnd
          ? "月经结束"
          : "日常记录";
      const todaySummary = todayRecord
        ? {
            periodStatus,
            flow: FLOW_LABELS[todayRecord.flow],
            pain: PAIN_LABELS[todayRecord.pain],
            discharge: DISCHARGE_LABELS[todayRecord.discharge],
            mood: todayRecord.mood || "未记录",
            symptoms: todayRecord.symptoms.join("、") || "未记录",
          }
        : null;

      this.setData({
        today,
        phaseName: prediction.phaseName,
        phaseKey: prediction.phaseKey,
        dayText: prediction.dayText,
        helperText: prediction.helperText,
        nextPeriodStart: prediction.nextPeriodStart || "--",
        nextPeriodEnd: prediction.nextPeriodEnd || "--",
        ovulationDate: prediction.ovulationDate || "--",
        todayRecord,
        todaySummary,
        ringModel: buildCycleRingModel(prediction, settings),
      });
    } catch (error) {
      console.warn("load period overview failed", error);
      wx.showToast({ title: "暂时无法更新首页", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async markPeriodStart() {
    await this.saveToday({ isPeriodStart: true, isPeriodEnd: false, flow: "medium" });
  },

  async markPeriodEnd() {
    await this.saveToday({ isPeriodStart: false, isPeriodEnd: true, flow: "light" });
  },

  goRecords() {
    wx.switchTab({ url: "/pages/records/index" });
  },

  async saveToday(partial: Partial<PeriodRecord>) {
    wx.showLoading({ title: "保存中" });
    const today = formatDate(new Date());
    const todayRecord = (this.data.todayRecord || createEmptyRecord(today)) as PeriodRecord;
    const record: PeriodRecord = {
      ...todayRecord,
      ...partial,
      schemaVersion: 1,
    };

    try {
      const result = await saveRecord(record);
      const syncMessage = result.synced
        ? "同步完成"
        : "已保存在本机，等待同步";
      this.setData({ syncMessage });
      wx.showToast({
        title: result.synced ? "已记录" : "已保存，待同步",
        icon: result.synced ? "success" : "none",
      });
      await this.loadOverview();
    } catch (error) {
      console.warn("save today failed", error);
      wx.showToast({ title: "本地保存失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
});
