const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAnalysisChartModel,
  buildCycleRingModel,
} = require("../.test-dist/miniprogram/services/chart-presenter.js");

const settings = { cycleLength: 28, periodLength: 5, schemaVersion: 1 };
const prediction = (overrides = {}) => ({
  hasRecords: true,
  phaseName: "月经期",
  phaseKey: "period",
  dayText: "第 4 天",
  helperText: "预计还有 1 天结束。",
  averageCycleLength: 28,
  cycleLength: 28,
  cycleDay: 4,
  isStale: false,
  ...overrides,
});

const analysis = (cycleTrends = [], periodTrends = []) => ({
  averageCycle: 28,
  averagePeriod: 5,
  recordCount: periodTrends.length,
  periodCount: periodTrends.length,
  cycleTrends,
  periodTrends,
});

test("cycle ring segments sum to each configured cycle", () => {
  const cases = [
    { cycleLength: 21, periodLength: 2 },
    { cycleLength: 28, periodLength: 5 },
    { cycleLength: 35, periodLength: 7 },
    { cycleLength: 45, periodLength: 10 },
  ];

  for (const item of cases) {
    const model = buildCycleRingModel(
      prediction({ cycleLength: item.cycleLength }),
      { ...item, schemaVersion: 1 },
    );
    assert.equal(
      model.segments.reduce((sum, segment) => sum + segment.days, 0),
      item.cycleLength,
    );
    assert.ok(model.segments.every((segment) => segment.days >= 1));
  }
});

test("cycle ring keeps stable semantic keys and approved colors", () => {
  const model = buildCycleRingModel(prediction(), settings);
  assert.deepEqual(
    model.segments.map(({ key, color }) => ({ key, color })),
    [
      { key: "period", color: "#D4768A" },
      { key: "follicular", color: "#C7D8C0" },
      { key: "ovulation", color: "#A890C0" },
      { key: "luteal", color: "#E9D9CF" },
    ],
  );
});

test("cycle ring clamps its indicator and preserves stale state", () => {
  assert.equal(buildCycleRingModel(prediction({ cycleDay: 0 }), settings).currentDay, 1);
  const stale = buildCycleRingModel(
    prediction({ cycleDay: 99, isStale: true, phaseName: "记录待更新" }),
    settings,
  );
  assert.equal(stale.currentDay, 28);
  assert.equal(stale.isStale, true);
  assert.equal(stale.centerTitle, "记录待更新");
});

test("analysis model supports empty data", () => {
  const model = buildAnalysisChartModel(analysis());
  assert.deepEqual(model.cycleBars, []);
  assert.deepEqual(model.periodBars, []);
});

test("estimated durations use an outline style", () => {
  const model = buildAnalysisChartModel(
    analysis([], [
      {
        startDate: "2026-08-01",
        endDate: "2026-08-05",
        length: 5,
        deltaFromAverage: 0,
        isEstimated: true,
      },
    ]),
  );
  assert.equal(model.periodBars[0].variant, "estimated");
  assert.equal(model.periodBars[0].valueLabel, "5天");
});

test("analysis model formats negative zero and positive deltas", () => {
  const cycleTrends = [
    { startDate: "2026-06-01", endDate: "2026-06-27", length: 26, deltaFromAverage: -2 },
    { startDate: "2026-06-27", endDate: "2026-07-25", length: 28, deltaFromAverage: 0 },
    { startDate: "2026-07-25", endDate: "2026-08-24", length: 30, deltaFromAverage: 2 },
  ];
  const bars = buildAnalysisChartModel(analysis(cycleTrends)).cycleBars;
  assert.deepEqual(
    bars.map((item) => item.deltaLabel),
    ["比个人平均短 2 天", "与个人平均相同", "比个人平均长 2 天"],
  );
  assert.deepEqual(
    bars.map((item) => item.key),
    [
      "cycle-2026-06-01-2026-06-27",
      "cycle-2026-06-27-2026-07-25",
      "cycle-2026-07-25-2026-08-24",
    ],
  );
});

test("analysis model keeps at most six bars", () => {
  const cycleTrends = Array.from({ length: 7 }, (_, index) => ({
    startDate: `2026-0${index + 1}-01`,
    endDate: `2026-0${index + 1}-29`,
    length: 28,
    deltaFromAverage: 0,
  }));
  const periodTrends = cycleTrends.map((item) => ({
    ...item,
    endDate: item.startDate,
    length: 5,
    isEstimated: false,
  }));
  const model = buildAnalysisChartModel(analysis(cycleTrends, periodTrends));
  assert.equal(model.cycleBars.length, 6);
  assert.equal(model.periodBars.length, 6);
});
