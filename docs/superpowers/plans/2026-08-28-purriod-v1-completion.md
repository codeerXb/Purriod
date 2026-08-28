# Purriod V1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the first Purriod mini-program release with reliable period recording, recent-history prediction, offline-first cloud synchronization, private deletion, and polished native charts.

**Architecture:** Keep pages thin. Pure TypeScript services calculate period intervals, predictions, analysis, and chart view models; repositories own local persistence and queued cloud synchronization. Canvas 2D custom components receive presentation-only models, while a single authenticated cloud function handles complete user-data deletion.

**Tech Stack:** WeChat Mini Program native framework, TypeScript 5.9, WeChat Cloud Development, Canvas 2D, Node.js built-in test runner, npm scripts.

**Spec:** `docs/superpowers/specs/2026-08-28-purriod-v1-completion-design.md`

## Global Constraints

- Keep exactly three tabs: 经期、记录、我的.
- Do not add subscription messages, community, content feeds, VIP, ecommerce, health scoring, medical diagnosis, or treatment advice.
- Keep only `user_settings` and `period_records` as database collections.
- Use creator-only database permissions; clients never submit an openid as an authorization target.
- Use the approved low-saturation palette: `#D4768A`, `#F0D4DA`, `#A890C0`, `#C7D8C0`, `#E9D9CF`, `#FAF0F2`.
- Use Canvas 2D without a large chart dependency; all key values remain readable when Canvas or animation is unavailable.
- Preserve the user's existing uncommitted files and stage only files named by each task.
- Run `npm test` and `npm run typecheck` before every implementation commit after Task 1.

---

## File Map

### Domain and presentation

- `miniprogram/types/period.ts`: domain records, settings, predictions, intervals, analysis, sync, and chart model interfaces.
- `miniprogram/constants/options.ts`: record options, Chinese labels, normalization, and empty-record detection.
- `miniprogram/services/period-prediction.ts`: recent-six-cycle prediction pure functions.
- `miniprogram/services/period-analysis.ts`: start/end pairing and trend analysis pure functions.
- `miniprogram/services/chart-presenter.ts`: conversion from prediction/analysis to Canvas-ready models.

### Persistence and synchronization

- `miniprogram/repositories/local-store.ts`: typed wrappers around WeChat local storage.
- `miniprogram/services/sync-service.ts`: coalesced pending queue, paginated cloud pull, and cloud push.
- `miniprogram/repositories/settings-repository.ts`: settings read/write API used by pages.
- `miniprogram/repositories/records-repository.ts`: record read/write/delete API used by pages.
- `miniprogram/services/user-data-service.ts`: authenticated full deletion and local cleanup.

### UI

- `miniprogram/components/cycle-ring/*`: animated segmented cycle ring.
- `miniprogram/components/trend-bars/*`: horizontal cycle-length bars.
- `miniprogram/components/duration-chart/*`: vertical period-duration bars.
- `miniprogram/pages/record-editor/*`: single-day editor and delete action.
- `miniprogram/pages/analysis/*`: summary cards and two trend charts.
- `miniprogram/pages/period/*`: home overview and cycle-ring integration.
- `miniprogram/pages/records/*`: calendar, day summary, editor, and analysis navigation.
- `miniprogram/pages/profile/*`: privacy/about/full deletion.
- `miniprogram/pages/settings/*`: settings repository integration.

### Cloud and documentation

- `cloudfunctions/deleteUserData/index.js`: trusted openid lookup and paginated removal.
- `cloudfunctions/deleteUserData/package.json`: cloud SDK dependency.
- `docs/cloud-database-setup.md`: collection, creator-only permission, index, deployment, and verification steps.

---

### Task 0: Preserve the Current Project Baseline

**Files:**
- Stage existing: `README.md`
- Stage existing: `assets/purriod-avatar-144.png`
- Stage existing: `miniprogram/**`
- Stage existing: `project.config.json`
- Stage existing: `tsconfig.json`

**Interfaces:**
- Consumes: the current untracked Purriod implementation inspected before planning.
- Produces: a recoverable Git baseline before any code migration.

- [ ] **Step 1: Verify the current configuration files**

Run:

```bash
for file in project.config.json tsconfig.json miniprogram/app.json miniprogram/sitemap.json miniprogram/pages/*/*.json; do
  python3 -m json.tool "$file" >/dev/null
done
```

Expected: exit code 0 and no JSON parse errors.

- [ ] **Step 2: Record the current worktree scope**

Run:

```bash
git status --short
```

Expected: `README.md` modified and the existing app/config/assets paths untracked; the two specification commits remain untouched.

- [ ] **Step 3: Commit only the existing baseline**

Run:

```bash
git add README.md assets miniprogram project.config.json tsconfig.json
git diff --cached --check
git commit -m "feat: establish Purriod mini-program baseline"
```

Expected: one commit containing the current application baseline and no reference screenshots from `/Users/dabing/Downloads/IMG_117*.PNG`.

---

