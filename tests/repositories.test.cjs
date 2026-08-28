const test = require("node:test");
const assert = require("node:assert/strict");

const { createWxMock } = require("./helpers/wx-mock.cjs");
const {
  createEmptyRecord,
} = require("../.test-dist/miniprogram/constants/options.js");
const localStore = require("../.test-dist/miniprogram/repositories/local-store.js");
const {
  deleteRecord,
  loadRecord,
  loadRecords,
  saveRecord,
} = require("../.test-dist/miniprogram/repositories/records-repository.js");
const {
  loadSettings,
  saveSettings,
} = require("../.test-dist/miniprogram/repositories/settings-repository.js");
const {
  flushPendingSync,
  getPendingSyncCount,
} = require("../.test-dist/miniprogram/services/sync-service.js");

const record = (date, overrides = {}) => ({
  ...createEmptyRecord(date),
  flow: "medium",
  ...overrides,
});
let wxMock;
const originalWarn = console.warn;

test.beforeEach(() => {
  wxMock = createWxMock();
  global.wx = wxMock.wx;
  console.warn = () => {};
});

test.afterEach(() => {
  console.warn = originalWarn;
});

test("saveRecord keeps local data when cloud write fails", async () => {
  wxMock.failWrites(true);
  const result = await saveRecord(record("2026-08-28"));
  assert.equal(result.synced, false);
  assert.equal(getPendingSyncCount(), 1);
  assert.equal((await loadRecord("2026-08-28")).date, "2026-08-28");
});

test("coalesces repeated failed writes for the same date", async () => {
  wxMock.failWrites(true);
  await saveRecord(record("2026-08-28", { mood: "平静" }));
  await saveRecord(record("2026-08-28", { mood: "开心" }));
  assert.equal(getPendingSyncCount(), 1);
  assert.equal(localStore.getSyncQueue()[0].payload.mood, "开心");
});

test("a pending delete is not restored by remote pull", async () => {
  localStore.setCachedRecords([record("2026-08-28")]);
  wxMock.remoteRecords([record("2026-08-28")]);
  wxMock.failWrites(true);
  await deleteRecord("2026-08-28");
  assert.equal((await loadRecords()).length, 0);
});

test("loadSettings falls back to cached settings when cloud read fails", async () => {
  localStore.setCachedSettings({ cycleLength: 30, periodLength: 6, schemaVersion: 1 });
  wxMock.failReads(true);
  assert.deepEqual(await loadSettings(), {
    cycleLength: 30,
    periodLength: 6,
    schemaVersion: 1,
  });
});

test("loadRecords pulls every remote page and sorts by date", async () => {
  const remote = Array.from({ length: 25 }, (_, index) =>
    record(`2026-08-${String(25 - index).padStart(2, "0")}`),
  );
  wxMock.remoteRecords(remote);
  const loaded = await loadRecords();
  assert.equal(loaded.length, 25);
  assert.equal(loaded[0].date, "2026-08-01");
  assert.equal(loaded[24].date, "2026-08-25");
});

test("successful flush removes a pending operation", async () => {
  wxMock.failWrites(true);
  await saveRecord(record("2026-08-28"));
  wxMock.failWrites(false);
  const result = await flushPendingSync();
  assert.deepEqual(result, { synced: true, pendingCount: 0 });
  assert.equal(wxMock.cloudRecords().length, 1);
});

test("concurrent flushes apply one queued write only once", async () => {
  wxMock.failWrites(true);
  await saveRecord(record("2026-08-28"));
  wxMock.failWrites(false);

  await Promise.all([flushPendingSync(), flushPendingSync()]);

  assert.equal(wxMock.cloudRecords().length, 1);
  assert.equal(getPendingSyncCount(), 0);
});

test("failed flush keeps its operation for retry", async () => {
  wxMock.failWrites(true);
  await saveSettings({ cycleLength: 30, periodLength: 6, schemaVersion: 1 });
  const result = await flushPendingSync();
  assert.equal(result.synced, false);
  assert.equal(result.pendingCount, 1);
});

test("a pending local write wins over an empty cloud pull", async () => {
  wxMock.failWrites(true);
  await saveRecord(record("2026-08-28", { mood: "开心" }));
  wxMock.remoteRecords([]);
  const loaded = await loadRecords();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].mood, "开心");
});

test("saveSettings normalizes schema version and syncs", async () => {
  const result = await saveSettings({ cycleLength: 31, periodLength: 6 });
  assert.equal(result.synced, true);
  assert.equal(result.pendingCount, 0);
  assert.equal(localStore.getCachedSettings().schemaVersion, 1);
});
