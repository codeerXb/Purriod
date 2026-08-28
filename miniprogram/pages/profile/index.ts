import { loadSettings } from "../../repositories/settings-repository";
import { deleteAllUserData } from "../../services/user-data-service";

Page({
  data: {
    cycleLength: 28,
    periodLength: 5,
  },

  onShow() {
    this.loadSettings();
  },

  async loadSettings() {
    const settings = await loadSettings();
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
      content: "Purriod 仅保存你主动填写的经期日期、流量、痛经、白带、心情、症状和备注，用于本人的周期预测与趋势统计。数据保存在本机及你的微信云开发用户空间，不用于广告，也不提供医疗诊断。你可以随时通过“清除我的数据”删除本地与云端内容。",
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

  async clearData() {
    const result = await wx.showModal({
      title: "清除数据",
      content: "确认删除云端和本机的经期设置与全部记录吗？此操作不可恢复，并且需要联网完成。",
      confirmText: "确认清除",
      confirmColor: "#B65F72",
    });
    if (!result.confirm) return;

    wx.showLoading({ title: "清除中" });
    try {
      await deleteAllUserData();
      this.setData({ cycleLength: 28, periodLength: 5 });
      wx.showToast({ title: "已全部清除", icon: "success" });
    } catch (error) {
      console.warn("clear data failed", error);
      wx.showToast({ title: "云端删除未完成，本地数据已保留", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
});
