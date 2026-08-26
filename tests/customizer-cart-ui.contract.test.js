"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.join(__dirname, "..");
const htmlSource = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");

const cartPanelTag = htmlSource.match(
  /<section\b[^>]*\bid=["']cart-submit-panel["'][^>]*>/i
)?.[0];

assert.ok(cartPanelTag, "購物車送出區塊必須存在");
assert.match(cartPanelTag, /\bhidden\b/i, "購物車送出區塊初始必須隱藏");

const locationGateSource = appSource.match(
  /function cartSubmitEnabledFromLocation\(\) \{[\s\S]*?\n\}/
)?.[0];

assert.ok(locationGateSource, "必須保留購物車網址參數檢查");

function cartUiEnabled(search) {
  const context = {
    URLSearchParams,
    window: { location: { search } }
  };
  vm.createContext(context);
  vm.runInContext(`${locationGateSource}; result = cartSubmitEnabledFromLocation();`, context);
  return context.result;
}

assert.equal(cartUiEnabled("?cart=1"), true, "cart=1 應顯示購物車送出區塊");
assert.equal(cartUiEnabled(""), false, "沒有 cart 參數時不應顯示購物車送出區塊");
assert.equal(cartUiEnabled("?cart=0"), false, "cart=0 不應顯示購物車送出區塊");
assert.equal(cartUiEnabled("?cart=true"), false, "只有精確的 cart=1 才能顯示區塊");

const initializeCartSubmitSource = appSource.match(
  /function initializeCartSubmit\(\) \{[\s\S]*?\n\}/
)?.[0];

assert.ok(initializeCartSubmitSource, "必須保留購物車送出區塊初始化函式");
assert.match(
  initializeCartSubmitSource,
  /if \(!cartSubmitEnabledFromLocation\(\)\) return;[\s\S]*?panel\.hidden = false;/,
  "送出區塊只能通過 cart=1 檢查後解除隱藏"
);

const visibleTestCopy = [
  "TEST CART LINK",
  "測試串接模式",
  "正在將設計資料送至商品頁"
];

for (const copy of visibleTestCopy) {
  assert.equal(htmlSource.includes(copy), false, `HTML 不應再包含測試文案：${copy}`);
  assert.equal(appSource.includes(copy), false, `程式不應再包含測試文案：${copy}`);
}

assert.match(htmlSource, /CUSTOM ORDER/, "正式購物車區塊應顯示中性標示");
assert.match(
  appSource,
  /完成搭配後，可將本次設計加入購物車。/,
  "程式應包含正式待命文案"
);

console.log("Customizer cart UI contract passed.");