### Task 1: Test Harness, Domain Types, Prediction, and Analysis

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.test.json`
- Create: `tests/period-domain.test.cjs`
- Create: `miniprogram/constants/options.ts`
- Create: `miniprogram/services/period-prediction.ts`
- Create: `miniprogram/services/period-analysis.ts`
- Modify: `miniprogram/types/period.ts`
- Modify: `miniprogram/utils/period.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: `formatDate`, `addDays`, `daysBetween`, and `isBetween` from `miniprogram/utils/date.ts`.
- Produces: `normalizePeriodRecord(record)`, `isRecordEmpty(record)`, `getPeriodPrediction(records, settings, today)`, `buildPeriodIntervals(records, settings)`, and `getPeriodAnalysis(records, settings)`.

- [ ] **Step 1: Add the TypeScript test harness**

Create `package.json` with:

```json
{
  "name": "purriod-mini-program",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test:compile": "tsc -p tsconfig.test.json",
    "test": "npm run test:compile && node --test tests/*.test.cjs"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

Create `.gitignore` with:

```text
node_modules/
.test-dist/
miniprogram_npm/
*.log
```

Create `tsconfig.test.json` that extends `tsconfig.json`, emits CommonJS into `.test-dist`, and includes `miniprogram/types/**/*.ts`, `miniprogram/constants/**/*.ts`, `miniprogram/utils/date.ts`, and `miniprogram/services/**/*.ts`.

- [ ] **Step 2: Install the pinned development dependency**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and TypeScript 5.9.x is installed locally.

- [ ] **Step 3: Write failing domain tests**

Create `tests/period-domain.test.cjs` using `node:test` and `node:assert/strict`. Include these exact cases:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { getPeriodPrediction } = require("../.test-dist/miniprogram/services/period-prediction.js");
const { buildPeriodIntervals, getPeriodAnalysis } = require("../.test-dist/miniprogram/services/period-analysis.js");
const { createEmptyRecord, isRecordEmpty } = require("../.test-dist/miniprogram/constants/options.js");

const settings = { cycleLength: 28, periodLength: 5, schemaVersion: 1 };
const startRecord = date => ({ ...createEmptyRecord(date), isPeriodStart: true, flow: "medium" });
const endRecord = date => ({ ...createEmptyRecord(date), isPeriodEnd: true, flow: "light" });
const emptyRecord = date => createEmptyRecord(date);

test("uses only the latest six valid cycle intervals", () => {
  const starts = [
    "2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26",
    "2026-04-23", "2026-05-21", "2026-06-18", "2026-07-17"
  ];
  const prediction = getPeriodPrediction(starts.map(startRecord), settings, "2026-07-20");
  assert.equal(prediction.averageCycleLength, 28);
  assert.equal(prediction.nextPeriodStart, "2026-08-14");
});

test("marks a missed prediction window as stale", () => {
  const prediction = getPeriodPrediction([startRecord("2026-01-01")], settings, "2026-02-10");
  assert.equal(prediction.isStale, true);
  assert.equal(prediction.phaseKey, "unknown");
});

test("pairs a period start with its explicit end", () => {
  const intervals = buildPeriodIntervals([
    startRecord("2026-08-01"),
    endRecord("2026-08-05")
  ], settings);
  assert.deepEqual(intervals[0], {
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    length: 5,
    isEstimated: false
  });
});

test("does not turn an orphan end into a period", () => {
  assert.deepEqual(buildPeriodIntervals([endRecord("2026-08-05")], settings), []);
});

test("does not count an empty record", () => {
  assert.equal(isRecordEmpty(emptyRecord("2026-08-05")), true);
});
```

Add table-driven assertions with these exact expectations:

| Case | Input | Expected |
| --- | --- | --- |
| no records | `[]`, defaults, `2026-08-28` | `hasRecords=false`, `phaseKey=unknown` |
| one start | start `2026-08-01`, today `2026-08-10` | average 28, next start `2026-08-29` |
| invalid short interval | starts `2026-08-01`, `2026-08-18`, `2026-09-15` | ignore 17, average 28 |
| invalid long interval | starts `2026-06-01`, `2026-07-17`, `2026-08-14` | ignore 46, average 28 |
| leap day | start `2028-02-01`, end `2028-02-29` as next start | interval 28 |
| duplicate start | two start records on `2026-08-01` | one period start |
| missing end | start `2026-08-01`, period length 5 | estimated end `2026-08-05` |
| settings change | one start, cycle 30 | next start uses 30 |
| no trend | zero starts | `cycleTrends=[]` |
| one start | one start | `cycleTrends=[]`, `periodCount=1` |
| six trends | seven valid starts | exactly six `cycleTrends` |

- [ ] **Step 4: Run the tests and verify the new modules are missing**

Run:

```bash
npm test
```

Expected: FAIL because `services/period-prediction`, `services/period-analysis`, and `constants/options` do not exist.

- [ ] **Step 5: Define the domain interfaces**

Extend `miniprogram/types/period.ts` with these interfaces and exact property names:

