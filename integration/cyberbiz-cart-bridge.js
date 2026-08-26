/*
 * eYeFANS customizer -> CYBERBIZ cart bridge (theme.liquid draft)
 *
 * ============================================================================
 * TEST CONFIGURATION WARNING
 * ============================================================================
 * 1. TEST_MODE intentionally defaults to true. While true, this file NEVER
 *    sends a network request and only simulates a successful cart response.
 * 2. The variant IDs below belong to the current TEST products. Confirm every
 *    ID against a fresh CYBERBIZ product export before any production launch.
 * 3. `/cart/add` is an unversioned CYBERBIZ storefront route. Its `id` and
 *    `quantity` body contract must be rechecked in DevTools Network after every
 *    theme/platform change.
 * 4. Only after the three checks above may TEST_MODE be changed to false.
 *
 * This standalone draft is not imported by the simulator. Paste/review it in
 * the published CYBERBIZ theme only after staging verification.
 */
(function eyefansCyberbizCartBridge() {
  "use strict";

  const TEST_MODE = true;
  const SCHEMA_VERSION = 1;
  const SUBMIT_TYPE = "eyefans-customizer-submit";
  const RESULT_TYPE = "eyefans-customizer-cart-result";
  const CUSTOMIZER_ORIGIN = "https://nina82815.github.io";
  const CUSTOMIZER_PATHS = new Set(["/eyefans-custom/", "/eyefans-custom/index.html"]);
  const CUSTOMIZER_IFRAME_SELECTOR = ".eyefans-custom-wrap iframe";
  const CART_ADD_PATH = "/cart/add";
  const CART_URL = "/cart";
  const REQUEST_TIMEOUT_MS = 15000;
  const MAX_CACHED_RESULTS = 100;

  // TEST PRODUCT VARIANT IDs — replace/verify before setting TEST_MODE=false.
  const PRODUCT_CONFIG_BY_HANDLE = Object.freeze({
    "cls-cus-mix-sun-rd": Object.freeze({
      mode: "color",
      variants: Object.freeze({ XS: "87452738", S: "87452739", M: "87452740", L: "87452741" })
    }),
    "cls-cus-mix-laser-sun-rd": Object.freeze({
      mode: "engraving",
      variants: Object.freeze({ XS: "87452764", S: "87452765", M: "87452766", L: "87452767" })
    }),
    "cls-cus-mix-uv-sun-rd": Object.freeze({
      mode: "uv",
      variants: Object.freeze({ XS: "87452776", S: "87452777", M: "87452778", L: "87452779" })
    })
  });

  const ALLOWED_MODES = new Set(["color", "engraving", "uv"]);
  const ALLOWED_SIZES = new Set(["XS", "S", "M", "L"]);
  const completedResults = new Map();
  const pendingRequests = new Map();

  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function currentProductContext() {
    const match = window.location.pathname.match(/\/products\/([^/?#]+)\/?$/i);
    if (!match) return null;
    const handle = match[1].toLowerCase();
    const config = PRODUCT_CONFIG_BY_HANDLE[handle];
    return config ? { handle, config } : null;
  }

  function trustedCustomizerFrame(sourceWindow, expectedMode) {
    const frames = Array.from(document.querySelectorAll(CUSTOMIZER_IFRAME_SELECTOR));

    return frames.find(frame => {
      if (frame.contentWindow !== sourceWindow) return false;

      try {
        const url = new URL(frame.src, window.location.href);
        const lock = url.searchParams.get("locked") || url.searchParams.get("lock");
        return url.origin === CUSTOMIZER_ORIGIN
          && CUSTOMIZER_PATHS.has(url.pathname)
          && url.searchParams.get("mode") === expectedMode
          && url.searchParams.get("cart") === "1"
          && (lock === "1" || lock?.toLowerCase() === "true");
      } catch (error) {
        return false;
      }
    }) || null;
  }

  function validateRequest(data, expectedMode) {
    if (!isPlainObject(data)) throw new Error("INVALID_MESSAGE");

    const allowedKeys = new Set(["type", "schemaVersion", "requestId", "selection"]);
    if (Object.keys(data).some(key => !allowedKeys.has(key))) throw new Error("UNEXPECTED_MESSAGE_FIELD");
    if (data.type !== SUBMIT_TYPE) throw new Error("INVALID_MESSAGE_TYPE");
    if (data.schemaVersion !== SCHEMA_VERSION) throw new Error("UNSUPPORTED_SCHEMA_VERSION");
    if (typeof data.requestId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(data.requestId)) {
      throw new Error("INVALID_REQUEST_ID");
    }
    if (!isPlainObject(data.selection)) throw new Error("INVALID_SELECTION");

    const selection = data.selection;
    if (!ALLOWED_MODES.has(selection.customizationMode)) throw new Error("INVALID_MODE");
    if (selection.customizationMode !== expectedMode) throw new Error("MODE_HANDLE_MISMATCH");
    if (selection.customizationModeLocked !== true) throw new Error("CUSTOMIZER_NOT_LOCKED");
    if (!ALLOWED_SIZES.has(selection.size)) throw new Error("INVALID_SIZE");

    for (const key of ["frame", "temple", "lens", "summary"]) {
      const value = selection[key];
      if (typeof value !== "string" || !value.trim() || value.length > 1200) {
        throw new Error(`INVALID_${key.toUpperCase()}`);
      }
    }

    return { requestId: data.requestId, selection };
  }

  function cacheResult(requestId, result) {
    completedResults.set(requestId, result);
    if (completedResults.size <= MAX_CACHED_RESULTS) return;
    completedResults.delete(completedResults.keys().next().value);
  }

  function sendResult(targetWindow, result) {
    targetWindow.postMessage(result, CUSTOMIZER_ORIGIN);
  }

  function makeResult(requestId, fields) {
    return {
      type: RESULT_TYPE,
      schemaVersion: SCHEMA_VERSION,
      requestId,
      ...fields
    };
  }

  function publicErrorMessage(error) {
    const messages = {
      MODE_HANDLE_MISMATCH: "客製方案與目前商品不一致，請重新整理後再試。",
      CUSTOMIZER_NOT_LOCKED: "商品客製方案未鎖定，請重新整理後再試。",
      INVALID_SIZE: "尺寸資料不正確，請重新選擇。",
      VARIANT_NOT_CONFIGURED: "此尺寸尚未設定購買款式。",
      CART_RESPONSE_NOT_JSON: "購物車回應格式已變更，請聯絡客服。",
      CART_REQUEST_TIMEOUT: "購物車連線逾時，請稍後再試。"
    };
    return messages[error?.message] || "目前無法加入購物車，請稍後再試。";
  }

  async function parseCartResponse(response) {
    const responseText = await response.text();
    let payload;

    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      throw new Error("CART_RESPONSE_NOT_JSON");
    }

    if (!response.ok || payload?.success === false || payload?.error) {
      throw new Error("CART_ADD_REJECTED");
    }

    return payload;
  }

  async function addVariantToCart(variantId) {
    if (TEST_MODE) {
      await new Promise(resolve => window.setTimeout(resolve, 350));
      return { testMode: true, variantId };
    }

    const endpoint = new URL(CART_ADD_PATH, window.location.origin);
    if (endpoint.origin !== window.location.origin || endpoint.pathname !== CART_ADD_PATH) {
      throw new Error("INVALID_CART_ENDPOINT");
    }

    const body = new URLSearchParams();
    body.set("id", variantId);
    body.set("quantity", "1");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await window.fetch(endpoint.href, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: body.toString(),
        redirect: "error",
        signal: controller.signal
      });
      return await parseCartResponse(response);
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("CART_REQUEST_TIMEOUT");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function processRequest(requestId, selection, productContext) {
    const variantId = productContext.config.variants[selection.size];
    if (!/^\d+$/.test(variantId || "")) throw new Error("VARIANT_NOT_CONFIGURED");

    await addVariantToCart(variantId);

    return makeResult(requestId, {
      ok: true,
      message: TEST_MODE
        ? "測試成功：已收到設計資料，但沒有實際加入購物車。"
        : "設計已加入購物車。",
      cartUrl: new URL(CART_URL, window.location.origin).href
    });
  }

  window.addEventListener("message", event => {
    if (event.origin !== CUSTOMIZER_ORIGIN) return;
    if (event.data?.type !== SUBMIT_TYPE) return;

    const productContext = currentProductContext();
    if (!productContext) return;
    if (!trustedCustomizerFrame(event.source, productContext.config.mode)) return;

    let request;
    try {
      request = validateRequest(event.data, productContext.config.mode);
    } catch (error) {
      const requestId = typeof event.data?.requestId === "string" ? event.data.requestId : "invalid-request";
      sendResult(event.source, makeResult(requestId, {
        ok: false,
        message: publicErrorMessage(error)
      }));
      return;
    }

    const cachedResult = completedResults.get(request.requestId);
    if (cachedResult) {
      sendResult(event.source, cachedResult);
      return;
    }

    const existingRequest = pendingRequests.get(request.requestId);
    if (existingRequest) {
      existingRequest.then(result => sendResult(event.source, result));
      return;
    }

    const pending = processRequest(request.requestId, request.selection, productContext)
      .catch(error => makeResult(request.requestId, {
        ok: false,
        message: publicErrorMessage(error)
      }))
      .then(result => {
        cacheResult(request.requestId, result);
        pendingRequests.delete(request.requestId);
        return result;
      });

    pendingRequests.set(request.requestId, pending);
    pending.then(result => sendResult(event.source, result));
  });

  if (TEST_MODE) {
    console.warn("[eYeFANS cart bridge] TEST_MODE=true：不會發送 /cart/add 請求。", PRODUCT_CONFIG_BY_HANDLE);
  }
})();
