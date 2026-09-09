"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(
  __dirname,
  "..",
  "integration",
  "cyberbiz-cart-production-loader-20260909-all-combined-v4-2.js"
), "utf8");

function implementation(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

class FakeControl {
  constructor(fragment, text) {
    this.fragment = fragment;
    this.textContent = text;
    this.tagName = "BUTTON";
    this.disabled = true;
    this.dataset = {};
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  closest(selector) {
    return selector.includes(this.fragment) ? this : null;
  }

  matches(selector) {
    return selector.includes(this.fragment);
  }
}

const mobileStart = new FakeControl("btn_to_cart_mobile", "加入購物車");
const mobileQuickBuy = new FakeControl("btn_quick_buy_mobile", "立即購買");
const desktopAdd = new FakeControl("button.addToCart[data-id", "加入購物車");
const listeners = new Map();
const styles = [];
let observerCallback = null;
let scrollOptions = null;

const document = {
  documentElement: {},
  head: {
    appendChild(style) {
      styles.push(style);
    }
  },
  createElement(tagName) {
    assert.equal(tagName, "style");
    return { id: "", textContent: "" };
  },
  getElementById() {
    return null;
  },
  querySelectorAll(selector) {
    if (selector.includes("btn_to_cart_mobile")) return [mobileStart];
    if (selector.includes("btn_quick_buy_mobile")) return [mobileQuickBuy, desktopAdd];
    return [];
  },
  querySelector(selector) {
    assert.equal(selector, ".eyefans-custom-wrap iframe");
    return {
      scrollIntoView(options) {
        scrollOptions = options;
      }
    };
  },
  addEventListener(type, listener, capture) {
    listeners.set(type, { listener, capture });
  }
};

class FakeMutationObserver {
  constructor(callback) {
    observerCallback = callback;
  }

  observe(target, options) {
    assert.equal(target, document.documentElement);
    assert.equal(options.childList, true);
    assert.equal(options.subtree, true);
  }
}

const context = { document, MutationObserver: FakeMutationObserver };
vm.createContext(context);
vm.runInContext([
  'const CUSTOMIZER_IFRAME_SELECTOR = ".eyefans-custom-wrap iframe";',
  implementation("lockNativeProductPurchase"),
  "this.lockNativeProductPurchase = lockNativeProductPurchase;"
].join("\n"), context);

context.lockNativeProductPurchase({
  handle: "cls-cus-mix-uv-sun-rd",
  config: { entryProductId: "71536673" }
});

assert.equal(mobileStart.dataset.eyefansNativePurchase, "customizer");
assert.equal(mobileStart.disabled, false);
assert.equal(mobileStart.textContent, "開始客製設計");
assert.equal(mobileStart.attributes.get("type"), "button");
assert.equal(mobileStart.attributes.get("aria-disabled"), "false");
assert.equal(mobileStart.attributes.get("aria-label"), "開始客製設計");

for (const control of [mobileQuickBuy, desktopAdd]) {
  assert.equal(control.dataset.eyefansNativePurchase, "blocked");
  assert.equal(control.disabled, true);
  assert.equal(control.attributes.get("aria-disabled"), "true");
  assert.equal(control.textContent, "請使用下方模擬器加入購物車");
}

assert.equal(styles.length, 1);
assert.match(styles[0].textContent, /product_button_mobile.*display:none!important/);
assert.match(styles[0].textContent, /native-purchase='customizer'.*flex:1 1 auto!important/);
assert.equal(listeners.get("click").capture, true);
assert.equal(listeners.get("submit").capture, true);

let prevented = false;
let stopped = false;
listeners.get("click").listener({
  target: mobileStart,
  preventDefault() { prevented = true; },
  stopImmediatePropagation() { stopped = true; }
});
assert.equal(prevented, true, "the native mobile add action must never run");
assert.equal(stopped, true, "CYBERBIZ quick-buy listeners must not receive the click");
assert.equal(scrollOptions.behavior, "smooth");
assert.equal(scrollOptions.block, "start");

scrollOptions = null;
listeners.get("click").listener({
  target: mobileQuickBuy,
  preventDefault() {},
  stopImmediatePropagation() {}
});
assert.equal(scrollOptions, null, "a blocked quick-buy control must not add or scroll");

mobileStart.textContent = "加入購物車";
mobileStart.disabled = true;
observerCallback();
assert.equal(mobileStart.textContent, "開始客製設計");
assert.equal(mobileStart.disabled, false, "dynamic mobile redraws must retain the safe CTA");

let submitPrevented = false;
listeners.get("submit").listener({
  target: { querySelector: selector => selector.includes("data-eyefans-native-purchase") ? mobileStart : null },
  preventDefault() { submitPrevented = true; },
  stopImmediatePropagation() {}
});
assert.equal(submitPrevented, true, "forms containing a native purchase control must not submit");

console.log("mobile customizer CTA v4.2 passed: one safe start-design action, native purchase blocked");