```ts
export type PeriodPhaseKey = "period" | "follicular" | "ovulation" | "luteal" | "unknown";

export interface PeriodInterval {
  startDate: string;
  endDate: string;
  length: number;
  isEstimated: boolean;
}

export interface CycleTrendItem {
  startDate: string;
  endDate: string;
  length: number;
  deltaFromAverage: number;
}

export interface PeriodDurationItem extends PeriodInterval {
  deltaFromAverage: number;
}

export interface PeriodAnalysis {
  averageCycle: number;
  averagePeriod: number;
  recordCount: number;
  periodCount: number;
  cycleTrends: CycleTrendItem[];
  periodTrends: PeriodDurationItem[];
}
```

Add `schemaVersion: 1` to normalized settings and records. Extend `PeriodPrediction` with `isStale`, `cycleDay`, `cycleLength`, `currentCycleStart`, and `currentPeriodEnd`.

- [ ] **Step 6: Implement normalization and Chinese display options**

In `constants/options.ts`, export `FLOW_OPTIONS`, `PAIN_OPTIONS`, `DISCHARGE_OPTIONS`, `MOOD_OPTIONS`, `SYMPTOM_OPTIONS`, `FLOW_LABELS`, `PAIN_LABELS`, `DISCHARGE_LABELS`, `createEmptyRecord(date)`, `normalizePeriodRecord(record)`, and `isRecordEmpty(record)`.

`normalizePeriodRecord` must enforce mutual exclusion: if `isPeriodStart` is true, `isPeriodEnd` becomes false; if an editor explicitly sets end after start, the editor passes start as false.

- [ ] **Step 7: Implement recent-history prediction and interval analysis**

In `period-prediction.ts`, deduplicate starts, use the latest seven start dates, filter intervals to 18-45 days, and mark the prediction stale when `today` is later than `nextPeriodEnd` without a newer start.

In `period-analysis.ts`, pair each start with the first later explicit end before the next start. If no end exists, create an estimated interval using `settings.periodLength`. Calculate analysis trends from the latest six valid intervals and exclude `isRecordEmpty` records from `recordCount`.

Replace `utils/period.ts` with compatibility re-exports so pages compile during migration:

```ts
export { DEFAULT_SETTINGS, getPeriodPrediction } from "../services/period-prediction";
export { getPeriodAnalysis as getAnalysis } from "../services/period-analysis";
```

- [ ] **Step 8: Run domain tests and typecheck**

Run:

```bash
npm test
npm run typecheck
```

Expected: all domain tests pass and TypeScript exits 0.

- [ ] **Step 9: Commit the domain layer**

Run:

```bash
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.test.json tests/period-domain.test.cjs miniprogram/types/period.ts miniprogram/constants/options.ts miniprogram/services/period-prediction.ts miniprogram/services/period-analysis.ts miniprogram/utils/period.ts
git commit -m "feat: add tested period prediction and analysis"
```

---

### Task 2: Chart Presentation Models

**Files:**
- Create: `tests/chart-presenter.test.cjs`
- Create: `miniprogram/services/chart-presenter.ts`
- Modify: `miniprogram/types/period.ts`
- Modify: `tsconfig.test.json`

**Interfaces:**
- Consumes: `PeriodPrediction`, `PeriodAnalysis`, and `UserSettings`.
- Produces: `buildCycleRingModel(prediction, settings)` and `buildAnalysisChartModel(analysis)`.

- [ ] **Step 1: Write failing presenter tests**

Test exact model behavior:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCycleRingModel, buildAnalysisChartModel } = require("../.test-dist/miniprogram/services/chart-presenter.js");

const settings = { cycleLength: 28, periodLength: 5, schemaVersion: 1 };
const prediction = overrides => ({
  hasRecords: true,
  phaseName: "月经期",
  phaseKey: "period",
  dayText: "第 4 天",
  helperText: "预计还有 1 天结束。",
  averageCycleLength: 28,
  cycleLength: 28,
  cycleDay: 4,
  isStale: false,
  ...overrides
});
const analysisWithEstimatedPeriod = () => ({
  averageCycle: 28,
  averagePeriod: 5,
  recordCount: 1,
  periodCount: 1,
  cycleTrends: [],
  periodTrends: [{
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    length: 5,
    deltaFromAverage: 0,
    isEstimated: true
  }]
});

test("cycle ring segments sum to the configured cycle", () => {
  const model = buildCycleRingModel(prediction({ cycleDay: 4 }), settings);
  assert.equal(model.segments.reduce((sum, item) => sum + item.days, 0), 28);
  assert.equal(model.currentDay, 4);
});

test("estimated durations use an outline style", () => {
  const model = buildAnalysisChartModel(analysisWithEstimatedPeriod());
  assert.equal(model.periodBars[0].variant, "estimated");
});
```

Cover 21/2, 28/5, 35/7, and 45/10 settings; zero/one/six bars; stale state; negative/zero/positive deltas; and stable keys.

- [ ] **Step 2: Run the tests and verify failure**

Run:

```bash
npm test
```

Expected: FAIL because `chart-presenter.ts` and chart interfaces do not exist.

- [ ] **Step 3: Define chart model interfaces**

Add to `types/period.ts`:

```ts
export interface CycleRingSegment {
  key: "period" | "follicular" | "ovulation" | "luteal";
  label: string;
  days: number;
  color: string;
}

