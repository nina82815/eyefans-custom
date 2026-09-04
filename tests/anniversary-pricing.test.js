"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const styleSource = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");

function declaration(name) {
  const match = appSource.match(new RegExp(`(?:const|let) ${name} = [\\s\\S]*?;\\n`));
  assert.ok(match, `${name} must remain declared`);
  return match[0];
}

function implementation(name) {
  const match = appSource.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `${name} must remain implemented`);
  return match[0];
}

const context = {};
vm.createContext(context);
vm.runInContext([
  declaration("GRAY_LENS_VISUAL"),
  declaration("LENS_COLORS"),
  declaration("CUSTOMIZATION_PRICES"),
  declaration("ANNIVERSARY_PROMOTION"),
  implementation("anniversaryPromotionActive"),
  implementation("lensPricing"),
  implementation("formatNtd"),
  implementation("lensPriceMarkup"),
  implementation("lensPriceAriaLabel"),
  implementation("nextLensPriceRefreshAt"),
  implementation("lensDisplayLabel"),
  "this.api = { LENS_COLORS, CUSTOMIZATION_PRICES, ANNIVERSARY_PROMOTION, anniversaryPromotionActive, lensPricing, formatNtd, lensPriceMarkup, lensPriceAriaLabel, nextLensPriceRefreshAt, lensDisplayLabel };"
].join("\n"), context);

const api = context.api;
const start = api.ANNIVERSARY_PROMOTION.startsAt;
const end = api.ANNIVERSARY_PROMOTION.endsAt;

assert.equal(start, Date.parse("2026-09-14T00:00:00+08:00"));
assert.equal(end, Date.parse("2026-09-21T00:00:00+08:00"));
assert.equal(api.anniversaryPromotionActive(start - 1), false, "promotion must not start early");
assert.equal(api.anniversaryPromotionActive(start), true, "promotion starts at midnight in Taipei");
assert.equal(api.anniversaryPromotionActive(end - 1), true, "all of September 20 stays discounted");
assert.equal(api.anniversaryPromotionActive(end), false, "promotion ends at midnight after September 20");
assert.equal(api.anniversaryPromotionActive(Number.NaN), false, "invalid clocks fail closed to regular pricing");
assert.equal(api.nextLensPriceRefreshAt(start - 1), start, "pre-sale pages schedule the start boundary");
assert.equal(api.nextLensPriceRefreshAt(start), end, "sale pages schedule the end boundary");
assert.equal(api.nextLensPriceRefreshAt(end), null, "finished promotions do not leave a timer running");

const expected = {
  color: {
    gray: [890, 750],
    "blue-tea": [890, 750],
    polarized: [1190, 1050]
  },
  engraving: {
    gray: [990, 850],
    "blue-tea": [990, 850],
    polarized: [1290, 1150]
  },
  uv: {
    gray: [1090, 950],
    "blue-tea": [1090, 950],
    polarized: [1390, 1250]
  }
};

for (const [mode, lensPrices] of Object.entries(expected)) {
  for (const lens of api.LENS_COLORS) {
    const [regular, anniversary] = lensPrices[lens.id];
    assert.deepEqual(
      JSON.parse(JSON.stringify(api.lensPricing(mode, lens, start - 1))),
      { regular, anniversary, isPromotionActive: false },
      `${mode}/${lens.id} regular price`
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(api.lensPricing(mode, lens, start))),
      { regular, anniversary, isPromotionActive: true },
      `${mode}/${lens.id} anniversary price`
    );
  }
}

const gray = api.LENS_COLORS.find(lens => lens.id === "gray");
const regularPricing = api.lensPricing("color", gray, start - 1);
const salePricing = api.lensPricing("color", gray, start);
assert.equal(api.formatNtd(1190), "NT$1,190");
assert.equal(
  api.lensPriceMarkup(regularPricing),
  '<small class="lens-price"><strong>NT$890</strong></small>'
);
assert.match(api.lensPriceMarkup(salePricing), /周年慶價/);
assert.match(api.lensPriceMarkup(salePricing), /NT\$750/);
assert.match(api.lensPriceMarkup(salePricing), /<s>原價 NT\$890<\/s>/);
assert.equal(api.lensPriceAriaLabel(gray, regularPricing), "三號灰片，整副售價 NT$890");
assert.equal(api.lensPriceAriaLabel(gray, salePricing), "三號灰片，周年慶價 NT$750，原價 NT$890");

