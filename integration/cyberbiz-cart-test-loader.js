/*
 * eYeFANS CYBERBIZ integration — physically isolated test-only loader.
 *
 * It only echoes a simulated success result to the verified customizer iframe.
 * No production cart integration is imported or executed by this file.
 */
(function eyefansCyberbizCartTestLoader() {
  "use strict";

  const TEST_QUERY_KEY = "eyefans_cart_test";
  const TEST_QUERY_VALUE = "1";
  const STOREFRONT_ORIGIN = "https://www.eyefans.com.tw";
  const CUSTOMIZER_ORIGIN = "https://nina82815.github.io";
  const CUSTOMIZER_PATHS = new Set(["/eyefans-custom/", "/eyefans-custom/index.html"]);
  const CUSTOMIZER_IFRAME_SELECTOR = ".eyefans-custom-wrap iframe";
  const SUBMIT_TYPE = "eyefans-customizer-submit";
  const RESULT_TYPE = "eyefans-customizer-cart-result";
  const SCHEMA_VERSION = 1;
  const LOADER_FLAG = "__eyefansCartTestLoaderActive";
  const FIND_TIMEOUT_MS = 20000;
  const SIMULATED_DELAY_MS = 350;

  const MODE_BY_HANDLE = Object.freeze({
    "cls-cus-mix-sun-rd": "color",
    "cls-cus-mix-laser-sun-rd": "engraving",
    "cls-cus-mix-uv-sun-rd": "uv"
  });
  const ALLOWED_SIZES = new Set(["XS", "S", "M", "L"]);
  const ALLOWED_MESSAGE_KEYS = new Set(["type", "schemaVersion", "requestId", "selection"]);
  const ALLOWED_SELECTION_KEYS = new Set([
    "customizationMode",
    "customizationModeLabel",
    "customizationModeLocked",
    "size",
    "view",
    "renderMode",
    "frame",
    "temple",
    "lens",
    "lensId",
    "printMode",
    "uvPrintMode",
    "icon1",
    "icon2",
    "name",
    "textColor",
    "font",
    "caseMode",
    "order",
    "namePosition",
    "customizationSide",
    "customizationSideLabel",
    "summary"
  ]);

  // Normal product URLs exit before this loader touches the document.
  const parentUrl = new URL(window.location.href);
  if (parentUrl.searchParams.get(TEST_QUERY_KEY) !== TEST_QUERY_VALUE) return;
  if (parentUrl.origin !== STOREFRONT_ORIGIN) return;
  if (window[LOADER_FLAG]) return;
  window[LOADER_FLAG] = true;

  let activeFrame = null;
  const pendingRequestIds = new Set();

  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function currentProductMode() {
    const match = parentUrl.pathname.match(/(?:^|\/)products\/([^/?#]+)\/?$/i);
    if (!match) return null;
    return MODE_BY_HANDLE[match[1].toLowerCase()] || null;
  }

  function validatedCustomizerFrame(requireCartGate) {
    const expectedMode = currentProductMode();
    if (!expectedMode) return null;

    const frames = Array.from(document.querySelectorAll(CUSTOMIZER_IFRAME_SELECTOR));
    return frames.find(frame => {
      try {
        const iframeUrl = new URL(frame.src, parentUrl.href);
        const lock = iframeUrl.searchParams.get("locked") || iframeUrl.searchParams.get("lock");

        return iframeUrl.origin === CUSTOMIZER_ORIGIN
          && CUSTOMIZER_PATHS.has(iframeUrl.pathname)
          && iframeUrl.searchParams.get("mode") === expectedMode
          && (lock === "1" || lock?.toLowerCase() === "true")
          && (!requireCartGate || iframeUrl.searchParams.get("cart") === "1");
      } catch (error) {
        return false;
      }
    }) || null;
  }

  function validateRequest(data, expectedMode) {
    if (!isPlainObject(data)) throw new Error("INVALID_MESSAGE");
    if (Object.keys(data).some(key => !ALLOWED_MESSAGE_KEYS.has(key))) {
      throw new Error("UNEXPECTED_MESSAGE_FIELD");
    }
    if (data.type !== SUBMIT_TYPE) throw new Error("INVALID_MESSAGE_TYPE");
    if (data.schemaVersion !== SCHEMA_VERSION) throw new Error("UNSUPPORTED_SCHEMA_VERSION");
    if (typeof data.requestId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(data.requestId)) {
      throw new Error("INVALID_REQUEST_ID");
    }
    if (!isPlainObject(data.selection)) throw new Error("INVALID_SELECTION");
    if (Object.keys(data.selection).some(key => !ALLOWED_SELECTION_KEYS.has(key))) {
      throw new Error("UNEXPECTED_SELECTION_FIELD");
    }

    const selection = data.selection;
    if (selection.customizationMode !== expectedMode) throw new Error("MODE_HANDLE_MISMATCH");
    if (selection.customizationModeLocked !== true) throw new Error("CUSTOMIZER_NOT_LOCKED");
    if (!ALLOWED_SIZES.has(selection.size)) throw new Error("INVALID_SIZE");

    for (const key of ["frame", "temple", "lens", "summary"]) {
      const value = selection[key];
      if (typeof value !== "string" || !value.trim() || value.length > 1200) {
        throw new Error(`INVALID_${key.toUpperCase()}`);
      }
    }

    return data.requestId;
  }

  function sendResult(targetWindow, requestId, ok, message) {
    targetWindow.postMessage({
      type: RESULT_TYPE,
      schemaVersion: SCHEMA_VERSION,
      requestId,
      ok,
      message
    }, CUSTOMIZER_ORIGIN);
  }

  function handleSubmit(event) {
    if (event.origin !== CUSTOMIZER_ORIGIN) return;
    if (event.data?.type !== SUBMIT_TYPE) return;

    const expectedMode = currentProductMode();
    const frame = validatedCustomizerFrame(true);
    if (!expectedMode || !frame || frame !== activeFrame || event.source !== frame.contentWindow) return;

    let requestId;
    try {
      requestId = validateRequest(event.data, expectedMode);
    } catch (error) {
      const invalidRequestId = typeof event.data?.requestId === "string"
        ? event.data.requestId
        : "invalid-request";
      sendResult(event.source, invalidRequestId, false, "測試資料格式不正確，請重新整理後再試。");
      return;
    }

    if (pendingRequestIds.has(requestId)) return;
    pendingRequestIds.add(requestId);

    window.setTimeout(() => {
      pendingRequestIds.delete(requestId);
      const liveFrame = validatedCustomizerFrame(true);
      if (!liveFrame || liveFrame !== frame || event.source !== liveFrame.contentWindow) return;
      sendResult(
        event.source,
        requestId,
        true,
        "測試成功：已收到設計資料，沒有實際加入購物車。"
      );
    }, SIMULATED_DELAY_MS);
  }

  function enableCartTest() {
    const frame = validatedCustomizerFrame(false);
    if (!frame) return false;

    // Register the verified parent listener before exposing the iframe CTA.
    activeFrame = frame;
    window.addEventListener("message", handleSubmit);

    const iframeUrl = new URL(frame.src, parentUrl.href);
    if (iframeUrl.searchParams.get("cart") !== "1") {
      iframeUrl.searchParams.set("cart", "1");
      frame.src = iframeUrl.href;
    }

    return true;
  }

  function start() {
    if (enableCartTest()) return;

    const observer = new MutationObserver(() => {
      if (!enableCartTest()) return;
      observer.disconnect();
      window.clearTimeout(stopTimer);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    const stopTimer = window.setTimeout(() => observer.disconnect(), FIND_TIMEOUT_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
