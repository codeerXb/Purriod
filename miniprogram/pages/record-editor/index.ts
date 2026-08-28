import {
  DISCHARGE_OPTIONS,
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  PAIN_OPTIONS,
  SYMPTOM_OPTIONS,
  createEmptyRecord,
  normalizePeriodRecord,
} from "../../constants/options";
import {
  deleteRecord,
  loadRecord,
  saveRecord,
} from "../../repositories/records-repository";
import { PeriodRecord } from "../../types/period";
import { formatDate, parseDate } from "../../utils/date";

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && formatDate(parseDate(date)) === date;
}

function symptomItems(selected: string[]) {
  return SYMPTOM_OPTIONS.map((label) => ({
    label,
    active: selected.includes(label),
  }));
}

Page({
  data: {
    date: "",
    record: createEmptyRecord(""),
    flowOptions: FLOW_OPTIONS,
    painOptions: PAIN_OPTIONS,
    dischargeOptions: DISCHARGE_OPTIONS,
    moodOptions: MOOD_OPTIONS,
    symptomItems: symptomItems([]),
    hasExistingRecord: false,
    isSaving: false,
    syncMessage: "",
  },

  async onLoad(options) {
    const date = options.date || "";
    if (!isValidDate(date)) {
      wx.showToast({ title: "日期格式不正确", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }

    this.setData({ date });
    await this.loadRecord();
  },

  async loadRecord() {
    try {
      const existing = await loadRecord(this.data.date);
      const record = existing || createEmptyRecord(this.data.date);
      this.setData({
        record,
        hasExistingRecord: Boolean(existing),
        symptomItems: symptomItems(record.symptoms),
      });
    } catch (error) {
      console.warn("load daily record failed", error);
      wx.showToast({ title: "暂时无法读取记录", icon: "none" });
    }
  },

  updateRecord(key: string, value) {
    const record = {
      ...(this.data.record as PeriodRecord),
      [key]: value,
    };
    this.setData({
      record,
      symptomItems: symptomItems(record.symptoms),
    });
  },

  setPeriodStart(event) {
    const checked = event.detail.value;
    this.setData({
      record: {
        ...(this.data.record as PeriodRecord),
        isPeriodStart: checked,
        isPeriodEnd: checked ? false : (this.data.record as PeriodRecord).isPeriodEnd,
      },
    });
  },

  setPeriodEnd(event) {
    const checked = event.detail.value;
    this.setData({
      record: {
        ...(this.data.record as PeriodRecord),
        isPeriodStart: checked ? false : (this.data.record as PeriodRecord).isPeriodStart,
        isPeriodEnd: checked,
      },
    });
  },

  chooseFlow(event) {
    this.updateRecord("flow", event.currentTarget.dataset.value);
  },

  choosePain(event) {
    this.updateRecord("pain", event.currentTarget.dataset.value);
  },

  chooseDischarge(event) {
    this.updateRecord("discharge", event.currentTarget.dataset.value);
  },

  chooseMood(event) {
    this.updateRecord("mood", event.currentTarget.dataset.value);
  },

  toggleSymptom(event) {
    const label = event.currentTarget.dataset.value;
    const record = this.data.record as PeriodRecord;
    const symptoms = record.symptoms.includes(label)
      ? record.symptoms.filter((item) => item !== label)
      : [...record.symptoms, label];
    this.updateRecord("symptoms", symptoms);
  },

  onNotesInput(event) {
    this.updateRecord("notes", event.detail.value);
  },

  async save() {
    if (this.data.isSaving) return;
    this.setData({ isSaving: true });
    wx.showLoading({ title: "保存中" });
    try {
      const result = await saveRecord(
        normalizePeriodRecord(this.data.record as PeriodRecord),
      );
      const syncMessage = result.synced ? "已保存" : "已保存，待同步";
      this.setData({ syncMessage, hasExistingRecord: true });
      wx.showToast({ title: syncMessage, icon: result.synced ? "success" : "none" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      console.warn("save daily record failed", error);
      wx.showToast({ title: "本地保存失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ isSaving: false });
    }
  },

  async remove() {
    const confirmation = await wx.showModal({
      title: "删除这一天的记录？",
      content: "删除后会先从本机隐藏，并在联网后同步到云端。",
      confirmText: "删除",
      confirmColor: "#B65F72",
    });
    if (!confirmation.confirm) return;

    wx.showLoading({ title: "删除中" });
    try {
      const result = await deleteRecord(this.data.date);
      wx.showToast({
        title: result.synced ? "已删除" : "已删除，待同步",
        icon: "none",
      });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      console.warn("delete daily record failed", error);
      wx.showToast({ title: "删除失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
});
