/*
 * eYeFANS CYBERBIZ integration — unpublished-theme live cart test.
 *
 * This file DOES call the storefront cart endpoint, but only when the current
 * product URL contains `eyefans_cart_live_test=1`. It is intentionally kept
 * separate from the no-write test loader.
 *
 * The standard CYBERBIZ `/cart/add` request only accepts a variant id and
 * quantity. During this staging test, the complete manufacturing spec is kept
 * in the same browser and copied into `order[note]` on the checkout page.
 * This is a staging fallback, not a replacement for native line-item custom
 * fields or a server-side design-record service.
 */
(function eyefansCyberbizCartLiveTestLoader() {
  "use strict";

  const LIVE_QUERY_KEY = "eyefans_cart_live_test";
  const LIVE_QUERY_VALUE = "1";
  const STOREFRONT_ORIGIN = "https://www.eyefans.com.tw";
  const CUSTOMIZER_ORIGIN = "https://nina82815.github.io";
  const CUSTOMIZER_PATHS = new Set(["/eyefans-custom/", "/eyefans-custom/index.html"]);
  const CUSTOMIZER_IFRAME_SELECTOR = ".eyefans-custom-wrap iframe";
  const CART_ADD_PATH = "/cart/add";
  const CART_JSON_PATH = "/cart.json";
  const CART_URL = "/cart";
  const SUBMIT_TYPE = "eyefans-customizer-submit";
  const RESULT_TYPE = "eyefans-customizer-cart-result";
  const SCHEMA_VERSION = 1;
  const LOADER_FLAG = "__eyefansCartLiveTestLoaderActive";
  // V3 intentionally ignores V2 records that may have been marked active from
  // an HTTP 2xx response without a verified CYBERBIZ cart receipt.
  const STORAGE_KEY = "eyefansCustomCartDesignsV3";
  const FIND_TIMEOUT_MS = 20000;
  // The iframe gives the parent 18 seconds to reply.
  const REQUEST_TIMEOUT_MS = 15000;
  const RETRY_GUARD_MS = 5 * 60 * 1000;
  const RECORD_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  const MAX_RECORDS = 20;
  const MAX_NOTE_LENGTH = 3000;
  const NOTE_START = "【eYeFANS 客製設計資料】";
  const NOTE_END = "【客製設計資料結束】";

  const PRODUCT_CONFIG_BY_HANDLE = Object.freeze({
    "cls-cus-mix-sun-rd": Object.freeze({
      productId: "71536660",
      mode: "color",
      label: "框腳配色",
      variants: Object.freeze({ XS: "87452738", S: "87452739", M: "87452740", L: "87452741" })
    }),
    "cls-cus-mix-laser-sun-rd": Object.freeze({
      productId: "71536670",
      mode: "engraving",
      label: "框腳配色＋雷雕",
      variants: Object.freeze({ XS: "87452764", S: "87452765", M: "87452766", L: "87452767" })
    }),
    "cls-cus-mix-uv-sun-rd": Object.freeze({
      productId: "71536673",
      mode: "uv",
      label: "框腳配色＋UV 彩印",
      variants: Object.freeze({ XS: "87452776", S: "87452777", M: "87452778", L: "87452779" })
    })
  });

  const FRAME_COLORS = new Set([
    "櫻花粉", "粉紫", "暖黃", "豆綠", "深藍", "復刻粉", "芋頭紫", "奶油黃",
    "薄荷綠", "丹寧藍", "梅子", "奶茶", "青釉綠", "天藍", "玫瑰", "咖啡牛奶",
    "枯黃", "霧面黑", "灰色", "咖啡紅茶", "霧面白", "琥珀"
  ]);
  const L_SIZE_COLORS = new Set([
    "櫻花粉", "粉紫", "芋頭紫", "奶油黃", "奶茶", "青釉綠", "玫瑰",
    "咖啡牛奶", "霧面黑", "灰色", "咖啡紅茶", "霧面白", "琥珀"
  ]);
  const LENSES = Object.freeze({ gray: "三號灰片", "blue-tea": "抗藍光鏡片" });
  const PRINT_MODE_LABELS = Object.freeze({
    both: "2 圖＋名字",
    icon: "只要 2 圖",
    name: "只要名字",
    none: "不加印刷"
  });
  const FONT_LABELS = Object.freeze({
    zhBold: "中文粗體",
    zhRounded: "中文圓體",
    purpleSmile: "圓潤手寫體",
    baksoSapi: "童趣積木體"
  });
  const CASE_LABELS = Object.freeze({ preserve: "照原輸入", upper: "全大寫", lower: "全小寫" });
  const TEXT_COLOR_LABELS = Object.freeze({ black: "黑色", white: "白色", rainbow: "逐字彩色" });
  const ALLOWED_SIZES = new Set(["XS", "S", "M", "L"]);
  const ALLOWED_RENDER_MODES = new Set(["photo", "model"]);
  const ALLOWED_VIEWS = new Set(["front", "side", "a45"]);
  const ALLOWED_PRINT_MODES = new Set(Object.keys(PRINT_MODE_LABELS));
  const ALLOWED_FONTS = new Set(Object.keys(FONT_LABELS));
  const ENGLISH_FONTS = new Set(["purpleSmile", "baksoSapi"]);
  const ALLOWED_CASES = new Set(Object.keys(CASE_LABELS));
  const ALLOWED_TEXT_COLORS = new Set(Object.keys(TEXT_COLOR_LABELS));
  const ALLOWED_ORDERS = new Set(["normal", "reverse"]);
  const ALLOWED_NAME_POSITIONS = new Set(["center", "before", "after"]);
  const ALLOWED_MESSAGE_KEYS = new Set(["type", "schemaVersion", "requestId", "selection"]);
  const ALLOWED_SELECTION_KEYS = new Set([
    "customizationMode", "customizationModeLabel", "customizationModeLocked", "size", "view",
    "renderMode", "frame", "temple", "lens", "lensId", "printMode", "uvPrintMode",
    "icon1", "icon2", "name", "textColor", "font", "caseMode", "order", "namePosition",
    "customizationSide", "customizationSideLabel", "summary"
  ]);
  const ALL_CUSTOM_VARIANT_IDS = new Set(
    Object.values(PRODUCT_CONFIG_BY_HANDLE).flatMap(config => Object.values(config.variants))
  );

  const pageUrl = new URL(window.location.href);
  if (pageUrl.origin !== STOREFRONT_ORIGIN) return;
  if (window[LOADER_FLAG]) return;
  // Never let the no-write and live-cart test handlers answer the same request.
  if (pageUrl.searchParams.get("eyefans_cart_test") === "1") return;

  const productContext = currentProductContext();
  const cartToken = currentCartToken();
  const liveProductTest = Boolean(
    productContext && pageUrl.searchParams.get(LIVE_QUERY_KEY) === LIVE_QUERY_VALUE
  );

  // CYBERBIZ can leave an unpublished product-page preview and render the
  // checkout with the published theme. The checkout copy of this loader must
  // therefore be safe to install in the published theme: stay completely
  // inert unless this browser actually has a non-empty live-test payload.
  if (!liveProductTest && (!cartToken || !hasCheckoutTestState())) return;
  window[LOADER_FLAG] = true;

  if (liveProductTest) {
    startProductBridge(productContext);
  } else {
    startCartNoteSync(cartToken);
  }

  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function currentProductContext() {
    const match = pageUrl.pathname.match(/(?:^|\/)products\/([^/?#]+)\/?$/i);
    if (!match) return null;
    const handle = match[1].toLowerCase();
    const config = PRODUCT_CONFIG_BY_HANDLE[handle];
    return config ? { handle, config } : null;
  }

  function currentCartToken() {
    const match = pageUrl.pathname.match(/(?:^|\/)carts\/([A-Za-z0-9_-]+)\/?$/i);
    return match ? match[1] : null;
  }

  function hasCheckoutTestState() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      // A published checkout must never be interrupted merely because this
      // browser blocks storage. There is no recoverable test payload here.
      return false;
    }
    if (typeof raw !== "string" || raw.trim() === "" || raw.trim() === "[]") return false;
    try {
      const parsed = JSON.parse(raw);
      return !Array.isArray(parsed) || parsed.length > 0;
    } catch (error) {
      // A non-empty but malformed live-test payload should enter the guarded
      // reconciliation path so a matching custom test item cannot check out.
      return true;
    }
  }

  function readRecords() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      const cutoff = Date.now() - RECORD_MAX_AGE_MS;
      return parsed.filter(record => (
        isPlainObject(record)
        && typeof record.designId === "string"
        && typeof record.requestId === "string"
        && typeof record.fingerprint === "string"
        && Object.prototype.hasOwnProperty.call(PRODUCT_CONFIG_BY_HANDLE, record.handle)
        && record.mode === PRODUCT_CONFIG_BY_HANDLE[record.handle].mode
        && ALL_CUSTOM_VARIANT_IDS.has(String(record.variantId))
        && isPlainObject(record.selection)
        && validStoredSelection(record.selection, record.mode)
        && String(record.variantId) === PRODUCT_CONFIG_BY_HANDLE[record.handle].variants[record.selection.size]
        && Number.isFinite(record.createdAt)
        && record.createdAt >= cutoff
        && (record.status === "pending" || record.status === "active")
      )).slice(-MAX_RECORDS);
    } catch (error) {
      return [];
    }
  }

  function writeRecords(records) {
    const normalized = records.slice(-MAX_RECORDS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function removeRecord(requestId) {
    writeRecords(readRecords().filter(record => record.requestId !== requestId));
  }

  function updateRecord(requestId, fields) {
    const records = readRecords();
    const index = records.findIndex(record => record.requestId === requestId);
    if (index < 0) return null;
    records[index] = { ...records[index], ...fields };
    writeRecords(records);
    return records[index];
  }

  function uvNameUnits(value) {
    return Array.from(value).reduce((total, character) => {
      if (/\p{Script=Han}/u.test(character)) return total + 2.5;
      if (character === " ") return total + 0.5;
      return total + 1;
    }, 0);
  }

  function assertNullableString(value, key, maxLength = 120) {
    if (value === null) return;
    if (typeof value !== "string" || value.length > maxLength) throw new Error(`INVALID_${key}`);
  }

  function validateCommonSelection(selection, expectedMode) {
    if (!isPlainObject(selection)) throw new Error("INVALID_SELECTION");
    if (Object.keys(selection).some(key => !ALLOWED_SELECTION_KEYS.has(key))) {
      throw new Error("UNEXPECTED_SELECTION_FIELD");
    }
    if (selection.customizationMode !== expectedMode) throw new Error("MODE_HANDLE_MISMATCH");
    if (selection.customizationModeLocked !== true) throw new Error("CUSTOMIZER_NOT_LOCKED");
    if (!ALLOWED_SIZES.has(selection.size)) throw new Error("INVALID_SIZE");
    if (!FRAME_COLORS.has(selection.frame)) throw new Error("INVALID_FRAME");
    if (!FRAME_COLORS.has(selection.temple)) throw new Error("INVALID_TEMPLE");
    if (selection.size === "L" && (!L_SIZE_COLORS.has(selection.frame) || !L_SIZE_COLORS.has(selection.temple))) {
      throw new Error("UNAVAILABLE_L_COLOR");
    }
    if (!Object.prototype.hasOwnProperty.call(LENSES, selection.lensId)) throw new Error("INVALID_LENS_ID");
    if (selection.lens !== LENSES[selection.lensId]) throw new Error("LENS_MISMATCH");
    if (!ALLOWED_VIEWS.has(selection.view)) throw new Error("INVALID_VIEW");
    if (!ALLOWED_RENDER_MODES.has(selection.renderMode)) throw new Error("INVALID_RENDER_MODE");
    if (!ALLOWED_PRINT_MODES.has(selection.printMode)) throw new Error("INVALID_PRINT_MODE");
    if (typeof selection.summary !== "string" || !selection.summary.trim() || selection.summary.length > 1200) {
      throw new Error("INVALID_SUMMARY");
    }
    for (const key of [
      "customizationModeLabel", "uvPrintMode", "icon1", "icon2", "name", "textColor", "font",
      "caseMode", "order", "namePosition", "customizationSide", "customizationSideLabel"
    ]) {
      assertNullableString(selection[key], key);
    }
  }

  function validateModeSelection(selection, expectedMode) {
    if (expectedMode === "color") {
      if (selection.printMode !== "none" || selection.uvPrintMode !== null) throw new Error("INVALID_COLOR_MODE");
      if (selection.icon1 !== null || selection.icon2 !== null || selection.name !== "") {
        throw new Error("INVALID_COLOR_PERSONALIZATION");
      }
      if ([selection.textColor, selection.font, selection.caseMode, selection.order, selection.namePosition,
        selection.customizationSide, selection.customizationSideLabel].some(value => value !== null)) {
        throw new Error("INVALID_COLOR_FIELDS");
      }
      return;
    }

    if (expectedMode === "engraving") {
      if (selection.printMode !== "name" || selection.uvPrintMode !== null) throw new Error("INVALID_ENGRAVING_MODE");
      if (selection.icon1 !== null || selection.icon2 !== null) throw new Error("INVALID_ENGRAVING_ICONS");
      if (typeof selection.name !== "string" || !/^[A-Za-z]{1,10}$/.test(selection.name)) {
        throw new Error("INVALID_ENGRAVING_NAME");
      }
      if (selection.textColor !== "white" || !ENGLISH_FONTS.has(selection.font)) {
        throw new Error("INVALID_ENGRAVING_STYLE");
      }
      if (!ALLOWED_CASES.has(selection.caseMode)) throw new Error("INVALID_CASE_MODE");
      if (selection.order !== null || selection.namePosition !== null) throw new Error("INVALID_ENGRAVING_ORDER");
      if (selection.customizationSide !== "right" || !selection.customizationSideLabel) {
        throw new Error("INVALID_CUSTOMIZATION_SIDE");
      }
      return;
    }

    if (selection.uvPrintMode !== selection.printMode) throw new Error("UV_MODE_MISMATCH");
    const usesIcons = selection.printMode === "both" || selection.printMode === "icon";
    const usesName = selection.printMode === "both" || selection.printMode === "name";

    if (usesIcons) {
      if (!/^\d{2}$/.test(selection.icon1 || "") || !/^\d{2}$/.test(selection.icon2 || "")) {
        throw new Error("INVALID_UV_ICONS");
      }
      const iconNumbers = [Number(selection.icon1), Number(selection.icon2)];
      if (iconNumbers.some(number => number < 1 || number > 33)) throw new Error("INVALID_UV_ICONS");
      if (!ALLOWED_ORDERS.has(selection.order)) throw new Error("INVALID_UV_ORDER");
    } else if (selection.icon1 !== null || selection.icon2 !== null || selection.order !== null) {
      throw new Error("UNEXPECTED_UV_ICONS");
    }

    if (usesName) {
      if (
        typeof selection.name !== "string"
        || !selection.name.trim()
        || !/^[A-Za-z0-9 \p{Script=Han}]+$/u.test(selection.name)
        || uvNameUnits(selection.name) > 10
      ) throw new Error("INVALID_UV_NAME");
      if (!ALLOWED_TEXT_COLORS.has(selection.textColor)) throw new Error("INVALID_TEXT_COLOR");
      if (!ALLOWED_FONTS.has(selection.font)) throw new Error("INVALID_FONT");
      if (!ALLOWED_CASES.has(selection.caseMode)) throw new Error("INVALID_CASE_MODE");
    } else if (
      selection.name !== ""
      || selection.textColor !== null
      || selection.font !== null
      || selection.caseMode !== null
    ) {
      throw new Error("UNEXPECTED_UV_NAME");
    }

    if (selection.printMode === "both") {
      if (!ALLOWED_NAME_POSITIONS.has(selection.namePosition)) throw new Error("INVALID_NAME_POSITION");
    } else if (selection.namePosition !== null) {
      throw new Error("UNEXPECTED_NAME_POSITION");
    }

    if (selection.printMode === "none") {
      if (selection.customizationSide !== null || selection.customizationSideLabel !== null) {
        throw new Error("UNEXPECTED_CUSTOMIZATION_SIDE");
      }
    } else if (selection.customizationSide !== "right" || !selection.customizationSideLabel) {
      throw new Error("INVALID_CUSTOMIZATION_SIDE");
    }
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
    validateCommonSelection(data.selection, expectedMode);
    validateModeSelection(data.selection, expectedMode);
    return { requestId: data.requestId, selection: data.selection };
  }

  function validStoredSelection(selection, expectedMode) {
    try {
      if (!isPlainObject(selection)) return false;
      if (selection.customizationMode !== expectedMode) return false;
      if (!ALLOWED_SIZES.has(selection.size)) return false;
      if (!FRAME_COLORS.has(selection.frame) || !FRAME_COLORS.has(selection.temple)) return false;
      if (selection.size === "L" && (!L_SIZE_COLORS.has(selection.frame) || !L_SIZE_COLORS.has(selection.temple))) {
        return false;
      }
      if (!Object.prototype.hasOwnProperty.call(LENSES, selection.lensId)) return false;
      if (!ALLOWED_PRINT_MODES.has(selection.printMode)) return false;
      validateModeSelection(selection, expectedMode);
      return true;
    } catch (error) {
      return false;
    }
  }

  function canonicalSelection(selection) {
    return {
      customizationMode: selection.customizationMode,
      size: selection.size,
      frame: selection.frame,
      temple: selection.temple,
      lensId: selection.lensId,
      printMode: selection.printMode,
      uvPrintMode: selection.uvPrintMode,
      icon1: selection.icon1,
      icon2: selection.icon2,
      name: selection.name,
      textColor: selection.textColor,
      font: selection.font,
      caseMode: selection.caseMode,
      order: selection.order,
      namePosition: selection.namePosition,
      customizationSide: selection.customizationSide,
      customizationSideLabel: selection.customizationSideLabel
    };
  }

  function fingerprintFor(handle, selection) {
    const source = `${handle}|${JSON.stringify(canonicalSelection(selection))}`;
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).toUpperCase();
  }

  function designIdFor(requestId, fingerprint) {
    let hash = 0;
    const source = `${requestId}|${fingerprint}`;
    for (let index = 0; index < source.length; index += 1) {
      hash = Math.imul(31, hash) + source.charCodeAt(index) | 0;
    }
    return `EF-${Date.now().toString(36).toUpperCase()}-${(hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
  }

  function arrangementLabel(selection) {
    if (!(selection.printMode === "both" || selection.printMode === "icon")) return null;
    const icons = selection.order === "reverse" ? ["2", "1"] : ["1", "2"];
    if (selection.printMode === "icon") return icons.join(" ");
    if (selection.namePosition === "before") return `NAME ${icons.join(" ")}`;
    if (selection.namePosition === "after") return `${icons.join(" ")} NAME`;
    return `${icons[0]} NAME ${icons[1]}`;
  }

  function buildManufacturingLines(record, index) {
    const selection = record.selection;
    const config = PRODUCT_CONFIG_BY_HANDLE[record.handle];
    const lines = [
      `${index + 1}. 設計編號：${record.designId}`,
      `方案：${config?.label || selection.customizationModeLabel}`,
      `尺寸：${selection.size}`,
      `鏡框：${selection.frame}`,
      `鏡腳：${selection.temple}`,
      `鏡片：${LENSES[selection.lensId]}`
    ];

    if (selection.customizationMode === "engraving") {
      lines.push(
        "加工：單色雷雕（畫面以白色示意）",
        `文字：${selection.name}`,
        `字體：${FONT_LABELS[selection.font]}`,
        `英文格式：${CASE_LABELS[selection.caseMode]}`,
        "位置：右外側鏡腳"
      );
    }

    if (selection.customizationMode === "uv" && selection.printMode !== "none") {
      lines.push(`彩印內容：${PRINT_MODE_LABELS[selection.printMode]}`);
      if (selection.icon1) lines.push(`圖案：${selection.icon1}／${selection.icon2}`);
      if (selection.name) {
        lines.push(
          `文字：${selection.name}`,
          `字體：${FONT_LABELS[selection.font]}`,
          `文字顏色：${TEXT_COLOR_LABELS[selection.textColor]}`,
          `英文格式：${CASE_LABELS[selection.caseMode]}`
        );
      }
      const arrangement = arrangementLabel(selection);
      if (arrangement) lines.push(`排列：${arrangement}`);
      lines.push("位置：右外側鏡腳");
    }

    return lines.join("\n");
  }

  function buildNoteBlock(records) {
    return [
      NOTE_START,
      ...records.map((record, index) => buildManufacturingLines(record, index)),
      NOTE_END
    ].join("\n");
  }

  function stripExistingNoteBlock(note) {
    const start = note.indexOf(NOTE_START);
    if (start < 0) return note.trim();
    const end = note.indexOf(NOTE_END, start);
    if (end < 0) return note.slice(0, start).trim();
    return `${note.slice(0, start)}${note.slice(end + NOTE_END.length)}`.trim();
  }

  function publicErrorMessage(error) {
    const messages = {
      MODE_HANDLE_MISMATCH: "客製方案與目前商品不一致，請重新整理後再試。",
      CUSTOMIZER_NOT_LOCKED: "商品客製方案未鎖定，請重新整理後再試。",
      INVALID_SIZE: "尺寸資料不正確，請重新選擇。",
      UNAVAILABLE_L_COLOR: "L 尺寸沒有此配色，請重新選擇。",
      VARIANT_NOT_CONFIGURED: "此尺寸尚未設定購買款式。",
      EMBEDDED_PREVIEW_CONTEXT: "目前商品頁開在後台預覽框中，瀏覽器可能無法保存購物車。請將未發布主題預覽以新分頁開啟後再試。",
      CART_RESPONSE_NOT_JSON: "CYBERBIZ 沒有回傳可驗證的購物車資料。請先查看購物車，避免重複加入。",
      CART_RESPONSE_REDIRECTED: "加入購物車請求被重新導向，結果無法確認。請先查看購物車，避免重複加入。",
      CART_RECEIPT_MISMATCH: "CYBERBIZ 回傳的商品款式或數量不一致。請先查看購物車，避免重複加入。",
      PRODUCT_PREFLIGHT_FAILED: "目前無法確認商品款式與庫存，因此尚未送出商品。請確認網路後再試。",
      PRODUCT_VARIANT_MISMATCH: "CYBERBIZ 商品款式設定與模擬器不一致，因此尚未送出商品。請聯絡網站管理員。",
      VARIANT_UNAVAILABLE: "此尺寸目前沒有可用庫存，因此尚未送出商品。請選擇其他尺寸或稍後再試。",
      CART_PREFLIGHT_FAILED: "目前無法讀取 CYBERBIZ 購物車，因此尚未送出商品。請確認網路後再試。",
      CART_REQUEST_TIMEOUT: "購物車連線逾時，請先查看購物車，避免重複加入。",
      CART_RATE_LIMITED: "操作速度過快，請稍候幾秒再試。",
      CART_ADD_REJECTED: "此尺寸目前無法加入購物車，請確認測試商品庫存。",
      CART_VERIFY_FAILED: "商品可能已加入，但系統無法確認購物車數量。請先查看購物車，避免重複加入。",
      STORAGE_UNAVAILABLE: "瀏覽器無法保存客製資料，為避免資料遺失，請更換瀏覽器後再試。"
    };
    return messages[error?.message] || "客製資料不完整或目前無法加入購物車，請重新確認。";
  }

  async function parseCartResponse(response, requestedVariantId) {
    if (response.status === 429) throw new Error("CART_RATE_LIMITED");
    if (!response.ok) {
      const definiteClientRejection = response.status >= 400
        && response.status < 500
        && response.status !== 408
        && response.status !== 425;
      throw new Error(definiteClientRejection ? "CART_ADD_REJECTED" : "CART_VERIFY_FAILED");
    }
    if (response.redirected !== false) throw new Error("CART_RESPONSE_REDIRECTED");
    const contentType = response.headers?.get?.("content-type") || "";
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
      throw new Error("CART_RESPONSE_NOT_JSON");
    }
    const responseText = await response.text();
    if (!responseText) throw new Error("CART_RESPONSE_NOT_JSON");
    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      throw new Error("CART_RESPONSE_NOT_JSON");
    }
    if (!isPlainObject(payload)) throw new Error("CART_RESPONSE_NOT_JSON");
    if (payload.success === false || payload.error || payload.err_msg) {
      throw new Error("CART_ADD_REJECTED");
    }

    const expectedVariantId = String(requestedVariantId);
    const returnedVariantId = String(payload.variant_id_int ?? "");
    const returnedQuantity = Number(payload.quantity);
    const expectedCartItemId = `${expectedVariantId}_normal_`;
    if (
      returnedVariantId !== expectedVariantId
      || !Number.isInteger(returnedQuantity)
      || returnedQuantity < 1
      || payload.cart_item_id !== expectedCartItemId
    ) {
      throw new Error("CART_RECEIPT_MISMATCH");
    }

    return payload;
  }

  function parseLineItemsSource(source) {
    if (typeof source !== "string") return null;
    const match = source.match(/window\.lineItems\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  async function verifyCurrentProductVariant(context, variantId, size, signal) {
    const expectedPath = `/products/${encodeURIComponent(context.handle)}`;
    const endpoint = new URL(expectedPath, window.location.origin);
    if (endpoint.origin !== STOREFRONT_ORIGIN || endpoint.pathname !== expectedPath) {
      throw new Error("PRODUCT_VARIANT_MISMATCH");
    }
    const response = await window.fetch(endpoint.href, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal
    });
    const contentType = response.headers?.get?.("content-type") || "";
    if (!response.ok || response.redirected !== false || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
      throw new Error("PRODUCT_PREFLIGHT_FAILED");
    }

    let payload;
    try {
      payload = JSON.parse(await response.text());
    } catch (error) {
      throw new Error("PRODUCT_PREFLIGHT_FAILED");
    }
    if (
      !isPlainObject(payload)
      || String(payload.id ?? "") !== context.config.productId
      || payload.handle !== context.handle
      || payload.url !== expectedPath
      || !Array.isArray(payload.variants)
    ) {
      throw new Error("PRODUCT_VARIANT_MISMATCH");
    }

    const sizeVariants = payload.variants.filter(variant => (
      isPlainObject(variant) && variant.option1 === size
    ));
    if (sizeVariants.length !== 1) throw new Error("PRODUCT_VARIANT_MISMATCH");
    const variant = sizeVariants[0];
    if (
      String(variant.id ?? "") !== String(variantId)
      || String(variant.product_id ?? "") !== context.config.productId
    ) {
      throw new Error("PRODUCT_VARIANT_MISMATCH");
    }

    const inventoryQuantity = variant.inventory_quantity;
    const inventoryAllowed = variant.inventory_policy === "continue"
      || inventoryQuantity === null
      || (Number.isInteger(Number(inventoryQuantity)) && Number(inventoryQuantity) > 0);
    return {
      available: payload.available === true && variant.available === true && inventoryAllowed,
      inventoryPolicy: variant.inventory_policy,
      inventoryQuantity: inventoryQuantity === null ? null : Number(inventoryQuantity)
    };
  }

  async function cartJsonVariantQuantity(variantId, signal) {
    const endpoint = new URL(CART_JSON_PATH, window.location.origin);
    if (endpoint.origin !== STOREFRONT_ORIGIN || endpoint.pathname !== CART_JSON_PATH) {
      throw new Error("CART_PREFLIGHT_FAILED");
    }
    const response = await window.fetch(endpoint.href, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal
    });
    const contentType = response.headers?.get?.("content-type") || "";
    if (!response.ok || response.redirected !== false || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
      throw new Error("CART_PREFLIGHT_FAILED");
    }
    let payload;
    try {
      payload = JSON.parse(await response.text());
    } catch (error) {
      throw new Error("CART_PREFLIGHT_FAILED");
    }
    if (
      !isPlainObject(payload)
      || !Array.isArray(payload.items)
      || !Number.isInteger(Number(payload.item_count))
      || Number(payload.item_count) < 0
    ) {
      throw new Error("CART_PREFLIGHT_FAILED");
    }
    let totalItemCount = 0;
    const variantQuantity = payload.items.reduce((total, item) => {
      if (!isPlainObject(item)) throw new Error("CART_PREFLIGHT_FAILED");
      const itemVariantId = String(item.variant_id_int ?? "");
      const quantity = Number(item.quantity);
      if (!itemVariantId || !Number.isInteger(quantity) || quantity < 0) {
        throw new Error("CART_PREFLIGHT_FAILED");
      }
      totalItemCount += quantity;
      return itemVariantId === String(variantId) ? total + quantity : total;
    }, 0);
    if (totalItemCount !== Number(payload.item_count)) throw new Error("CART_PREFLIGHT_FAILED");
    return variantQuantity;
  }

  async function addVariantToCart(context, variantId, size, options = {}) {
    const endpoint = new URL(CART_ADD_PATH, window.location.origin);
    if (endpoint.origin !== STOREFRONT_ORIGIN || endpoint.pathname !== CART_ADD_PATH) {
      throw new Error("INVALID_CART_ENDPOINT");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const body = new URLSearchParams();
    body.set("id", variantId);
    body.set("quantity", "1");
    try {
      // `/cart.json` is CYBERBIZ's own navigation-cart data source. Read it
      // before the single POST so the cart delta can independently verify the
      // add without relying on a permissive or malformed `/cart/add` receipt.
      const preflightResults = await Promise.allSettled([
        verifyCurrentProductVariant(context, variantId, size, controller.signal),
        cartJsonVariantQuantity(variantId, controller.signal)
      ]);
      if (controller.signal.aborted) throw new Error("CART_REQUEST_TIMEOUT");
      const [productResult, cartResult] = preflightResults;
      if (productResult.status === "rejected") {
        const productError = productResult.reason;
        if (["PRODUCT_VARIANT_MISMATCH", "VARIANT_UNAVAILABLE"].includes(productError?.message)) {
          throw productError;
        }
        throw new Error("PRODUCT_PREFLIGHT_FAILED");
      }
      if (cartResult.status === "rejected") throw new Error("CART_PREFLIGHT_FAILED");
      const beforeQuantity = cartResult.value;
      const productState = productResult.value;
      const exceedsInventory = productState.inventoryPolicy !== "continue"
        && productState.inventoryQuantity !== null
        && beforeQuantity + 1 > productState.inventoryQuantity;
      const canPost = productState.available === true && !exceedsInventory;

      const preflightResult = options.onPreflight?.(beforeQuantity, { canPost });
      if (preflightResult?.skipPost) {
        return { skippedPost: true, beforeQuantity, record: preflightResult.record };
      }
      if (!canPost) throw new Error("VARIANT_UNAVAILABLE");

      let receipt = null;
      let receiptError = null;
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
        receipt = await parseCartResponse(response, variantId);
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) {
          throw new Error("CART_REQUEST_TIMEOUT");
        }
        receiptError = error instanceof Error ? error : new Error("CART_VERIFY_FAILED");
      }

      if (["CART_RATE_LIMITED", "CART_ADD_REJECTED"].includes(receiptError?.message)) {
        throw receiptError;
      }

      let afterQuantity;
      try {
        afterQuantity = await cartJsonVariantQuantity(variantId, controller.signal);
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) {
          throw new Error("CART_REQUEST_TIMEOUT");
        }
        throw new Error("CART_VERIFY_FAILED");
      }

      if (afterQuantity !== beforeQuantity + 1) {
        throw receiptError || new Error("CART_VERIFY_FAILED");
      }

      return {
        receipt,
        verifiedByCartDelta: true,
        beforeQuantity,
        afterQuantity
      };
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) {
        throw new Error("CART_REQUEST_TIMEOUT");
      }
      if ([
        "CART_RATE_LIMITED", "CART_ADD_REJECTED", "CART_RESPONSE_NOT_JSON",
        "CART_RESPONSE_REDIRECTED", "CART_RECEIPT_MISMATCH", "CART_PREFLIGHT_FAILED",
        "CART_VERIFY_FAILED", "CART_REQUEST_TIMEOUT", "STORAGE_UNAVAILABLE",
        "PRODUCT_PREFLIGHT_FAILED", "PRODUCT_VARIANT_MISMATCH", "VARIANT_UNAVAILABLE"
      ].includes(error?.message)) throw error;
      throw new Error("CART_VERIFY_FAILED");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function sendResult(targetWindow, requestId, fields) {
    targetWindow.postMessage({
      type: RESULT_TYPE,
      schemaVersion: SCHEMA_VERSION,
      requestId,
      ...fields
    }, CUSTOMIZER_ORIGIN);
  }

  function trustedCustomizerFrame(sourceWindow, expectedMode, requireCartGate) {
    const frames = Array.from(document.querySelectorAll(CUSTOMIZER_IFRAME_SELECTOR));
    return frames.find(frame => {
      if (sourceWindow && frame.contentWindow !== sourceWindow) return false;
      try {
        const iframeUrl = new URL(frame.src, pageUrl.href);
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

  function startProductBridge(context) {
    let activeFrame = null;
    const completedResults = new Map();
    const pendingRequests = new Map();

    async function processRequest(request, targetWindow) {
      if (window.top !== window.self) throw new Error("EMBEDDED_PREVIEW_CONTEXT");

      const variantId = context.config.variants[request.selection.size];
      if (!/^\d+$/.test(variantId || "")) throw new Error("VARIANT_NOT_CONFIGURED");

      const fingerprint = fingerprintFor(context.handle, request.selection);
      const matchingRecords = readRecords().filter(record => record.fingerprint === fingerprint);
      const pendingRecord = matchingRecords.find(record => record.status === "pending");
      if (pendingRecord) throw new Error("CART_REQUEST_TIMEOUT");

      const record = {
        designId: designIdFor(request.requestId, fingerprint),
        requestId: request.requestId,
        fingerprint,
        handle: context.handle,
        mode: context.config.mode,
        variantId,
        selection: canonicalSelection(request.selection),
        status: "pending",
        cartToken: null,
        createdAt: Date.now()
      };

      let addResult;
      try {
        addResult = await addVariantToCart(context, variantId, request.selection.size, {
          onPreflight(beforeQuantity, { canPost }) {
            const currentRecords = readRecords();
            const currentPending = currentRecords.find(item => (
              item.fingerprint === fingerprint && item.status === "pending"
            ));
            if (currentPending) throw new Error("CART_REQUEST_TIMEOUT");

            const currentRecent = [...currentRecords].reverse().find(item => (
              item.fingerprint === fingerprint
              && item.status === "active"
              && Date.now() - item.createdAt <= RETRY_GUARD_MS
            ));
            if (currentRecent) {
              const activeDesignCount = currentRecords.filter(item => (
                item.status === "active" && item.variantId === variantId
              )).length;
              const recordedAfterQuantity = Number(currentRecent.receipt?.cartQuantityAfter) || 0;
              const requiredCartQuantity = Math.max(activeDesignCount, recordedAfterQuantity);
              if (beforeQuantity >= requiredCartQuantity) {
                return { skipPost: true, record: currentRecent };
              }
            }

            // An existing verified design may be returned from the cart even
            // after it consumed the final unit. A new design, however, must
            // never create a pending record or POST while unavailable.
            if (!canPost) return { skipPost: false };

            // A recent active record that is no longer represented by the
            // authoritative cart quantity is stale. Replace only that design
            // with the new pending request immediately before the one POST.
            const recordsWithoutStale = currentRecent
              ? currentRecords.filter(item => item.requestId !== currentRecent.requestId)
              : currentRecords;
            try {
              writeRecords([...recordsWithoutStale, record]);
            } catch (error) {
              throw new Error("STORAGE_UNAVAILABLE");
            }
            return { skipPost: false };
          }
        });
      } catch (error) {
        // Only an explicit HTTP rejection proves the add did not happen. Keep
        // every other result pending so the same design cannot be posted twice.
        if (["CART_RATE_LIMITED", "CART_ADD_REJECTED"].includes(error?.message)) {
          removeRecord(request.requestId);
        }
        throw error;
      }

      if (addResult.skippedPost) {
        return {
          ok: true,
          message: `此設計已加入購物車（設計編號 ${addResult.record.designId}）。`,
          cartUrl: new URL(CART_URL, STOREFRONT_ORIGIN).href,
          designId: addResult.record.designId,
          liveTest: true
        };
      }

      const receipt = addResult.receipt;
      const storedQuantity = Number(receipt?.quantity) >= 1 ? Number(receipt.quantity) : 1;
      const storedCartItemId = receipt?.cart_item_id || `${variantId}_normal_`;

      try {
        const activatedRecord = updateRecord(request.requestId, {
          status: "active",
          receipt: {
            variantId: String(variantId),
            cartItemId: storedCartItemId,
            quantity: storedQuantity,
            cartQuantityBefore: addResult.beforeQuantity,
            cartQuantityAfter: addResult.afterQuantity,
            verifiedByCartDelta: addResult.verifiedByCartDelta === true,
            verifiedAt: Date.now()
          }
        });
        if (!activatedRecord) throw new Error("STORAGE_UNAVAILABLE");
      } catch (error) {
        throw new Error("STORAGE_UNAVAILABLE");
      }
      try {
        const refreshResult = typeof window.pullNavCart === "function" ? window.pullNavCart() : null;
        refreshResult?.catch?.(() => {});
      } catch (error) {
        // Navigation-cart refresh is visual only; the verified receipt above is
        // the sole proof used to report success.
      }
      return {
        ok: true,
        message: `已加入購物車，設計編號 ${record.designId}。請前往購物車確認製作資料。`,
        cartUrl: new URL(CART_URL, STOREFRONT_ORIGIN).href,
        designId: record.designId,
        liveTest: true
      };
    }

    function handleSubmit(event) {
      if (event.origin !== CUSTOMIZER_ORIGIN || event.data?.type !== SUBMIT_TYPE) return;
      const frame = trustedCustomizerFrame(event.source, context.config.mode, true);
      if (!frame || frame !== activeFrame) return;

      let request;
      try {
        request = validateRequest(event.data, context.config.mode);
      } catch (error) {
        const requestId = typeof event.data?.requestId === "string" ? event.data.requestId : "invalid-request";
        sendResult(event.source, requestId, { ok: false, message: publicErrorMessage(error), liveTest: true });
        return;
      }

      const cached = completedResults.get(request.requestId);
      if (cached) {
        sendResult(event.source, request.requestId, cached);
        return;
      }
      const pending = pendingRequests.get(request.requestId);
      if (pending) {
        pending.then(result => sendResult(event.source, request.requestId, result));
        return;
      }

      const task = processRequest(request, event.source)
        .catch(error => ({ ok: false, message: publicErrorMessage(error), liveTest: true }))
        .then(result => {
          pendingRequests.delete(request.requestId);
          completedResults.set(request.requestId, result);
          if (completedResults.size > 100) completedResults.delete(completedResults.keys().next().value);
          return result;
        });

      pendingRequests.set(request.requestId, task);
      task.then(result => sendResult(event.source, request.requestId, result));
    }

    function enable() {
      const frame = trustedCustomizerFrame(null, context.config.mode, false);
      if (!frame) return false;
      activeFrame = frame;
      window.addEventListener("message", handleSubmit);
      const iframeUrl = new URL(frame.src, pageUrl.href);
      if (iframeUrl.searchParams.get("cart") !== "1") {
        iframeUrl.searchParams.set("cart", "1");
        frame.src = iframeUrl.href;
      }
      return true;
    }

    function start() {
      if (enable()) return;
      const observer = new MutationObserver(() => {
        if (!enable()) return;
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
  }

  function startCartNoteSync(activeCartToken) {
    let checkoutBlocked = false;
    let lastVerifiedNoteValue = null;
    let syncTimer = null;
    let checkoutInFlight = false;
    let allowNextCheckout = false;
    let cartMutationVersion = 0;

    function ensureStyles() {
      if (document.getElementById("eyefans-cart-live-test-style")) return;
      const style = document.createElement("style");
      style.id = "eyefans-cart-live-test-style";
      style.textContent = [
        "#eyefans-cart-design-summary{margin:12px 0;padding:14px 16px;border:1px solid #d8cdbb;border-radius:12px;background:#fffaf1;color:#173f36;line-height:1.65}",
        "#eyefans-cart-design-summary strong{display:block;margin-bottom:6px}",
        "#eyefans-cart-design-summary pre{margin:0;white-space:pre-wrap;font:inherit}",
        "#eyefans-cart-design-summary[data-state='error']{border-color:#c34d35;background:#fff3ef;color:#8b2f20}",
        "#checkout-button[data-eyefans-blocked='1']{opacity:.55;cursor:not-allowed}"
      ].join("");
      document.head.appendChild(style);
    }

    function renderPanel(noteBlock, errorMessage) {
      ensureStyles();
      let panel = document.getElementById("eyefans-cart-design-summary");
      if (!panel) {
        panel = document.createElement("section");
        panel.id = "eyefans-cart-design-summary";
        const note = document.querySelector('textarea[name="order[note]"]');
        (note?.parentElement || document.getElementById("checkout-button")?.parentElement || document.body)
          .insertBefore(panel, note || null);
      }
      panel.dataset.state = errorMessage ? "error" : "ready";
      panel.replaceChildren();
      const title = document.createElement("strong");
      title.textContent = errorMessage ? "客製資料需要重新確認" : "本次客製製作資料";
      const content = document.createElement("pre");
      content.textContent = errorMessage || noteBlock;
      panel.append(title, content);
    }

    function setCheckoutBlocked(blocked) {
      checkoutBlocked = blocked;
      if (blocked) lastVerifiedNoteValue = null;
      const button = document.getElementById("checkout-button");
      if (!button) return;
      if (blocked) {
        button.dataset.eyefansBlocked = "1";
        button.setAttribute("aria-disabled", "true");
      } else {
        delete button.dataset.eyefansBlocked;
        button.removeAttribute("aria-disabled");
      }
    }

    function cartStateFromLineItems(lineItems) {
      if (!Array.isArray(lineItems)) return null;
      const quantities = new Map();
      for (const item of lineItems) {
        const variantId = String(item?.variant_id || "");
        const quantity = Number(item?.quantity);
        if (!variantId || !Number.isInteger(quantity) || quantity < 0) {
          return { invalid: true, quantities: new Map() };
        }
        if (!ALL_CUSTOM_VARIANT_IDS.has(variantId)) continue;
        quantities.set(variantId, (quantities.get(variantId) || 0) + quantity);
      }
      return { invalid: false, quantities };
    }

    function embeddedLineItems() {
      if (Array.isArray(window.lineItems)) return window.lineItems;
      for (const script of Array.from(document.scripts || [])) {
        const parsed = parseLineItemsSource(script.textContent || "");
        if (parsed) return parsed;
      }
      return null;
    }

    function currentPageCartState() {
      const lineItems = embeddedLineItems();
      if (!lineItems) return null;
      const rows = Array.from(document.querySelectorAll("tr.line-item"));
      if (rows.length !== lineItems.length) return { invalid: true, quantities: new Map() };
      const normalized = lineItems.map((item, index) => {
        const quantityInput = rows[index]?.querySelector?.('[data-testid="quantity-input"]');
        return { ...item, quantity: quantityInput?.value ?? item.quantity };
      });
      return cartStateFromLineItems(normalized);
    }

    function updateNoteValue(note, value) {
      if (!note || note.value === value) return;
      // CYBERBIZ Checkout v3 renders this as a React-controlled textarea.
      // Calling the browser's native setter bypasses React's value tracker;
      // the following input event is then observed by React and updates the
      // component state that is ultimately submitted with the order.
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement?.prototype || {},
        "value"
      )?.set;
      if (nativeSetter) nativeSetter.call(note, value);
      else note.value = value;
      note.dispatchEvent(new Event("input", { bubbles: true }));
      note.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function reconcile(cartState) {
      try {
        if (cartState.invalid) {
          renderPanel("", "購物車內容正在更新。請重新整理此頁後再確認客製資料；為避免製作錯誤，目前暫停結帳。");
          setCheckoutBlocked(true);
          return false;
        }
        const { quantities } = cartState;

        const allRecords = readRecords();
        const foreignCartRecords = allRecords.filter(record => (
          record.cartToken !== null && record.cartToken !== activeCartToken
        ));
        const unboundRecords = allRecords.filter(record => record.cartToken === null);
        const boundCurrentRecords = allRecords.filter(record => record.cartToken === activeCartToken);
        let records = [...boundCurrentRecords, ...unboundRecords];

        if (quantities.size === 0) {
          const recentPending = records.filter(record => (
            record.status === "pending" && Date.now() - record.createdAt <= RETRY_GUARD_MS
          ));
          if (recentPending.length) {
            renderPanel("", "客製商品仍在確認是否加入購物車，請稍候幾秒再試；為避免重複加入或遺失設計，目前暫停結帳。");
            setCheckoutBlocked(true);
            return false;
          }
          const note = document.querySelector('textarea[name="order[note]"]');
          if (note) updateNoteValue(note, stripExistingNoteBlock(note.value || ""));
          // An active unbound record was created on the product page before
          // CYBERBIZ exposed a /carts/:token URL. It may belong to another
          // cart, so an empty current cart must not discard it.
          writeRecords([...foreignCartRecords, ...unboundRecords]);
          setCheckoutBlocked(false);
          document.getElementById("eyefans-cart-design-summary")?.remove();
          return true;
        }

        const matchedBoundRecords = boundCurrentRecords.filter(record => quantities.has(record.variantId));
        const matchedCounts = new Map();
        matchedBoundRecords.forEach(record => {
          matchedCounts.set(record.variantId, (matchedCounts.get(record.variantId) || 0) + 1);
        });
        const claimedUnboundRecords = [];
        const preservedUnboundRecords = [];
        unboundRecords.forEach(record => {
          const cartQuantity = quantities.get(record.variantId) || 0;
          const matchedCount = matchedCounts.get(record.variantId) || 0;
          if (matchedCount < cartQuantity) {
            // A cart-page quantity match is enough to bind the design to this
            // token, but it cannot upgrade an ambiguous POST receipt.
            claimedUnboundRecords.push({ ...record, cartToken: activeCartToken });
            matchedCounts.set(record.variantId, matchedCount + 1);
          } else {
            // Preserve unclaimed records: they may belong to another CYBERBIZ
            // cart that has not exposed its token to the browser yet.
            preservedUnboundRecords.push(record);
          }
        });
        records = [...matchedBoundRecords, ...claimedUnboundRecords];
        writeRecords([...foreignCartRecords, ...preservedUnboundRecords, ...records]);

        const mismatches = [];
        quantities.forEach((quantity, variantId) => {
          const designCount = records.filter(record => record.variantId === variantId).length;
          if (designCount !== quantity) mismatches.push({ variantId, quantity, designCount });
        });

        if (mismatches.length) {
          const details = mismatches.map(item => (
            `款式 ${item.variantId}：購物車 ${item.quantity} 件／客製設計 ${item.designCount} 筆`
          )).join("\n");
          const message = `客製商品數量與設計資料不一致。\n${details}\n請刪除此客製商品，再回商品頁由模擬器重新加入；為避免製作錯誤，目前暫停結帳。`;
          renderPanel("", message);
          setCheckoutBlocked(true);
          return true;
        }

        const note = document.querySelector('textarea[name="order[note]"]');
        if (!note) {
          renderPanel("", "找不到 CYBERBIZ 訂單備註欄，為避免客製資料遺失，目前暫停結帳。請聯絡網站管理員。");
          setCheckoutBlocked(true);
          return true;
        }

        const noteBlock = buildNoteBlock(records);
        const manualNote = stripExistingNoteBlock(note.value || "");
        const combinedNote = manualNote ? `${manualNote}\n\n${noteBlock}` : noteBlock;
        if (combinedNote.length > MAX_NOTE_LENGTH) {
          renderPanel("", "客製資料超過訂單備註可安全保存的長度，請分開結帳或聯絡客服。");
          setCheckoutBlocked(true);
          return true;
        }

        updateNoteValue(note, combinedNote);
        lastVerifiedNoteValue = combinedNote;
        renderPanel(noteBlock, "");
        setCheckoutBlocked(false);
        return true;
      } catch (error) {
        renderPanel("", "瀏覽器無法保存或讀取客製資料，為避免製作資料遺失，目前暫停結帳。請聯絡網站管理員。");
        setCheckoutBlocked(true);
        return true;
      }
    }

    function syncCurrentPage(expectedMutationVersion = null) {
      try {
        if (expectedMutationVersion !== null && expectedMutationVersion !== cartMutationVersion) return false;
        const cartState = currentPageCartState();
        if (!cartState) {
          renderPanel("", "目前無法讀取購物車內容。為避免客製資料遺失，已暫停結帳；請重新整理頁面後再試。");
          setCheckoutBlocked(true);
          return false;
        }
        return reconcile(cartState);
      } catch (error) {
        renderPanel("", "目前無法讀取購物車內容。為避免客製資料遺失，已暫停結帳；請重新整理頁面後再試。");
        setCheckoutBlocked(true);
        return false;
      }
    }

    function scheduleSync() {
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        syncTimer = null;
        syncCurrentPage();
      }, 350);
    }

    document.addEventListener("click", event => {
      const checkoutButton = event.target.closest?.("#checkout-button");
      if (checkoutButton) {
        if (allowNextCheckout) {
          allowNextCheckout = false;
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        if (checkoutInFlight) return;
        checkoutInFlight = true;
        setCheckoutBlocked(true);
        const expectedMutationVersion = cartMutationVersion;
        const synced = syncCurrentPage(expectedMutationVersion);
        checkoutInFlight = false;
        if (synced && !checkoutBlocked) {
          allowNextCheckout = true;
          checkoutButton.click();
          return;
        }
        document.getElementById("eyefans-cart-design-summary")?.scrollIntoView({ block: "center" });
        return;
      }
      if (event.target.closest?.(".quantity-group, .delete-button")) {
        cartMutationVersion += 1;
        setCheckoutBlocked(true);
        scheduleSync();
      }
    }, true);
    document.addEventListener("change", event => {
      if (event.target.matches?.('[data-testid="quantity-input"]')) {
        cartMutationVersion += 1;
        setCheckoutBlocked(true);
        scheduleSync();
      }
    }, true);

    // CYBERBIZ Checkout v3 emits these lifecycle events. Native click/change
    // listeners remain as a defensive fallback, while these hooks resync
    // after React has replaced or updated the cart controls.
    if (typeof window.jQuery === "function") {
      window.jQuery(document).on(
        "checkout_cart:ready.eyefansCartLiveTest checkout_cart:added.eyefansCartLiveTest checkout_cart:logined.eyefansCartLiveTest",
        () => {
          cartMutationVersion += 1;
          setCheckoutBlocked(true);
          scheduleSync();
        }
      );
      // Checkout v3 serializes the form before this event. Copy the last
      // reconciled value into that final payload as a defense against a React
      // rerender between reconciliation and CYBERBIZ's order request.
      window.jQuery(document).on(
        "checkout_cart:checkout.eyefansCartLiveTest",
        (_event, payload) => {
          if (
            checkoutBlocked
            || typeof lastVerifiedNoteValue !== "string"
            || !lastVerifiedNoteValue
            || !isPlainObject(payload)
          ) return;
          payload['order[note]'] = lastVerifiedNoteValue;
          const note = document.querySelector('textarea[name="order[note]"]');
          if (note) updateNoteValue(note, lastVerifiedNoteValue);
        }
      );
    }

    function start() {
      setCheckoutBlocked(true);
      renderPanel("", "正在確認最新購物車與客製製作資料，請稍候。");
      syncCurrentPage();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }
})();
