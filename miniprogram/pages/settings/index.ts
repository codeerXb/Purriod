import { getUserSettings, saveUserSettings } from "../../utils/storage";

Page({
  data: {
    cycleLength: 28,
    periodLength: 5,
  },

  onLoad() {
    this.loadSettings();
  },

  async loadSettings() {
    const settings = await getUserSettings();
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
      await saveUserSettings({
        cycleLength: this.data.cycleLength,
        periodLength: this.data.periodLength,
      });
      wx.hideLoading();
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (error) {
      wx.hideLoading();
      console.warn("save settings failed", error);
      wx.showToast({ title: "已本地保存", icon: "none" });
      setTimeout(() => wx.navigateBack(), 600);
    }
  },
});
