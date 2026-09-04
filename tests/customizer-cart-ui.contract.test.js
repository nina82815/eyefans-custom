"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.join(__dirname, "..");
const htmlSource = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");

const STOREFRONT = "https://www.eyefans.com.tw";
const CUSTOMIZER = "https://nina82815.github.io";
const PRODUCT_PATHS = {
  color: "/products/cls-cus-mix-sun-rd",
  engraving: "/products/cls-cus-mix-laser-sun-rd",
  uv: "/products/cls-cus-mix-uv-sun-rd"
};

function elementTag(id) {
  const match = htmlSource.match(new RegExp(`<[^>]+\\bid=["']${id}["'][^>]*>`, "i"));
  assert.ok(match, `${id} must exist in the HTML fallback`);
  return match[0];
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)=["']([^"']*)["']/g)]
    .map(([, name, value]) => [name, value]));
}

function declaration(name) {
  const match = appSource.match(new RegExp(`(?:const|let) ${name} = [\\s\\S]*?;\\n`));
  assert.ok(match, `${name} must remain available to the cart UI`);
  return match[0];
}

function implementation(name) {
  const match = appSource.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `${name} must remain available to the cart UI`);
  return match[0];
}

class FakeElement {
  constructor(id) {
    const tag = elementTag(id);
    this.attributes = new Map(Object.entries(attributes(tag)));
    this.hidden = /\bhidden(?:\s|>)/.test(tag);
    this.disabled = /\bdisabled(?:\s|>)/.test(tag);
    this.dataset = this.attributes.has("data-state") ? { state: this.attributes.get("data-state") } : {};
    this.textContent = "";
    this.listeners = {};
    this.focused = false;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  focus() { this.focused = true; }
  get href() { return this.getAttribute("href"); }
  set href(value) { this.setAttribute("href", value); }
}

const constantNames = [
  ...new Set([...appSource.matchAll(/const ((?:CART_|STOREFRONT_)[A-Z_]+) =/g)].map(match => match[1])),
  "MESSAGE_SCHEMA_VERSION", "CUSTOMIZATION_MODES", "TEXT_COLOR_OPTIONS", "MODE_NAMES"
];
const variableNames = [
  "pendingCartRequestId", "pendingCartSelectionFingerprint", "lastAddedSelectionFingerprint",
  "cartResultTimer", "cartLockedControlStates"
];
const functionNames = [
  "cartSubmitEnabledFromLocation", "cartPanelVisibleFromLocation", "cartSubmissionAvailable",
  "parentMessageOrigin", "effectivePrintMode", "lensDisplayLabel",
  "buildSelectionPayload", "announceAndNotifyParent",
  "createCartRequestId", "cartSelectionFingerprint", "setCustomizerControlsLocked",
  "setCartSubmitState", "syncCartSubmitAvailability", "clearCartResultTimer",
  "submitCustomizerSelection", "handleCartResult", "initializeCartSubmit"
];
const runtimeSource = [
  ...constantNames.map(declaration), ...variableNames.map(declaration), ...functionNames.map(implementation)
].join("\n");

function environment(options = {}) {
  const origin = options.origin ?? CUSTOMIZER;
  const search = options.search ?? "?mode=uv&locked=1&cart=1";
  const embedded = options.embedded ?? true;
  const referrer = options.referrer ?? `${STOREFRONT}${PRODUCT_PATHS.uv}`;
  const elements = Object.fromEntries([
    "cart-submit-panel", "cart-submit-button", "cart-submit-status", "cart-storefront-link",
    "cart-view-link", "name-input", "live-status"
  ].map(id => [id, new FakeElement(id)]));
  const controls = [{ disabled: false }, { disabled: true }, { disabled: false }];
  const posted = [];
  const timers = new Map();
  const listeners = {};
  let timerSequence = 0;
  let requestSequence = 0;
  const parent = { postMessage(message, targetOrigin) {
    // Match the browser's structured-clone snapshot at send time.
    posted.push({ message: JSON.parse(JSON.stringify(message)), targetOrigin });
  } };
  const window = {
    location: { origin, search, href: `${origin}/eyefans-custom/${search}`, protocol: `${origin.split(":")[0]}:` },
    crypto: { randomUUID: () => `request-ui-${++requestSequence}` },
    addEventListener(name, listener) { listeners[name] = listener; },
    setTimeout(callback, delay) { const id = ++timerSequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    postMessage: parent.postMessage
  };
  window.parent = embedded ? parent : window;
  const state = {
    customizationMode: "uv", customizationModeLocked: true,
    size: "M", view: "a45", renderMode: "photo",
    frame: { name: "霧面白" }, temple: { name: "琥珀" }, lens: { id: "blue-tea", name: "抗藍光鏡片" },
    printMode: "both", icon1: "01", icon2: "04", name: "eyefans",
    textColor: "white", font: "baksoSapi", caseMode: "preserve", order: "normal", namePosition: "center",
    ...options.state
  };
  const context = {
    URL, URLSearchParams, window, state,
    document: {
      referrer,
      getElementById(id) { assert.ok(elements[id], `unexpected DOM dependency: ${id}`); return elements[id]; },
      querySelectorAll(selector) { assert.match(selector, /controls-panel/); return controls; }
    }
  };
  vm.createContext(context);
  vm.runInContext(runtimeSource, context);
  context.initializeCartSubmit();
  return {
    context, elements, controls, posted, timers, listeners, state, window,
    panel: elements["cart-submit-panel"], button: elements["cart-submit-button"],
    status: elements["cart-submit-status"], storeLink: elements["cart-storefront-link"],
    viewLink: elements["cart-view-link"],
    submissions: () => posted.filter(({ message }) => message.type === "eyefans-customizer-submit"),
    submit() { context.submitCustomizerSelection(); },
    result(fields = {}, eventFields = {}) {
      const lastSubmit = posted.filter(({ message }) => message.type === "eyefans-customizer-submit").at(-1);
      context.handleCartResult({
        source: window.parent, origin: context.parentMessageOrigin(),
        data: {
          type: "eyefans-customizer-cart-result", schemaVersion: 1,
          requestId: lastSubmit?.message.requestId ?? null, ok: true, ...fields
        },
        ...eventFields
      });
    },
    expire() {
      assert.equal(timers.size, 1, "there must be one bounded pending result timeout");
      const [id, timer] = timers.entries().next().value;
      assert.equal(timer.delay, 18000);
      timers.delete(id);
      timer.callback();
    }
  };
}

// Showing a CTA is not permission to create a real cart item.
assert.doesNotMatch(elementTag("cart-submit-panel"), /\bhidden(?:\s|>)/,
  "standalone HTML must expose the order section before initialization");
assert.match(elementTag("cart-submit-button"), /\bdisabled(?:\s|>)/,
  "HTML fallback must not imply a live shopping-cart connection");
assert.match(elementTag("cart-view-link"), /\bhidden(?:\s|>)/);
assert.equal(attributes(elementTag("cart-view-link")).href, `${STOREFRONT}/cart`,
  "success navigation must use the static trusted cart URL");

for (const search of ["", "?mode=uv", "?cart=0", "?cart=true", "?cart=01", "?cart=1x", "?cart=1", "?cart=1&cart=0"]) {
  const ui = environment({ search });
  assert.equal(ui.context.cartSubmitEnabledFromLocation(), ["?cart=1", "?cart=1&cart=0"].includes(search),
    `only the first exact cart=1 value enables submit permission: ${search}`);
  assert.equal(ui.context.cartPanelVisibleFromLocation(), search !== "?cart=0",
    `cart=0 explicitly hides the order section: ${search}`);
}

const unavailableCases = [
  { label: "standalone website", embedded: false, search: "?mode=uv" },
  { label: "standalone cart=1 cannot manufacture a connection", embedded: false },
  { label: "unconnected store embed", search: "?mode=uv&locked=1" },
  { label: "explicit opt-out", search: "?mode=uv&locked=1&cart=0" },
  { label: "non-exact cart permission", search: "?mode=uv&locked=1&cart=true" },
  { label: "unlocked product mode", state: { customizationModeLocked: false } },
  { label: "missing referrer", referrer: "" },
  { label: "invalid referrer", referrer: "not a URL" },
  { label: "foreign parent", referrer: "https://evil.example/products/cls-cus-mix-uv-sun-rd" },
  { label: "similar host is not store", referrer: "https://www.eyefans.com.tw.evil.example/" },
  { label: "unexpected store port", referrer: "https://www.eyefans.com.tw:8443/" },
  { label: "insecure store", referrer: "http://www.eyefans.com.tw/" },
  { label: "opaque file origin", origin: "null", referrer: "file:///tmp/cart-host.html" }
];
for (const { label, ...options } of unavailableCases) {
  const ui = environment(options);
  assert.equal(ui.context.cartSubmissionAvailable(), false, label);
  assert.equal(ui.button.disabled, true, label);
  assert.equal(ui.panel.hidden, options.search?.includes("cart=0") || false, label);
  ui.submit();
  ui.result();
  assert.equal(ui.submissions().length, 0, `${label}: direct calls cannot bypass permission`);
  assert.equal(ui.timers.size, 0, `${label}: unavailable CTA cannot start a pretend request`);
  assert.notEqual(ui.panel.dataset.state, "success", `${label}: unsolicited replies cannot report success`);
  assert.equal(ui.viewLink.hidden, true, label);
  assert.ok(ui.controls.some(control => !control.disabled), `${label}: preview controls stay usable`);
}

for (const mode of Object.keys(PRODUCT_PATHS)) {
  const ui = environment({ embedded: false, search: `?mode=${mode}`, state: { customizationMode: mode } });
  assert.equal(ui.storeLink.href, `${STOREFRONT}${PRODUCT_PATHS[mode]}`, `${mode} must link to its official product`);
  assert.equal(ui.storeLink.hidden, false);
  assert.ok(ui.status.textContent.trim(), "unavailable CTA must explain why it cannot submit");
  assert.equal(ui.panel.dataset.state, "unavailable");
}

for (const options of [
  {},
  { origin: "http://127.0.0.1:4173", referrer: "http://127.0.0.1:4173/tests/cart-host.html" },
  { origin: "https://local.example", referrer: "https://local.example/tests/cart-host.html" }
]) {
  const ui = environment(options);
  assert.equal(ui.context.cartSubmissionAvailable(), true, "trusted locked iframe with exact cart=1 is eligible");
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.panel.dataset.state, "idle");
  assert.equal(typeof ui.button.listeners.click, "function");
  assert.equal(typeof ui.listeners.message, "function");
  assert.equal(ui.storeLink.hidden, true, "connected iframe must not ask the customer to restart at the store");
  ui.submit();
  const expectedParentOrigin = options.origin || STOREFRONT;
  assert.equal(ui.submissions()[0].targetOrigin, expectedParentOrigin);
  ui.result({}, { origin: expectedParentOrigin === STOREFRONT ? CUSTOMIZER : STOREFRONT });
  assert.equal(ui.panel.dataset.state, "loading", "test and production reply origins cannot be interchanged");
  ui.result();
  assert.equal(ui.panel.dataset.state, "success", "only the matching trusted host may complete this request");
}

const live = environment();
live.result({ requestId: null });
assert.equal(live.panel.dataset.state, "idle", "null requestId cannot match an absent pending request");
live.submit();
assert.equal(live.submissions().length, 1);
assert.equal(live.panel.dataset.state, "loading");
assert.equal(live.button.disabled, true);
assert.equal(live.button.getAttribute("aria-busy"), "true");
assert.ok(live.controls.every(control => control.disabled), "pending request freezes the manufacturing selection");
const request = live.submissions()[0];
assert.equal(request.targetOrigin, STOREFRONT, "never send production selection to wildcard origin");
assert.deepEqual(Object.keys(request.message).sort(), ["requestId", "schemaVersion", "selection", "type"]);
assert.equal(request.message.schemaVersion, 1);
assert.deepEqual(request.message.selection, {
  customizationMode: "uv", customizationModeLabel: "框腳配色＋UV 彩印", customizationModeLocked: true,
  size: "M", view: "a45", renderMode: "photo", frame: "霧面白", temple: "琥珀",
  lens: "抗藍光鏡片", lensId: "blue-tea", printMode: "both", uvPrintMode: "both",
  icon1: "01", icon2: "04", name: "eyefans", textColor: "white", font: "baksoSapi",
  caseMode: "preserve", order: "normal", namePosition: "center", customizationSide: "right",
  customizationSideLabel: "右外側鏡腳",
  summary: "實拍效果、框腳配色＋UV 彩印、尺寸 M、鏡框 霧面白、鏡腳 琥珀、鏡片 抗藍光鏡片、2 圖＋名字／圖案 01+04／eyefans／文字白色、客製位置 右外側鏡腳"
}, "all manufacturing details must survive the UI submission");

for (const mode of Object.keys(PRODUCT_PATHS)) {
  const polarized = environment({
    search: `?mode=${mode}&locked=1&cart=1`,
    referrer: `${STOREFRONT}${PRODUCT_PATHS[mode]}`,
    state: {
      customizationMode: mode,
      lens: { id: "polarized", name: "偏光鏡片", priceDelta: 300 }
    }
  });
  polarized.submit();
  assert.equal(polarized.submissions()[0].message.selection.lens, "偏光鏡片", mode);
  assert.equal(polarized.submissions()[0].message.selection.lensId, "polarized", mode);
  assert.match(
    polarized.submissions()[0].message.selection.summary,
    /鏡片 偏光鏡片、/,
    `${mode}: polarized summary must retain the canonical lens name`
  );
  assert.doesNotMatch(
    polarized.submissions()[0].message.selection.summary,
    /NT\$|周年慶|原價|售價/,
    `${mode}: display-only pricing must not enter the manufacturing summary`
  );
  if (mode === "engraving") {
    assert.match(polarized.submissions()[0].message.selection.summary, /英文雷雕／eyefans/);
    assert.doesNotMatch(polarized.submissions()[0].message.selection.summary, /白色英文|固定白色/);
  }
}
live.submit();
assert.equal(live.submissions().length, 1, "double click cannot create a duplicate request");
live.context.announceAndNotifyParent();
assert.equal(live.panel.dataset.state, "loading", "announcements cannot unlock an in-flight request");

for (const [message, event] of [
  [{}, { source: {} }], [{}, { origin: "https://evil.example" }],
  [{}, { origin: "https://www.eyefans.com.tw.evil.example" }],
  [{ type: "eyefans-customizer-change" }], [{ schemaVersion: 2 }],
  [{ requestId: "another-request" }], [{ requestId: null }], [{ ok: "true" }], [{}, { data: null }]
]) {
  live.result(message, event);
  assert.equal(live.panel.dataset.state, "loading", "untrusted/malformed reply must be ignored");
  assert.equal(live.timers.size, 1);
}
live.result({ message: "已加入購物車，設計編號 EF-TEST。", cartUrl: "https://evil.example/cart" });
assert.equal(live.panel.dataset.state, "success");
assert.equal(live.button.disabled, true);
assert.equal(live.button.getAttribute("aria-busy"), "false");
assert.equal(live.timers.size, 0);
assert.deepEqual(live.controls.map(control => control.disabled), [false, true, false],
  "completion restores each control's original disabled state");
assert.equal(live.viewLink.hidden, false);
assert.equal(live.viewLink.href, `${STOREFRONT}/cart`, "reply-provided redirect must be ignored");
live.result({ ok: false, message: "duplicate reply" });
assert.equal(live.panel.dataset.state, "success", "duplicate reply cannot overwrite completion");
live.submit();
assert.equal(live.submissions().length, 1, "direct calls cannot resubmit the same successful design");
live.state.view = "front";
live.state.renderMode = "model";
live.context.announceAndNotifyParent();
assert.equal(live.panel.dataset.state, "success", "view-only changes are not a new manufacturing design");
live.state.temple = { name: "奶茶" };
live.context.announceAndNotifyParent();
assert.equal(live.panel.dataset.state, "idle", "changing design permits the next cart addition");
assert.equal(live.button.disabled, false);
assert.equal(live.viewLink.hidden, true);
live.submit();
assert.equal(live.submissions().length, 2);
assert.equal(live.submissions()[0].message.selection.temple, "琥珀", "sent payload keeps its original design");
assert.equal(live.submissions()[1].message.selection.temple, "奶茶");

const failed = environment();
failed.submit();
failed.result({ ok: false, message: "庫存不足，請重新選擇尺寸。" });
assert.equal(failed.panel.dataset.state, "error");
assert.equal(failed.status.textContent, "庫存不足，請重新選擇尺寸。");
assert.equal(failed.button.disabled, false);
assert.equal(failed.timers.size, 0);
assert.deepEqual(failed.controls.map(control => control.disabled), [false, true, false]);
failed.submit();
assert.equal(failed.submissions().length, 2, "explicit failure permits retry");
assert.notEqual(failed.submissions()[0].message.requestId, failed.submissions()[1].message.requestId);

const timedOut = environment();
timedOut.submit();
timedOut.expire();
assert.equal(timedOut.panel.dataset.state, "error");
assert.match(timedOut.status.textContent, /確認|查看購物車/, "timeout warns to verify the real cart before retrying");
assert.equal(timedOut.button.disabled, false);
assert.equal(timedOut.viewLink.hidden, true, "timeout is not proof of a successful cart addition");
assert.deepEqual(timedOut.controls.map(control => control.disabled), [false, true, false]);
timedOut.result();
assert.equal(timedOut.panel.dataset.state, "error", "late reply after timeout is not an active request");

for (const mode of ["uv", "engraving"]) {
  const ui = environment({ state: { customizationMode: mode, name: "   " } });
  ui.submit();
  assert.equal(ui.submissions().length, 0, `${mode} cannot submit empty required text`);
  assert.equal(ui.panel.dataset.state, "error");
  assert.equal(ui.elements["name-input"].focused, true);
  assert.equal(ui.timers.size, 0);
}
for (const state of [
  { customizationMode: "color", name: "" },
  { customizationMode: "uv", printMode: "icon", name: "" },
  { customizationMode: "uv", printMode: "none", name: "" }
]) {
  const ui = environment({ state });
  ui.submit();
  assert.equal(ui.submissions().length, 1, "no-name designs must not require unused name text");
  const selection = ui.submissions()[0].message.selection;
  assert.equal(selection.name, "");
  assert.equal(selection.font, null);
  if (state.customizationMode === "color" || state.printMode === "none") {
    assert.equal(selection.icon1, null);
    assert.equal(selection.icon2, null);
    assert.equal(selection.customizationSide, null);
  }
}

const permissionLost = environment();
permissionLost.submit();
permissionLost.window.location.search = "?mode=uv&locked=1&cart=0";
permissionLost.result();
assert.notEqual(permissionLost.panel.dataset.state, "success", "permission removal rejects even a matching reply");
permissionLost.expire();
assert.equal(permissionLost.button.disabled, true, "timeout cannot re-enable submission after permission is removed");
assert.deepEqual(permissionLost.controls.map(control => control.disabled), [false, true, false],
  "permission-loss timeout must still restore preview controls");
permissionLost.submit();
assert.equal(permissionLost.submissions().length, 1, "expired request cannot be resubmitted without permission");
assert.equal(permissionLost.timers.size, 0);

for (const copy of ["TEST CART LINK", "測試串接模式", "正在將設計資料送至商品頁"]) {
  assert.equal(htmlSource.includes(copy), false, `HTML must not display test copy: ${copy}`);
  assert.equal(appSource.includes(copy), false, `app must not display test copy: ${copy}`);
}
assert.match(htmlSource, /CUSTOM ORDER/);
assert.match(appSource, /完成搭配後，可將本次設計加入購物車。/);

console.log("Customizer cart UI contract passed: visible preview CTA, trusted submission, payload locking, replies and retries.");
