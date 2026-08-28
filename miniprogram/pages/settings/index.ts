import {
  loadSettings,
  saveSettings,
} from "../../repositories/settings-repository";

Page({
  data: {
    cycleLength: 28,
    periodLength: 5,
    syncMessage: "",
  },

  onLoad() {
    this.loadSettings();
  },

  async loadSettings() {
    const settings = await loadSettings();
    this.setData({
      cycleLength: settings.cycleLength,
      periodLength: settings.periodLength,
    });
  },

  onCycleChange(event) {
    this.setData({ cycleLength: event.detail.value });
  },

  onPeriodChange(event) {
    this.setData({ periodLength: event.detail.value });
  },

  async saveSettings() {
    wx.showLoading({ title: "保存中" });
    try {
      const result = await saveSettings({
        cycleLength: this.data.cycleLength,
        periodLength: this.data.periodLength,
        schemaVersion: 1,
      });
      const syncMessage = result.synced ? "已保存" : "已保存，待同步";
      this.setData({ syncMessage });
      wx.showToast({
        title: syncMessage,
        icon: result.synced ? "success" : "none",
      });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (error) {
      console.warn("save settings failed", error);
      wx.showToast({ title: "本地保存失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
});