export interface CycleRingModel {
  segments: CycleRingSegment[];
  totalDays: number;
  currentDay: number;
  centerTitle: string;
  centerValue: string;
  helperText: string;
  isStale: boolean;
}

export interface ChartBarItem {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  deltaLabel: string;
  variant: "actual" | "estimated";
}
```

- [ ] **Step 4: Implement the presenters**

`buildCycleRingModel` allocates period days first, a three-day ovulation segment, at least one follicular day, and the remaining days to luteal phase with a target maximum of 14 days. Clamp the current day to `1..totalDays` and preserve the exact approved colors.

`buildAnalysisChartModel` returns `{ cycleBars, periodBars }`; labels use `M月D日`, value labels use `N天`, and deltas use `比个人平均长 N 天`, `比个人平均短 N 天`, or `与个人平均相同`.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test
npm run typecheck
git add tests/chart-presenter.test.cjs miniprogram/services/chart-presenter.ts miniprogram/types/period.ts tsconfig.test.json
git commit -m "feat: add chart presentation models"
```

Expected: all tests and typecheck pass before the commit.

---

### Task 3: Offline-First Repositories and Sync Queue

**Files:**
- Create: `tests/repositories.test.cjs`
- Create: `tests/helpers/wx-mock.cjs`
- Create: `miniprogram/repositories/local-store.ts`
- Create: `miniprogram/services/sync-service.ts`
- Create: `miniprogram/repositories/settings-repository.ts`
- Create: `miniprogram/repositories/records-repository.ts`
- Modify: `miniprogram/types/period.ts`
- Modify: `miniprogram/utils/storage.ts`
- Modify: `tsconfig.test.json`

**Interfaces:**
- Consumes: normalized `UserSettings` and `PeriodRecord`.
- Produces: `getCachedSettings`, `setCachedSettings`, `getCachedRecords`, `setCachedRecords`, `getSyncQueue`, `setSyncQueue`, `clearLocalUserData`, `loadSettings`, `saveSettings`, `loadRecords`, `loadRecord`, `saveRecord`, `deleteRecord`, `flushPendingSync`, and `getPendingSyncCount`.

- [ ] **Step 1: Add sync types and failing repository tests**

Define:

```ts
export interface SaveResult {
  synced: boolean;
  pendingCount: number;
}

export interface SyncOperation {
  entity: "settings" | "record";
  key: string;
  action: "upsert" | "delete";
  payload?: UserSettings | PeriodRecord;
  localUpdatedAt: number;
}
```

Create an in-memory `wx` mock covering `getStorageSync`, `setStorageSync`, `removeStorageSync`, `cloud.database`, collection queries, and failures. Test:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { createWxMock } = require("./helpers/wx-mock.cjs");
const { createEmptyRecord } = require("../.test-dist/miniprogram/constants/options.js");
const record = (date, overrides = {}) => ({ ...createEmptyRecord(date), flow: "medium", ...overrides });
let wxMock;

test.beforeEach(() => {
  wxMock = createWxMock();
  global.wx = wxMock.wx;
});

test("saveRecord keeps local data when cloud write fails", async () => {
  wxMock.failWrites(true);
  const result = await saveRecord(record("2026-08-28"));
  assert.equal(result.synced, false);
  assert.equal(getPendingSyncCount(), 1);
  assert.equal((await loadRecord("2026-08-28")).date, "2026-08-28");
});

test("coalesces repeated writes for the same date", async () => {
  await saveRecord(record("2026-08-28", { mood: "平静" }));
  await saveRecord(record("2026-08-28", { mood: "开心" }));
  assert.equal(getPendingSyncCount(), 1);
});

test("a pending delete is not restored by remote pull", async () => {
  await deleteRecord("2026-08-28");
  wxMock.remoteRecords([record("2026-08-28")]);
  assert.equal((await loadRecords()).length, 0);
});
```

Also test settings fallback, pagination, successful flush, failed flush, record ordering, and cloud-empty/local-pending merge.

`createWxMock()` returns `{ wx, failWrites, remoteRecords, callFunctionRejects, callFunctionResolves, storageSnapshot }`. Collection mocks implement `where`, `orderBy`, `skip`, `limit`, `get`, `add`, `doc().update`, and `doc().remove`, returning the same Promise result shapes used by the production repositories.

- [ ] **Step 2: Run the repository tests and verify failure**

Run:

```bash
npm test
```

Expected: FAIL because repository and sync modules do not exist.

Update `tsconfig.test.json` so its `include` also contains `miniprogram/repositories/**/*.ts`; otherwise the repository modules will not be emitted into `.test-dist`.

- [ ] **Step 3: Implement typed local storage**

Use these storage keys:

```ts
export const STORAGE_KEYS = {
  SETTINGS: "purriod_user_settings",
  RECORDS: "purriod_period_records",
  SYNC_QUEUE: "purriod_sync_queue"
} as const;
```

All setters return normally only after `wx.setStorageSync` succeeds. `clearLocalUserData` removes all three keys.

- [ ] **Step 4: Implement queue coalescing and paginated cloud access**

`enqueueSyncOperation` replaces an existing operation with the same `entity:key`. `flushPendingSync` processes operations in queue order, removes only successful operations, and returns `{ synced, pendingCount }`.

Remote record pull loops with `skip(offset).limit(20)` until a page contains fewer than 20 documents. Every cloud document is normalized before merging. A local key with a pending upsert/delete always wins over pulled data. Cloud payloads use `db.serverDate()` for `createdAt` and `updatedAt`; local queue ordering uses `Date.now()` only for client-side merge order.

- [ ] **Step 5: Implement page-facing repositories**

`saveSettings` and `saveRecord` write local state first, enqueue, then attempt a flush. `deleteRecord` removes the local item, enqueues a delete, and attempts a flush. `loadSettings` and `loadRecords` attempt a flush and pull, but return local state when cloud access fails.

Replace `utils/storage.ts` with compatibility exports that point to the new repositories until every page migration is complete.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test
npm run typecheck
git add tests/helpers/wx-mock.cjs tests/repositories.test.cjs miniprogram/repositories/local-store.ts miniprogram/services/sync-service.ts miniprogram/repositories/settings-repository.ts miniprogram/repositories/records-repository.ts miniprogram/types/period.ts miniprogram/utils/storage.ts tsconfig.test.json
git commit -m "feat: add offline-first cloud synchronization"
```

