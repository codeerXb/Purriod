const test = require("node:test");
const assert = require("node:assert/strict");

const { createWxMock } = require("./helpers/wx-mock.cjs");
const { createEmptyRecord } = require("../.test-dist/miniprogram/constants/options.js");
const localStore = require("../.test-dist/miniprogram/repositories/local-store.js");
const {
  deleteAllUserData,
} = require("../.test-dist/miniprogram/services/user-data-service.js");

let wxMock;

test.beforeEach(() => {
  wxMock = createWxMock();
  global.wx = wxMock.wx;
  localStore.setCachedRecords([
    { ...createEmptyRecord("2026-08-28"), flow: "medium" },
  ]);
  localStore.setCachedSettings({
    cycleLength: 28,
    periodLength: 5,
    schemaVersion: 1,
  });
});

test("keeps local health data when cloud deletion rejects", async () => {
  wxMock.callFunctionRejects(new Error("offline"));
  await assert.rejects(deleteAllUserData(), /offline/);
  assert.equal(localStore.getCachedRecords().length, 1);
  assert.equal(localStore.getCachedSettings().cycleLength, 28);
});

test("keeps local health data when cloud deletion is incomplete", async () => {
  wxMock.callFunctionResolves({ success: false });
  await assert.rejects(deleteAllUserData(), /云端数据删除未完成/);
  assert.equal(localStore.getCachedRecords().length, 1);
});

test("clears local data only after cloud deletion succeeds", async () => {
  wxMock.callFunctionResolves({ success: true });
  await deleteAllUserData();
  assert.equal(localStore.getCachedRecords().length, 0);
  assert.equal(localStore.getCachedSettings(), null);
  assert.deepEqual(localStore.getSyncQueue(), []);
});
