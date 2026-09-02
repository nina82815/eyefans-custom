"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const helperSource = fs.readFileSync(
  path.join(__dirname, "..", "integration", "cyberbiz-customizer-frame-autoheight-20260902.js"),
  "utf8"
);
const guideSource = fs.readFileSync(
  path.join(__dirname, "..", "integration", "CYBERBIZ_CUSTOMIZER_FRAME_AUTOHEIGHT_20260902.md"),
  "utf8"
);

const helperSha256 = crypto.createHash("sha256").update(helperSource).digest("hex");
const helperSri = `sha384-${crypto.createHash("sha384").update(helperSource).digest("base64")}`;
assert.equal(helperSha256, "c57162812b8627a21bc1095cb5d70276e8d6751b8f6ce03ecba943d8e97d9234");
assert.equal(helperSri, "sha384-8FH+9sroyapgoZjAtRbYgxvcS8T9To1qOPPWKSarLwjXmbz91pLJJvDM6rloWr+Y");
assert.ok(guideSource.includes(helperSha256));
assert.ok(guideSource.includes(`integrity="${helperSri}"`));

function environment({
  pagePath = "/products/cls-cus-mix-uv-sun-rd",
  frameMode = "uv",
  frameOrigin = "https://nina82815.github.io"
} = {}) {
  const listeners = {};
  const requested = [];
  const styles = new Map();
  const dataset = {};
  const frameWindow = {
    postMessage(message, targetOrigin) {
      requested.push({ message: JSON.parse(JSON.stringify(message)), targetOrigin });
    }
  };
  const frameListeners = {};
  const frame = {
    src: `${frameOrigin}/eyefans-custom/?mode=${frameMode}&locked=1`,
    contentWindow: frameWindow,
    dataset,
    style: {
      setProperty(name, value, priority) {
        styles.set(name, { value, priority });
      }
    },
    addEventListener(name, listener) {
      frameListeners[name] = listener;
    }
  };
  const window = {
    location: new URL(`https://www.eyefans.com.tw${pagePath}`),
    addEventListener(name, listener) {
      listeners[name] = listener;
    },
    clearTimeout() {},
    setTimeout() { return 1; }
  };
  const document = {
    readyState: "complete",
    documentElement: {},
    querySelectorAll(selector) {
      assert.equal(selector, ".eyefans-custom-wrap iframe");
      return [frame];
    },
    addEventListener() {}
  };
  class FakeMutationObserver {
    observe() {}
    disconnect() {}
  }
  vm.runInNewContext(helperSource, {
    URL,
    Set,
    Number,
    Math,
    MutationObserver: FakeMutationObserver,
    window,
    document
  });
  return { dataset, frame, frameListeners, frameWindow, listeners, requested, styles };
}

const active = environment();
assert.deepEqual(active.requested, [{
  message: {
    type: "eyefans-customizer-resize-request",
    schemaVersion: 1
  },
  targetOrigin: "https://nina82815.github.io"
}]);
assert.equal(typeof active.listeners.message, "function");
assert.equal(typeof active.frameListeners.load, "function");

active.listeners.message({
  origin: "https://nina82815.github.io",
  source: active.frameWindow,
  data: {
    type: "eyefans-customizer-resize",
    schemaVersion: 1,
    height: 1840.2
  }
});
assert.deepEqual(active.styles.get("height"), { value: "1843px", priority: "important" });
assert.deepEqual(active.styles.get("max-height"), { value: "none", priority: "important" });
assert.equal(active.dataset.eyefansAutoHeight, "true");

const appliedHeight = active.styles.get("height");
for (const invalidEvent of [
  {
    origin: "https://evil.example",
    source: active.frameWindow,
    data: { type: "eyefans-customizer-resize", schemaVersion: 1, height: 2000 }
  },
  {
    origin: "https://nina82815.github.io",
    source: {},
    data: { type: "eyefans-customizer-resize", schemaVersion: 1, height: 2000 }
  },
  {
    origin: "https://nina82815.github.io",
    source: active.frameWindow,
    data: { type: "wrong-type", schemaVersion: 1, height: 2000 }
  },
  {
    origin: "https://nina82815.github.io",
    source: active.frameWindow,
    data: { type: "eyefans-customizer-resize", schemaVersion: 2, height: 2000 }
  },
  {
    origin: "https://nina82815.github.io",
    source: active.frameWindow,
    data: { type: "eyefans-customizer-resize", schemaVersion: 1, height: Number.NaN }
  },
  {
    origin: "https://nina82815.github.io",
    source: active.frameWindow,
    data: { type: "eyefans-customizer-resize", schemaVersion: 1, height: 12000 }
  }
]) {
  active.listeners.message(invalidEvent);
  assert.deepEqual(active.styles.get("height"), appliedHeight);
}

active.frameListeners.load();
assert.equal(active.requested.length, 2, "an iframe reload must request a fresh height");

const ordinaryProduct = environment({ pagePath: "/products/ordinary-product" });
assert.deepEqual(ordinaryProduct.requested, []);
assert.equal(ordinaryProduct.listeners.message, undefined);
assert.equal(ordinaryProduct.styles.size, 0);

for (const untrustedFrame of [
  environment({ pagePath: "/products/cls-cus-mix-sun-rd", frameMode: "uv" }),
  environment({ frameOrigin: "https://evil.example" })
]) {
  assert.deepEqual(untrustedFrame.requested, []);
  assert.equal(typeof untrustedFrame.listeners.message, "function");
  assert.equal(untrustedFrame.styles.size, 0);
}

for (const [pagePath, mode] of [
  ["/products/cls-cus-mix-sun-rd", "color"],
  ["/products/cls-cus-mix-laser-sun-rd", "engraving"],
  ["/products/cls-cus-mix-uv-sun-rd", "uv"]
]) {
  assert.equal(environment({ pagePath, frameMode: mode }).requested.length, 1, `${mode} must be enabled`);
}

console.log("CYBERBIZ customizer frame auto-height contract passed");