---

### Task 4: Daily Record Editor and Calendar Summary

**Files:**
- Create: `miniprogram/pages/record-editor/index.json`
- Create: `miniprogram/pages/record-editor/index.ts`
- Create: `miniprogram/pages/record-editor/index.wxml`
- Create: `miniprogram/pages/record-editor/index.wxss`
- Modify: `miniprogram/pages/records/index.ts`
- Modify: `miniprogram/pages/records/index.wxml`
- Modify: `miniprogram/pages/records/index.wxss`
- Modify: `miniprogram/app.json`

**Interfaces:**
- Consumes: record option constants, `loadRecord`, `saveRecord`, `deleteRecord`, `getPeriodPrediction`, and `buildPeriodIntervals`.
- Produces: `pages/record-editor/index?date=YYYY-MM-DD` and a calendar-only records Tab with no dead navigation.

- [ ] **Step 1: Add the editor route and skeleton**

Add `pages/record-editor/index` after settings in `app.json`. Its page data contains `date`, `record`, the five option arrays, `symptomItems`, `hasExistingRecord`, `isSaving`, and `syncMessage`.

- [ ] **Step 2: Implement editor behavior**

On load, validate the route date with `YYYY-MM-DD`; invalid dates show a toast and navigate back. Load an existing record or `createEmptyRecord(date)`. Toggling start sets end false; toggling end sets start false. Symptoms render from `SYMPTOM_OPTIONS`, fixing the current `symptomItems`/`symptomOptions` mismatch.

Save calls `saveRecord(normalizePeriodRecord(record))` and displays `已保存` when synced or `已保存，待同步` when queued. Delete uses a confirmation modal, calls `deleteRecord(date)`, and navigates back only after local deletion succeeds.

- [ ] **Step 3: Reduce the records Tab to calendar and summary**

Remove the long inline form. Keep month navigation, calendar, legend, selected-day summary, and the `编辑这一天` button. Map actual intervals across every included date, predicted dates with a dashed class, and ovulation range/day with separate classes. Do not add the analysis entry until Task 7 creates and registers the page.

Use these navigation calls:

```ts
wx.navigateTo({ url: `/pages/record-editor/index?date=${this.data.selectedDate}` });
```

- [ ] **Step 4: Run static checks**

Run:

```bash
npm test
npm run typecheck
for file in miniprogram/app.json miniprogram/pages/records/index.json miniprogram/pages/record-editor/index.json; do
  python3 -m json.tool "$file" >/dev/null
done
rg -n "symptomItems" miniprogram/pages/record-editor/index.ts miniprogram/pages/record-editor/index.wxml
```

Expected: tests/typecheck pass, JSON parses, and both editor data and WXML use the same symptom collection.

- [ ] **Step 5: Commit the editor and calendar**

Run:

```bash
git add miniprogram/app.json miniprogram/pages/record-editor miniprogram/pages/records
git commit -m "feat: add focused daily record editor"
```

---

### Task 5: Authenticated Full Deletion and Settings Integration

**Files:**
- Create: `tests/user-data-service.test.cjs`
- Create: `miniprogram/services/user-data-service.ts`
- Create: `cloudfunctions/deleteUserData/index.js`
- Create: `cloudfunctions/deleteUserData/package.json`
- Modify: `miniprogram/pages/profile/index.ts`
- Modify: `miniprogram/pages/profile/index.wxml`
- Modify: `miniprogram/pages/settings/index.ts`
- Modify: `miniprogram/app.ts`

**Interfaces:**
- Consumes: `clearLocalUserData`, `flushPendingSync`, `loadSettings`, and `saveSettings`.
- Produces: `deleteAllUserData(): Promise<void>` and the `deleteUserData` cloud function.

- [ ] **Step 1: Write a failing client deletion test**

