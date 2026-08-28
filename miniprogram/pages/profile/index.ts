import { clearAllUserData, getUserSettings } from "../../utils/storage";

Page({
  data: {
    cycleLength: 28,
    periodLength: 5,
  },

  onShow() {
    this.loadSettings();
  },

  async loadSettings() {
    const settings = await getUserSettings();
    this.setData({
      cycleLength: settings.cycleLength,
      periodLength: settings.periodLength,
    });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  },

  showPrivacy() {
    wx.showModal({
      title: "隐私说明",
      content: "Purriod 仅收集经期日期、流量、痛经、白带、心情和症状标签，用于周期预测与个人统计分析。数据仅用于本小程序功能，不提供医疗诊断或治疗建议。",
      showCancel: false,
      confirmText: "知道了",
    });
  },

  showAbout() {
    wx.showModal({
      title: "关于 Purriod",
      content: "Purriod 是一款简洁温柔的经期记录与预测工具，帮助你更轻松地关注自己的周期节奏。",
      showCancel: false,
      confirmText: "好的",
    });
  },

  clearData() {
    wx.showModal({
      title: "清除数据",
      content: "确认清除你的经期设置和所有记录吗？此操作不可恢复。",
      confirmText: "确认清除",
      confirmColor: "#D4768A",
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        wx.showLoading({ title: "清除中" });
        try {
          await clearAllUserData();
          wx.hideLoading();
          wx.showToast({ title: "已清除", icon: "success" });
          this.loadSettings();
        } catch (error) {
          wx.hideLoading();
          console.warn("clear data failed", error);
          wx.showToast({ title: "清除失败", icon: "none" });
        }
      },
    });
  },
});
