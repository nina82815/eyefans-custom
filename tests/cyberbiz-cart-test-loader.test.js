const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loaderPath = path.join(__dirname, "..", "integration", "cyberbiz-cart-test-loader.js");
const source = fs.readFileSync(loaderPath, "utf8");

assert.doesNotMatch(source, /\bfetch\b/, "test-only loader must not contain fetch");
assert.equal(source.includes("/cart/add"), false, "test-only loader must not contain a cart endpoint");
assert.equal(source.includes("cyberbiz-cart-bridge.js"), false, "test-only loader must not import the production bridge");

function createEnvironment(href) {
  const replies = [];
  const frameWindow = {
    postMessage(message, targetOrigin) {
      replies.push({ message, targetOrigin });
    }
  };
  const frame = {
    src: "https://nina82815.github.io/eyefans-custom/?mode=uv&locked=1",
    contentWindow: frameWindow
  };
  const listeners = {};
  const window = {
    location: { href },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {}
  };
  const document = {
    readyState: "complete",
    querySelectorAll(selector) {
      assert.equal(selector, ".eyefans-custom-wrap iframe");
      return [frame];
    }
  };
  const context = vm.createContext({
    URL,
    window,
    document,
    MutationObserver: class {},
    console
  });

  vm.runInContext(source, context, { filename: loaderPath });
  return { context, frame, frameWindow, listeners, replies };
}

const normal = createEnvironment("https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd");
assert.equal(normal.listeners.message, undefined, "normal URL must not register a message listener");
assert.equal(new URL(normal.frame.src).searchParams.has("cart"), false, "normal URL must not alter the iframe");

const gated = createEnvironment(
  "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_test=1"
);
assert.equal(typeof gated.listeners.message, "function", "gated URL must register the listener first");
assert.equal(new URL(gated.frame.src).searchParams.get("cart"), "1", "gated URL must expose the CTA");

const requestData = vm.runInContext(`({
  type: "eyefans-customizer-submit",
  schemaVersion: 1,
  requestId: "request-123",
  selection: {
    customizationMode: "uv",
    customizationModeLocked: true,
    size: "M",
    frame: "櫻花粉",
    temple: "櫻花粉",
    lens: "三號灰片",
    summary: "測試搭配"
  }
})`, gated.context);

gated.listeners.message({
  origin: "https://nina82815.github.io",
  source: gated.frameWindow,
  data: requestData
});

assert.equal(gated.replies.length, 1);
assert.equal(gated.replies[0].targetOrigin, "https://nina82815.github.io");
assert.equal(gated.replies[0].message.ok, true);
assert.match(gated.replies[0].message.message, /沒有實際加入購物車/);

console.log("cart test loader tests passed: isolated gate + simulated response");