Test that local data is preserved when `wx.cloud.callFunction({ name: "deleteUserData" })` rejects, and cleared only when the result contains `{ success: true }`.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { createWxMock } = require("./helpers/wx-mock.cjs");
const localStore = require("../.test-dist/miniprogram/repositories/local-store.js");
const { deleteAllUserData } = require("../.test-dist/miniprogram/services/user-data-service.js");
let wxMock;

test.beforeEach(() => {
  wxMock = createWxMock();
  global.wx = wxMock.wx;
  localStore.setCachedRecords([{ date: "2026-08-28", flow: "medium" }]);
});

test("keeps local health data when cloud deletion fails", async () => {
  wxMock.callFunctionRejects(new Error("offline"));
  await assert.rejects(deleteAllUserData(), /offline/);
  assert.equal(localStore.getCachedRecords().length, 1);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run `npm test`.

Expected: FAIL because `user-data-service.ts` does not exist.

- [ ] **Step 3: Implement client deletion semantics**

`deleteAllUserData` calls the cloud function without an openid argument. Only after `{ success: true }` does it call `clearLocalUserData`. Any other response throws `云端数据删除未完成`.

- [ ] **Step 4: Implement the cloud function**

Use the official `wx-server-sdk`:

```js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function removeAll(collectionName, openid) {
  let removed = 0;
  while (true) {
    const { data } = await db.collection(collectionName).where({ _openid: openid }).limit(100).get();
    if (!data.length) return removed;
    await Promise.all(data.map(item => db.collection(collectionName).doc(item._id).remove()));
    removed += data.length;
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const settingsRemoved = await removeAll("user_settings", OPENID);
  const recordsRemoved = await removeAll("period_records", OPENID);
  return { success: true, settingsRemoved, recordsRemoved };
};
```

Set `wx-server-sdk` to `latest` in the cloud function package so WeChat Developer Tools installs the environment-compatible current SDK during cloud deployment.

- [ ] **Step 5: Migrate profile, settings, and app launch**

Profile uses `deleteAllUserData`, keeps the loading overlay in `try/finally`, and displays failure without claiming deletion. Settings uses `loadSettings`/`saveSettings` and shows the pending-sync message. `app.ts` registers `wx.onNetworkStatusChange` and calls `flushPendingSync` when connected; it also attempts one non-blocking flush after cloud initialization.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test
npm run typecheck
node --check cloudfunctions/deleteUserData/index.js
python3 -m json.tool cloudfunctions/deleteUserData/package.json >/dev/null
git add tests/user-data-service.test.cjs miniprogram/services/user-data-service.ts miniprogram/pages/profile miniprogram/pages/settings miniprogram/app.ts cloudfunctions/deleteUserData
git commit -m "feat: add authenticated user data deletion"
```

---

### Task 6: Animated Cycle Ring Component

**Files:**
- Create: `miniprogram/components/cycle-ring/index.json`
- Create: `miniprogram/components/cycle-ring/index.ts`
- Create: `miniprogram/components/cycle-ring/index.wxml`
- Create: `miniprogram/components/cycle-ring/index.wxss`
- Modify: `miniprogram/pages/period/index.json`
- Modify: `miniprogram/pages/period/index.ts`
- Modify: `miniprogram/pages/period/index.wxml`
- Modify: `miniprogram/pages/period/index.wxss`

**Interfaces:**
- Consumes: `CycleRingModel` from `buildCycleRingModel`.
- Produces: `<cycle-ring model="{{ringModel}}" />` with Canvas fallback text.

- [ ] **Step 1: Register the component and fallback markup**

In `period/index.ts`, call `buildCycleRingModel(prediction, settings)` inside `loadOverview` and store the result as `ringModel`. This makes the component task functional before the final repository migration in Task 8.

Use:

```xml
<view class="ring-shell">
  <canvas type="2d" id="cycleCanvas" class="ring-canvas"></canvas>
  <view class="ring-center">
    <view class="ring-title">{{model.centerTitle}}</view>
    <view class="ring-value">{{model.centerValue}}</view>
  </view>
</view>
<view class="ring-helper">{{model.helperText}}</view>
```

The WXML center text remains visible even if Canvas fails.

- [ ] **Step 2: Implement high-DPI Canvas initialization**

Inside `ready`, query `#cycleCanvas` with `fields({ node: true, size: true })`, read `wx.getSystemInfoSync().pixelRatio`, set physical canvas width/height, scale the 2D context once, and draw in logical pixels.

- [ ] **Step 3: Implement segmented arcs and indicator**

Draw four rounded arcs with a six-degree gap. Segment sweep is `segment.days / model.totalDays * 2π` minus the gap. Draw the current-day indicator as a filled circle with a pale outer halo. For `model.isStale`, lower global alpha to 0.55 and omit motion.

- [ ] **Step 4: Implement bounded animation lifecycle**

Use `canvas.requestAnimationFrame` for a 500ms ease-out sweep. Store the frame id, cancel it before every redraw and in `detached`, and skip animation after the first successful draw unless the model changes from no-record to recorded.

- [ ] **Step 5: Verify component integration**

Run:

```bash
npm test
npm run typecheck
python3 -m json.tool miniprogram/components/cycle-ring/index.json >/dev/null
python3 -m json.tool miniprogram/pages/period/index.json >/dev/null
rg -n "requestAnimationFrame|cancelAnimationFrame|detached" miniprogram/components/cycle-ring/index.ts
```

Expected: tests/typecheck pass, JSON parses, and the lifecycle contains animation cleanup.

- [ ] **Step 6: Commit**

Run:

```bash
git add miniprogram/components/cycle-ring miniprogram/pages/period/index.json miniprogram/pages/period/index.ts miniprogram/pages/period/index.wxml miniprogram/pages/period/index.wxss
git commit -m "feat: add animated Purriod cycle ring"
```

---

### Task 7: Analysis Charts and Analysis Page

**Files:**
- Create: `miniprogram/components/trend-bars/index.json`
- Create: `miniprogram/components/trend-bars/index.ts`
- Create: `miniprogram/components/trend-bars/index.wxml`
- Create: `miniprogram/components/trend-bars/index.wxss`
- Create: `miniprogram/components/duration-chart/index.json`
- Create: `miniprogram/components/duration-chart/index.ts`
- Create: `miniprogram/components/duration-chart/index.wxml`
- Create: `miniprogram/components/duration-chart/index.wxss`
- Create: `miniprogram/pages/analysis/index.json`
- Create: `miniprogram/pages/analysis/index.ts`
- Create: `miniprogram/pages/analysis/index.wxml`
- Create: `miniprogram/pages/analysis/index.wxss`
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/records/index.ts`
- Modify: `miniprogram/pages/records/index.wxml`
- Modify: `miniprogram/pages/records/index.wxss`

**Interfaces:**
- Consumes: `loadRecords`, `loadSettings`, `getPeriodAnalysis`, and `buildAnalysisChartModel`.
- Produces: an analysis page with accessible summary cards and two Canvas charts.

- [ ] **Step 1: Implement reusable Canvas chart lifecycle**

Both components use the same high-DPI initialization pattern as `cycle-ring`, accept a `bars` array, cancel prior animation before redraw, and keep a WXML value list below the Canvas for accessibility/fallback.

`trend-bars` draws horizontal rounded bars scaled against the largest value with a 500ms width animation. `duration-chart` draws vertical rounded bars with a minimum visible height, a dashed outline for `estimated`, and a 500ms height animation.

- [ ] **Step 2: Implement hit testing and detail overlays**

Store each bar's logical rectangle during draw. On `bindtouchend`, use `event.changedTouches[0]`, convert the touch coordinate to logical Canvas coordinates, find the matching rectangle, and set `activeItem`. Render a WXML detail bubble using the item's label, valueLabel, and deltaLabel; this avoids drawing inaccessible tooltip text into Canvas.

- [ ] **Step 3: Implement the analysis page**

Register both components in `analysis/index.json`. On show, load settings and records, compute analysis and chart models, and populate:

```ts
{
  averageCycle: 28,
  averagePeriod: 5,
  periodCount: 0,
  cycleBars: [],
  periodBars: [],
  hasCycleTrend: false,
  hasPeriodTrend: false
}
```

Summary cards always render. When data is insufficient, display `再记录一次经期后生成趋势` and never generate sample bars.

- [ ] **Step 4: Register the route and visual style**

Add `pages/analysis/index` as a non-tab page in `app.json`. Use the approved low-saturation palette, 32rpx card radii, soft shadows, and no health score, VIP, risk, or abnormal labels.

Add the `查看周期分析` card/button to the records Tab only after the route exists, using:

```ts
goAnalysis() {
  wx.navigateTo({ url: "/pages/analysis/index" });
}
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test
npm run typecheck
for file in miniprogram/app.json miniprogram/components/trend-bars/index.json miniprogram/components/duration-chart/index.json miniprogram/pages/analysis/index.json; do
  python3 -m json.tool "$file" >/dev/null
done
rg -n "健康度|风险|异常|VIP" miniprogram/pages/analysis miniprogram/components || true
git add miniprogram/app.json miniprogram/components/trend-bars miniprogram/components/duration-chart miniprogram/pages/analysis miniprogram/pages/records
git commit -m "feat: add vivid cycle analysis charts"
```

Expected: automated checks pass and the prohibited-content search returns no matches.

---

### Task 8: Home, Calendar, and Cross-Page Integration

**Files:**
- Modify: `miniprogram/pages/period/index.ts`
- Modify: `miniprogram/pages/period/index.wxml`
- Modify: `miniprogram/pages/period/index.wxss`
- Modify: `miniprogram/pages/records/index.ts`
- Modify: `miniprogram/pages/records/index.wxml`
- Modify: `miniprogram/pages/records/index.wxss`
- Modify: `miniprogram/utils/storage.ts`

**Interfaces:**
- Consumes: final repositories, prediction, intervals, chart presenters, and Chinese label maps.
- Produces: consistent data and state across home, records, editor, settings, and analysis.

- [ ] **Step 1: Migrate the home page to final interfaces**

Use `loadSettings`, `loadRecords`, `saveRecord`, `getPeriodPrediction`, and `buildCycleRingModel`. Map today's flow/pain/discharge to Chinese labels. `markPeriodStart` creates or updates today's record with start true/end false; `markPeriodEnd` does the inverse.

Show `同步完成` only when the save result is synced and `已保存在本机，等待同步` otherwise. Use `try/finally` for every loading overlay.

- [ ] **Step 2: Finalize calendar state priority**

Each date receives these independent booleans: `isActualPeriod`, `isPredictedPeriod`, `isOvulationRange`, `isOvulationDay`, `isToday`, and `isSelected`. The WXML composes classes instead of collapsing them into one `status`, so today/selected never destroys the underlying state.

- [ ] **Step 3: Remove the compatibility storage module**

Search for imports from `utils/storage`. Migrate every remaining page. Delete `miniprogram/utils/storage.ts` only when this returns no imports:

```bash
rg -n 'utils/storage|../../utils/storage' miniprogram
```

- [ ] **Step 4: Run complete automated checks**

Run:

```bash
npm test
npm run typecheck
rg -n "medium|mild|moderate|severe|heavy|light" miniprogram/pages --glob '*.wxml' || true
rg -n "utils/storage" miniprogram || true
```

Expected: tests/typecheck pass; internal enum values are not rendered in WXML; no page imports the deleted compatibility module.

- [ ] **Step 5: Commit integration**

Run:

```bash
git add miniprogram/pages/period miniprogram/pages/records miniprogram/utils/storage.ts
git commit -m "feat: complete Purriod period tracking flow"
```

If `storage.ts` is deleted, stage it with the same explicit path so Git records the deletion.

---

### Task 9: Cloud Setup Documentation and Full Verification

**Files:**
- Create: `docs/cloud-database-setup.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: final application, cloud function, database model, and approved spec.
- Produces: deployable setup instructions and fresh verification evidence.

- [ ] **Step 1: Document exact cloud setup**

`docs/cloud-database-setup.md` must contain:

1. Environment id `cloud1-d3gth40uhfb98e9c6`.
2. Create `user_settings` and `period_records` only.
3. Apply the CloudBase `PRIVATE`/仅创建者及管理员可读写 preset to both collections.
4. Add ascending `date` and descending `updatedAt` indexes to `period_records`; add descending `updatedAt` to `user_settings`.
5. Upload and deploy `deleteUserData` with cloud dependencies installed.
6. Verify with two WeChat test identities that one user cannot read/update the other user's documents.
7. Verify full deletion removes both collections' documents for only the caller.

Reference the current official sources:

- `https://developers.weixin.qq.com/miniprogram/dev/component/canvas.html`
- `https://docs.cloudbase.net/rule/learn-rules`
- `https://github.com/wechat-miniprogram/wx-server-sdk`

- [ ] **Step 2: Update README run and verification commands**

Add `npm install`, `npm test`, `npm run typecheck`, cloud deployment, privacy scope, and first-version non-goals. Do not overwrite unrelated existing README wording.

- [ ] **Step 3: Run the full local verification suite**

Run:

```bash
npm test
npm run typecheck
for file in project.config.json tsconfig.json tsconfig.test.json package.json miniprogram/app.json miniprogram/sitemap.json miniprogram/pages/*/*.json miniprogram/components/*/*.json cloudfunctions/deleteUserData/package.json; do
  python3 -m json.tool "$file" >/dev/null
done
node --check cloudfunctions/deleteUserData/index.js
rg -n "requestSubscribeMessage|VIP|会员中心|社区入口|电商入口|健康评分" miniprogram cloudfunctions || true
git diff --check
```

Expected: tests/typecheck/JSON/Node syntax/diff checks pass and the prohibited-feature search has no functional matches.

- [ ] **Step 4: Open and compile in WeChat Developer Tools**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dabing/Downloads/Purriod_Project
```

In Developer Tools verify:

- no TypeScript, WXML, WXSS, component, or route compile errors;
- new user empty state;
- start, end, edit, delete, and settings flow;
- offline save and network recovery sync;
- cycle ring at 21/2, 28/5, 35/7, and 45/10 settings;
- analysis at zero, one, and six cycles;
- chart animation stops after navigation;
- narrow and wide simulator layouts.

- [ ] **Step 5: Run cloud and real-device verification**

Deploy the two collections' private permissions and `deleteUserData`. Verify on one iOS and one Android device: local save, cloud sync, cross-device pull, owner isolation, full deletion, chart clarity, and no visible internal English enums.

- [ ] **Step 6: Commit documentation and any verification-only corrections**

Run the full local verification suite again after corrections, then:

```bash
git add README.md docs/cloud-database-setup.md
git commit -m "docs: add Purriod cloud setup and verification"
```

If verification required code corrections, stage each corrected file explicitly and use a separate `fix:` commit before the documentation commit.

- [ ] **Step 7: Final worktree and history audit**

Run:

```bash
git status --short
git log --oneline --decorate -12
```

Expected: no unexpected untracked app files, all implementation commits visible, and only intentionally user-owned unrelated files remain modified.
