const test = require("node:test");
const assert = require("node:assert/strict");

const { getCanvasPixelRatio } = require("../.test-dist/miniprogram/utils/device.js");

test("canvas pixel ratio prefers the current window API", () => {
  let fallbackCalls = 0;
  global.wx = {
    getWindowInfo() {
      return { pixelRatio: 3 };
    },
    getSystemInfoSync() {
      fallbackCalls += 1;
      return { pixelRatio: 2 };
    },
  };

  assert.equal(getCanvasPixelRatio(), 3);
  assert.equal(fallbackCalls, 0);
});

test("canvas pixel ratio supports older base libraries", () => {
  global.wx = {
    getSystemInfoSync() {
      return { pixelRatio: 2 };
    },
  };

  assert.equal(getCanvasPixelRatio(), 2);
});
