"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "..", "app.js"), "utf8");
function implementation(name) {
  return source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
}
(async () => {
  let timer, cleared = 0, aborted = false;
  class Controller { constructor() { this.signal = {}; } abort() { aborted = true; } }
  const sandbox = {
    AbortController: Controller, MODEL_LOAD_TIMEOUT_MS: 12000,
    fetch: () => new Promise(() => {}),
    window: { setTimeout(fn) { timer = fn; return 1; }, clearTimeout() { cleared++; } }
  };
  vm.createContext(sandbox);
  vm.runInContext(implementation("fetchModelSource"), sandbox);
  let pending = sandbox.fetchModelSource("front.svg");
  timer();
  await assert.rejects(pending, /載入逾時/);
  assert.ok(aborted); assert.equal(cleared, 1);
  sandbox.fetch = async () => ({ok:true, text:() => new Promise(() => {})});
  pending = sandbox.fetchModelSource("side.svg");
  await Promise.resolve(); timer();
  await assert.rejects(pending, /載入逾時/);
  sandbox.fetch = async () => ({ok:false});
  await assert.rejects(sandbox.fetchModelSource("a45.svg"), /載入失敗/);
  sandbox.fetch = async () => ({ok:true, text:async () => "<svg/>"});
  assert.equal(await sandbox.fetchModelSource("a45.svg"), "<svg/>");

  let hidden;
  const loading = {classList:{toggle(_, value) { hidden = value; }},textContent:""};
  Object.assign(sandbox, {
    state:{renderMode:"photo",view:"a45"}, svgs:{}, modelLoadErrors:{},
    document:{getElementById:() => loading}
  });
  vm.runInContext(implementation("syncPreviewLoading"), sandbox);
  sandbox.syncPreviewLoading(); assert.equal(hidden, true);
  sandbox.state.renderMode = "model";
  sandbox.syncPreviewLoading(); assert.equal(hidden, false);
  sandbox.modelLoadErrors.a45 = new Error("timeout");
  sandbox.syncPreviewLoading(); assert.match(loading.textContent, /載入失敗/);
  sandbox.svgs.a45 = {};
  sandbox.syncPreviewLoading(); assert.equal(hidden, true);
  sandbox.state.view = "front";
  sandbox.syncPreviewLoading(); assert.equal(hidden, false);

  const initCalls = [];
  const initSandbox = {
    state:{nameSource:"eyefans"}, VIEW_FILES:{front:"front.svg",side:"side.svg",a45:"a45.svg"},
    FRAME_COLORS:[], TEMPLE_COLORS:[], modelLoadErrors:{},
    document:{fonts:null,addEventListener(){}},window:{addEventListener(){}},
    console:{error(){}}, customizationModeFromLocation:() => "uv",
    customizationModeLockedFromLocation:() => true,
    loadSvg:(key) => key === "front" ? new Promise(() => {}) : Promise.resolve(),
    updateAll:() => initCalls.push("render"), syncPreviewLoading(){}
  };
  for (const name of ["initializeCartSubmit", "loadPersonalizationDraft", "preparePhotoLayers", "bindControls", "syncViewControls", "syncSizeControls", "renderSwatches", "refreshLensPricing", "renderIconCatalog", "updateIconSlotUi", "updateConditionalFields", "updateColorAvailability", "updatePrint"]) initSandbox[name] = () => {};
  vm.createContext(initSandbox);
  vm.runInContext(implementation("init"), initSandbox);
  initSandbox.init();
  assert.equal(initCalls.length, 1, "photo renders before pending models");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(initCalls.length, 3, "other angles render despite stalled front model");
  console.log("preview loading regression tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