const polarized = api.LENS_COLORS.find(lens => lens.id === "polarized");
assert.equal(api.lensDisplayLabel(polarized), "偏光鏡片");
assert.doesNotMatch(api.lensDisplayLabel(polarized), /NT\$|周年慶|原價|售價/);

assert.match(htmlSource, /id="lens-price-note"/);
assert.match(htmlSource, /styles\.css\?v=20260903a/);
assert.match(htmlSource, /app\.js\?v=20260904a/);
assert.match(styleSource, /\.lens-price--promotion s/);

let controlledNow = start - 1;
class ControlledDate extends Date {
  static now() { return controlledNow; }
}

const timers = new Map();
let timerId = 0;
const copy = { innerHTML: "" };
const button = {
  dataset: { lensId: "gray" },
  disabled: true,
  focused: true,
  attributes: new Map(),
  setAttribute(name, value) { this.attributes.set(name, String(value)); },
  querySelector(selector) {
    assert.equal(selector, ".lens-option-copy");
    return copy;
  }
};
const mount = {
  buttons: [button],
  querySelectorAll(selector) {
    assert.equal(selector, ".lens-option");
    return this.buttons;
  }
};
const note = { textContent: "" };
const runtimeState = { customizationMode: "color" };
const runtimeContext = {
  Date: ControlledDate,
  state: runtimeState,
  document: {
    getElementById(id) {
      if (id === "lens-options") return mount;
      if (id === "lens-price-note") return note;
      throw new Error(`unexpected element: ${id}`);
    }
  },
  window: {
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  }
};
vm.createContext(runtimeContext);
vm.runInContext([
  declaration("GRAY_LENS_VISUAL"),
  declaration("LENS_COLORS"),
  declaration("CUSTOMIZATION_PRICES"),
  declaration("ANNIVERSARY_PROMOTION"),
  declaration("lensPriceRefreshTimer"),
  implementation("anniversaryPromotionActive"),
  implementation("lensPricing"),
  implementation("formatNtd"),
  implementation("lensPriceMarkup"),
  implementation("lensPriceAriaLabel"),
  implementation("updateLensOptionPrice"),
  implementation("updateLensPriceNote"),
  implementation("nextLensPriceRefreshAt"),
  implementation("scheduleLensPriceRefresh"),
  implementation("refreshLensPricing"),
  "this.runtime = { refreshLensPricing };"
].join("\n"), runtimeContext);

function runOnlyTimer() {
  assert.equal(timers.size, 1, "exactly one pricing boundary timer stays active");
  const [id, timer] = timers.entries().next().value;
  timers.delete(id);
  timer.callback();
}

runtimeContext.runtime.refreshLensPricing();
assert.equal(mount.buttons[0], button, "refresh preserves the existing interactive button node");
assert.equal(button.disabled, true, "refresh preserves a cart-locked disabled state");
assert.equal(button.focused, true, "refresh preserves focus on the existing button node");
assert.match(copy.innerHTML, /NT\$890/);
assert.doesNotMatch(copy.innerHTML, /周年慶價/);
assert.match(note.textContent, /結帳金額以購物車為準/);

runtimeState.customizationMode = "engraving";
runtimeContext.runtime.refreshLensPricing();
assert.match(copy.innerHTML, /NT\$990/, "changing mode refreshes the full base price");
runtimeState.customizationMode = "color";
runtimeContext.runtime.refreshLensPricing();

controlledNow = start;
runOnlyTimer();
assert.match(copy.innerHTML, /周年慶價/);
assert.match(copy.innerHTML, /NT\$750/);
assert.match(copy.innerHTML, /原價 NT\$890/);
assert.equal(button.disabled, true, "start-boundary refresh preserves disabled state");

controlledNow = end;
runOnlyTimer();
assert.doesNotMatch(copy.innerHTML, /周年慶價/);
assert.match(copy.innerHTML, /NT\$890/);
assert.equal(button.disabled, true, "end-boundary refresh preserves disabled state");
assert.equal(timers.size, 0, "no timer remains after the promotion ends");

console.log("Anniversary pricing passed: Taipei boundaries, all 9 prices, UI-only labels and responsive markup.");
