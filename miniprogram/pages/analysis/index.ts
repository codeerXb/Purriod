import { loadRecords } from "../../repositories/records-repository";
import { loadSettings } from "../../repositories/settings-repository";
import { getPeriodAnalysis } from "../../services/period-analysis";
import { buildAnalysisChartModel } from "../../services/chart-presenter";

Page({
  data: {
    averageCycle: 28,
    averagePeriod: 5,
    periodCount: 0,
    recordCount: 0,
    cycleBars: [],
    periodBars: [],
    hasCycleTrend: false,
    hasPeriodTrend: false,
    isLoading: true,
  },

  onShow() {
    this.loadAnalysis();
  },

  async loadAnalysis() {
    this.setData({ isLoading: true });
    try {
      const [settings, records] = await Promise.all([
        loadSettings(),
        loadRecords(),
      ]);
      const analysis = getPeriodAnalysis(records, settings);
      const charts = buildAnalysisChartModel(analysis);
      this.setData({
        averageCycle: analysis.averageCycle,
        averagePeriod: analysis.averagePeriod,
        periodCount: analysis.periodCount,
        recordCount: analysis.recordCount,
        cycleBars: charts.cycleBars,
        periodBars: charts.periodBars,
        hasCycleTrend: charts.cycleBars.length > 0,
        hasPeriodTrend: charts.periodBars.length > 0,
      });
    } catch (error) {
      console.warn("load analysis failed", error);
      wx.showToast({ title: "暂时无法更新分析", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },
});
