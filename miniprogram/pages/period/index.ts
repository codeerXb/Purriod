import { formatDate } from "../../utils/date";
import { getPeriodPrediction } from "../../utils/period";
import { getPeriodRecords, getUserSettings, savePeriodRecord } from "../../utils/storage";
import { PeriodRecord } from "../../types/period";

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
    isLoading: true,
  },

  onShow() {
    this.loadOverview();
  },

  async loadOverview() {
    this.setData({ isLoading: true });
    const [settings, records] = await Promise.all([getUserSettings(), getPeriodRecords()]);
    const today = formatDate(new Date());
    const prediction = getPeriodPrediction(records, settings, today);
    const todayRecord = records.find((record) => record.date === today) || null;

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
      isLoading: false,
    });
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
    const todayRecord = (this.data.todayRecord || {}) as PeriodRecord;
    const record: PeriodRecord = {
      date: today,
      isPeriodStart: false,
      isPeriodEnd: false,
      flow: "none",
      pain: "none",
      discharge: "none",
      mood: "平静",
      symptoms: [],
      ...todayRecord,
      ...partial,
    };

    try {
      await savePeriodRecord(record);
      wx.hideLoading();
      wx.showToast({ title: "已记录", icon: "success" });
      this.loadOverview();
    } catch (error) {
      wx.hideLoading();
      console.warn("save today failed", error);
      wx.showToast({ title: "已本地保存", icon: "none" });
      this.loadOverview();
    }
  },
});
