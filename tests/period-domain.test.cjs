const test = require("node:test");
const assert = require("node:assert/strict");

const { getPeriodPrediction } = require("../.test-dist/miniprogram/services/period-prediction.js");
const {
  buildPeriodIntervals,
  getPeriodAnalysis,
} = require("../.test-dist/miniprogram/services/period-analysis.js");
const {
  createEmptyRecord,
  isRecordEmpty,
} = require("../.test-dist/miniprogram/constants/options.js");

const settings = { cycleLength: 28, periodLength: 5, schemaVersion: 1 };
const startRecord = (date) => ({
  ...createEmptyRecord(date),
  isPeriodStart: true,
  flow: "medium",
});
const endRecord = (date) => ({
  ...createEmptyRecord(date),
  isPeriodEnd: true,
  flow: "light",
});

test("uses only the latest six valid cycle intervals", () => {
  const starts = [
    "2026-01-01",
    "2026-01-29",
    "2026-02-26",
    "2026-03-26",
    "2026-04-23",
    "2026-05-21",
    "2026-06-18",
    "2026-07-17",
  ];
  const prediction = getPeriodPrediction(
    starts.map(startRecord),
    settings,
    "2026-07-20",
  );
  assert.equal(prediction.averageCycleLength, 28);
  assert.equal(prediction.nextPeriodStart, "2026-08-14");
});

test("marks a missed prediction window as stale", () => {
  const prediction = getPeriodPrediction(
    [startRecord("2026-01-01")],
    settings,
    "2026-02-10",
  );
  assert.equal(prediction.isStale, true);
  assert.equal(prediction.phaseKey, "unknown");
});

test("pairs a period start with its explicit end", () => {
  const intervals = buildPeriodIntervals(
    [startRecord("2026-08-01"), endRecord("2026-08-05")],
    settings,
  );
  assert.deepEqual(intervals[0], {
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    length: 5,
    isEstimated: false,
  });
});

test("does not turn an orphan end into a period", () => {
  assert.deepEqual(
    buildPeriodIntervals([endRecord("2026-08-05")], settings),
    [],
  );
});

test("does not count an empty record", () => {
  const empty = createEmptyRecord("2026-08-05");
  assert.equal(isRecordEmpty(empty), true);
  assert.equal(getPeriodAnalysis([empty], settings).recordCount, 0);
});

test("returns an unknown state when no period has been recorded", () => {
  const prediction = getPeriodPrediction([], settings, "2026-08-28");
  assert.equal(prediction.hasRecords, false);
  assert.equal(prediction.phaseKey, "unknown");
});

test("uses settings for a first recorded cycle", () => {
  const prediction = getPeriodPrediction(
    [startRecord("2026-08-01")],
    settings,
    "2026-08-10",
  );
  assert.equal(prediction.averageCycleLength, 28);
  assert.equal(prediction.nextPeriodStart, "2026-08-29");
});

test("filters invalid cycle intervals", () => {
  const shortInterval = getPeriodPrediction(
    ["2026-08-01", "2026-08-18", "2026-09-15"].map(startRecord),
    settings,
    "2026-09-16",
  );
  assert.equal(shortInterval.averageCycleLength, 28);

  const longInterval = getPeriodPrediction(
    ["2026-06-01", "2026-07-17", "2026-08-14"].map(startRecord),
    settings,
    "2026-08-15",
  );
  assert.equal(longInterval.averageCycleLength, 28);
});

test("handles leap-day cycle arithmetic", () => {
  const analysis = getPeriodAnalysis(
    [startRecord("2028-02-01"), startRecord("2028-02-29")],
    settings,
  );
  assert.equal(analysis.averageCycle, 28);
  assert.equal(analysis.cycleTrends[0].length, 28);
});

test("deduplicates period starts on the same date", () => {
  const analysis = getPeriodAnalysis(
    [startRecord("2026-08-01"), startRecord("2026-08-01")],
    settings,
  );
  assert.equal(analysis.periodCount, 1);
  assert.deepEqual(analysis.cycleTrends, []);
});

test("estimates a missing period end from settings", () => {
  assert.deepEqual(buildPeriodIntervals([startRecord("2026-08-01")], settings)[0], {
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    length: 5,
    isEstimated: true,
  });
});

test("recalculates prediction when cycle settings change", () => {
  const prediction = getPeriodPrediction(
    [startRecord("2026-08-01")],
    { ...settings, cycleLength: 30 },
    "2026-08-10",
  );
  assert.equal(prediction.nextPeriodStart, "2026-08-31");
});

test("requires at least two starts for cycle trends", () => {
  assert.deepEqual(getPeriodAnalysis([], settings).cycleTrends, []);
  const oneStart = getPeriodAnalysis([startRecord("2026-08-01")], settings);
  assert.deepEqual(oneStart.cycleTrends, []);
  assert.equal(oneStart.periodCount, 1);
});

test("returns the latest six cycle trends", () => {
  const starts = [
    "2026-01-01",
    "2026-01-29",
    "2026-02-26",
    "2026-03-26",
    "2026-04-23",
    "2026-05-21",
    "2026-06-18",
  ];
  const analysis = getPeriodAnalysis(starts.map(startRecord), settings);
  assert.equal(analysis.cycleTrends.length, 6);
});
