/*
 * eYeFANS CYBERBIZ integration — SIZE × LENS PRODUCTION CANDIDATE V2.
 *
 * UNPUBLISHED PRODUCTION CANDIDATE V2 / DO NOT INSTALL ON A PUBLISHED THEME.
 *
 * Each visible SUN/gray product is only an entry page. A lens choice resolves
 * to one of three separate CYBERBIZ products (SUN, BL, or PL), then to that
 * target product's exact size variant. All nine target products and 36 size
 * variants are pinned below and the catalog snapshot is ready. This candidate
 * may be installed only as a replacement loader in an unpublished theme for QA.
 * Product JSON, inventory, and exact target identity are checked before POST.
 * CYBERBIZ owns all prices: the polarized +NT$300 must be configured on the
 * corresponding CYBERBIZ variants. This script never calculates a price.
 *
 * This file enables the customizer on the three allow-listed product pages
 * without a test query parameter. The complete manufacturing spec is kept in
 * the same browser and copied into `order[note]` on the checkout page.
 *
 * This browser-side bridge is a production-v1 fallback for CYBERBIZ's standard
 * `/cart/add` endpoint. A future server-side design registry should remain the
 * authoritative long-term replacement for browser storage.
 */
(function eyefansCyberbizCartPolarizedProductionCandidateV2Loader() {
  "use strict";

  const TEST_QUERY_KEYS = Object.freeze(["eyefans_cart_test", "eyefans_cart_live_test"]);
  const STOREFRONT_ORIGIN = "https://www.eyefans.com.tw";
  const CUSTOMIZER_ORIGIN = "https://nina82815.github.io";
  const CUSTOMIZER_PATHS = new Set(["/eyefans-custom/", "/eyefans-custom/index.html"]);
  const CUSTOMIZER_IFRAME_SELECTOR = ".eyefans-custom-wrap iframe";
  const CHECKOUT_BUTTON_SELECTOR = "#checkout-button, .floating-checkout-button button";
  const CART_LINE_ITEM_SELECTOR = "tr.line-item, div.line-item";
  const CART_ADD_PATH = "/cart/add";
  const CART_JSON_PATH = "/cart.json";
  const CART_URL = "/cart";
  const SUBMIT_TYPE = "eyefans-customizer-submit";
  const RESULT_TYPE = "eyefans-customizer-cart-result";
  const SCHEMA_VERSION = 1;
  const developmentRuntime = (() => {
    try {
      const loaderUrl = new URL(document.currentScript?.src || "", window.location.href);
      return loaderUrl.searchParams.get("eyefans_size_lens_development") === "1";
    } catch (error) {
      return false;
    }
  })();
  const LOADER_FLAG = developmentRuntime
    ? "__eyefansCartSizeLensDevelopmentLoaderActive"
    : "__eyefansCartProductionLoaderActive";
  // The explicit development query isolates records. The normal candidate URL
  // is a production-key replacement and must never run beside another loader.
  const STORAGE_KEY = developmentRuntime
    ? "eyefansCustomCartDesignsSizeLensDevV1"
    : "eyefansCustomCartDesignsProdV1";
  const FIND_TIMEOUT_MS = 20000;
  // The iframe gives the parent 18 seconds to reply.
  const REQUEST_TIMEOUT_MS = 15000;
  // The add request is sent exactly once. These are read-only cart refreshes
  // used when CYBERBIZ has not exposed the new quantity immediately yet.
  const POSTFLIGHT_POLL_DELAYS_MS = Object.freeze([0, 150, 350, 750]);
  // Checkout v3 updates its React rows and /cart.json asynchronously. A single
  // 350 ms debounce was not sufficient in production-like QA, so cart-note
  // reconciliation now waits for two equal DOM samples and retries a bounded
  // number of times until the authoritative cart JSON agrees with that DOM.
  const CART_SYNC_RETRY_DELAYS_MS = Object.freeze([0, 150, 350, 750, 1500]);
  const CART_SYNC_FETCH_TIMEOUT_MS = 5000;
  const CART_DOM_STABLE_SAMPLES = 2;
  const RETRY_GUARD_MS = 5 * 60 * 1000;
  const RECORD_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  const MAX_RECORDS = 20;
  const MAX_NOTE_LENGTH = 3000;
  const NOTE_START = "【eYeFANS 客製設計資料】";
  const NOTE_END = "【客製設計資料結束】";

  const PRODUCT_CONFIG_BY_HANDLE = Object.freeze({
    "cls-cus-mix-sun-rd": Object.freeze({
      entryProductId: "71536660",
      mode: "color",
      label: "框腳配色",
      targetsByLens: Object.freeze({
        gray: Object.freeze({
          handle: "cls-cus-mix-sun-rd",
          productId: "71536660",
          variantsBySize: Object.freeze({
            XS: "87452738", S: "87452739", M: "87452740", L: "87452741"
          })
        }),
        "blue-tea": Object.freeze({
          handle: "cls-cus-mix-bl-rd",
          productId: "71536666",
          variantsBySize: Object.freeze({
            XS: "87452750", S: "87452751", M: "87452752", L: "87452753"
          })
        }),
        polarized: Object.freeze({
          handle: "cls-cus-mix-pl-rd",
          productId: "71536665",
          variantsBySize: Object.freeze({
            XS: "87452746", S: "87452747", M: "87452748", L: "87452749"
          })
        })
      })
    }),
    "cls-cus-mix-laser-sun-rd": Object.freeze({
      entryProductId: "71536670",
      mode: "engraving",
      label: "框腳配色＋雷雕",
      targetsByLens: Object.freeze({
        gray: Object.freeze({
          handle: "cls-cus-mix-laser-sun-rd",
          productId: "71536670",
          variantsBySize: Object.freeze({
            XS: "87452764", S: "87452765", M: "87452766", L: "87452767"
          })
        }),
        "blue-tea": Object.freeze({
          handle: "cls-cus-mix-laser-bl-rd",
          productId: "71536672",
          variantsBySize: Object.freeze({
            XS: "87452772", S: "87452773", M: "87452774", L: "87452775"
          })
        }),
        polarized: Object.freeze({
          handle: "cls-cus-mix-laser-pl-rd",
          productId: "71536671",
          variantsBySize: Object.freeze({
            XS: "87452768", S: "87452769", M: "87452770", L: "87452771"
          })
        })
      })
    }),
    "cls-cus-mix-uv-sun-rd": Object.freeze({
      entryProductId: "71536673",
      mode: "uv",
      label: "框腳配色＋UV 彩印",
      targetsByLens: Object.freeze({
        gray: Object.freeze({
          handle: "cls-cus-mix-uv-sun-rd",
          productId: "71536673",
          variantsBySize: Object.freeze({
            XS: "87452776", S: "87452777", M: "87452778", L: "87452779"
          })
        }),
        "blue-tea": Object.freeze({
          handle: "cls-cus-mix-uv-bl-rd",
          productId: "71536675",
          variantsBySize: Object.freeze({
            XS: "87452784", S: "87452785", M: "87452786", L: "87452787"
          })
        }),
        polarized: Object.freeze({
          handle: "cls-cus-mix-uv-pl-rd",
          productId: "71536674",
          variantsBySize: Object.freeze({
            XS: "87452780", S: "87452781", M: "87452782", L: "87452783"
          })
        })
      })
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
  const LENSES = Object.freeze({
    gray: "三號灰片",
    "blue-tea": "抗藍光鏡片",
    polarized: "偏光鏡片"
  });
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
    Object.values(PRODUCT_CONFIG_BY_HANDLE)
      .flatMap(config => Object.values(config.targetsByLens)
        .flatMap(target => Object.values(target.variantsBySize)))
      .filter(variantId => /^\d+$/.test(variantId))
  );

  const pageUrl = new URL(window.location.href);
  if (pageUrl.origin !== STOREFRONT_ORIGIN) return;
  if (window[LOADER_FLAG]) return;
  // A test URL must be handled only by the explicitly installed test loader.
  if (TEST_QUERY_KEYS.some(key => pageUrl.searchParams.get(key) === "1")) return;

  const productContext = currentProductContext();
  const cartToken = currentCartToken();
  const scriptUrl = currentLoaderUrl();
  const drainMode = scriptUrl?.searchParams.get("drain") === "1";
  const productionProduct = Boolean(productContext && !drainMode);
  const guardedCheckout = Boolean(cartToken && shouldGuardProductionCheckout());

  // Normal carts with no production record and no custom variant stay inert.
  if (!productionProduct && !guardedCheckout) return;
  window[LOADER_FLAG] = true;

  if (productionProduct) {
    lockNativeProductPurchase(productContext);
    startProductBridge(productContext);
  } else {
    startCartNoteSync(cartToken);
  }

  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function targetProductForSelection(config, selection) {
    return config?.targetsByLens?.[selection?.lensId] || null;
  }

  function variantIdForSelection(config, selection) {
    return targetProductForSelection(config, selection)?.variantsBySize?.[selection?.size] || "";
  }

  function assertTargetConfiguration(config, selection) {
    const target = targetProductForSelection(config, selection);
    const variantId = variantIdForSelection(config, selection);
    if (
      !target
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target.handle || "")
      || !/^\d+$/.test(target.productId || "")
      || !/^\d+$/.test(variantId)
    ) throw new Error("VARIANT_NOT_CONFIGURED");
    return { target, variantId };
  }

  function storedRecordMatchesTarget(record) {
    const config = PRODUCT_CONFIG_BY_HANDLE[record.handle];
    const target = targetProductForSelection(config, record.selection);
    return Boolean(target)
      && record.targetHandle === target.handle
      && String(record.targetProductId) === String(target.productId)
      && String(record.variantId) === variantIdForSelection(config, record.selection);
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

  function currentLoaderUrl() {
    try {
      const source = document.currentScript?.src;
      return source ? new URL(source, pageUrl.href) : null;
    } catch (error) {
      return null;
    }
  }

  function embeddedLineItemsAtBoot() {
    if (Array.isArray(window.lineItems)) return window.lineItems;
    for (const script of Array.from(document.scripts || [])) {
      const parsed = parseLineItemsSource(script.textContent || "");
      if (parsed) return parsed;
    }
    return null;
  }

  function checkoutContainsCustomVariant() {
    const lineItems = embeddedLineItemsAtBoot();
    if (!Array.isArray(lineItems)) return false;
    return lineItems.some(item => ALL_CUSTOM_VARIANT_IDS.has(String(item?.variant_id || "")));
  }

  function shouldGuardProductionCheckout() {
    // Missing browser records must fail closed whenever a custom variant is
    // visibly present in CYBERBIZ's own checkout payload.
    return checkoutContainsCustomVariant() || hasCheckoutProductionState();
  }

  function hasCheckoutProductionState() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      // A known custom line item is handled by checkoutContainsCustomVariant.
      // Without that platform signal there is no recoverable production state.
      return false;
    }
    if (typeof raw !== "string" || raw.trim() === "" || raw.trim() === "[]") return false;
    try {
      const parsed = JSON.parse(raw);
      return !Array.isArray(parsed) || parsed.length > 0;
    } catch (error) {
      // A non-empty but malformed production payload enters the guarded path.
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
        && /^EF-[A-Z0-9]+-[A-Z0-9]{6}$/.test(record.designId || "")
        && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(record.requestId || "")
        && /^[A-Z0-9]+$/.test(record.fingerprint || "")
        && Object.prototype.hasOwnProperty.call(PRODUCT_CONFIG_BY_HANDLE, record.handle)
        && record.mode === PRODUCT_CONFIG_BY_HANDLE[record.handle].mode
        && ALL_CUSTOM_VARIANT_IDS.has(String(record.variantId))
        && isPlainObject(record.selection)
        && validStoredSelection(record.selection, record.mode)
        && record.fingerprint === fingerprintFor(record.handle, record.selection)
        && storedRecordMatchesTarget(record)
        && Number.isFinite(record.createdAt)
        && record.createdAt >= cutoff
        && (record.cartToken === null || /^[A-Za-z0-9_-]+$/.test(record.cartToken || ""))
        && validCartExclusions(record)
        && (record.status === "pending" || record.status === "active")
        && validStoredReceipt(record)
      )).slice(-MAX_RECORDS);
    } catch (error) {
      return [];
    }
  }

  function validCartExclusions(record) {
    const tokens = record.excludedCartTokens;
    return tokens === undefined || (
      Array.isArray(tokens)
      && tokens.length <= MAX_RECORDS
      && new Set(tokens).size === tokens.length
      && tokens.every(token => typeof token === "string" && /^[A-Za-z0-9_-]+$/.test(token))
    );
  }

  function mayBelongToCart(record, token) {
    return record.cartToken === token || (
      record.cartToken === null && !(record.excludedCartTokens || []).includes(token)
    );
  }

  function validStoredReceipt(record) {
    if (record.status === "pending") return record.receipt == null;
    const receipt = record.receipt;
    if (!isPlainObject(receipt)) return false;
    const before = Number(receipt.cartQuantityBefore);
    const after = Number(receipt.cartQuantityAfter);
    return String(receipt.variantId || "") === String(record.variantId)
      && receipt.cartItemId === `${record.variantId}_normal_`
      && Number.isInteger(Number(receipt.quantity))
      && Number(receipt.quantity) >= 1
      && Number.isInteger(before)
      && before >= 0
      && Number.isInteger(after)
      && after === before + 1
      && receipt.verifiedByCartDelta === true
      && Number.isFinite(receipt.verifiedAt)
      && receipt.verifiedAt >= record.createdAt;
  }

  function writeRecords(records) {
    if (!Array.isArray(records) || records.length > MAX_RECORDS) {
      throw new Error("TOO_MANY_DESIGNS");
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return records;
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
      VARIANT_NOT_CONFIGURED: "此尺寸與鏡片組合尚未設定購買款式。",
      EMBEDDED_PREVIEW_CONTEXT: "目前商品頁開在後台預覽框中，瀏覽器可能無法保存購物車。請將未發布主題預覽以新分頁開啟後再試。",
      CART_RESPONSE_NOT_JSON: "CYBERBIZ 沒有回傳可驗證的購物車資料。請先查看購物車，避免重複加入。",
      CART_RESPONSE_REDIRECTED: "加入購物車請求被重新導向，結果無法確認。請先查看購物車，避免重複加入。",
      CART_RECEIPT_MISMATCH: "CYBERBIZ 回傳的商品款式或數量不一致。請先查看購物車，避免重複加入。",
      PRODUCT_PREFLIGHT_FAILED: "目前無法確認商品款式與庫存，因此尚未送出商品。請確認網路後再試。",
      PRODUCT_VARIANT_MISMATCH: "CYBERBIZ 商品款式設定與模擬器不一致，因此尚未送出商品。請聯絡網站管理員。",
      VARIANT_UNAVAILABLE: "此尺寸與鏡片組合目前沒有可用庫存，因此尚未送出商品。請選擇其他組合或稍後再試。",
      CART_PREFLIGHT_FAILED: "目前無法讀取 CYBERBIZ 購物車，因此尚未送出商品。請確認網路後再試。",
      CART_DESIGN_MISMATCH: "購物車商品與客製設計無法明確對應，因此尚未新增商品。請先查看購物車，移除有問題的客製商品後再從模擬器加入。",
      CART_IDENTITY_UNVERIFIED: "商品可能已加入，但尚未確認購物車與設計資料的對應。請先查看購物車並聯絡客服，不要重複加入或結帳。",
      CART_DESIGN_SAVE_FAILED: "商品可能已加入，但客製資料尚未保存完成。請保留此瀏覽器資料並聯絡客服，不要重複加入、清除瀏覽器資料或結帳。",
      CART_REQUEST_TIMEOUT: "購物車連線逾時，請先查看購物車，避免重複加入。",
      CART_RATE_LIMITED: "操作速度過快，請稍候幾秒再試。",
      CART_ADD_REJECTED: "此尺寸與鏡片組合目前無法加入購物車，請確認商品庫存。",
      CART_VERIFY_FAILED: "商品可能已加入，但系統無法確認購物車數量。請先查看購物車，避免重複加入。",
      STORAGE_UNAVAILABLE: "瀏覽器無法保存客製資料，為避免資料遺失，請更換瀏覽器後再試。",
      TOO_MANY_DESIGNS: "瀏覽器暫存的客製資料已達安全上限，尚未新增商品。請先確認現有購物車或聯絡客服。"
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

  async function verifyTargetProductVariant(target, variantId, size, signal) {
    const expectedPath = `/products/${encodeURIComponent(target.handle)}`;
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
      || String(payload.id ?? "") !== target.productId
      || payload.handle !== target.handle
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
      || String(variant.product_id ?? "") !== target.productId
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

  async function cartJsonState(variantId, signal) {
    const endpoint = new URL(CART_JSON_PATH, window.location.origin);
    if (endpoint.origin !== STOREFRONT_ORIGIN || endpoint.pathname !== CART_JSON_PATH) {
      throw new Error("CART_PREFLIGHT_FAILED");
    }
    let response;
    try {
      response = await window.fetch(endpoint.href, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        signal
      });
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) throw error;
      throw new Error("CART_STATE_UNAVAILABLE");
    }
    const contentType = response.headers?.get?.("content-type") || "";
    if (!response.ok) throw new Error("CART_STATE_UNAVAILABLE");
    if (response.redirected !== false || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
      throw new Error("CART_STATE_INVALID");
    }
    let payload;
    try {
      payload = JSON.parse(await response.text());
    } catch (error) {
      throw new Error("CART_STATE_INVALID");
    }
    if (
      !isPlainObject(payload)
      || !Array.isArray(payload.items)
      || !Number.isInteger(Number(payload.item_count))
      || Number(payload.item_count) < 0
    ) {
      throw new Error("CART_STATE_INVALID");
    }
    let totalQuantity = 0;
    const variantQuantity = payload.items.reduce((total, item) => {
      if (!isPlainObject(item)) throw new Error("CART_STATE_INVALID");
      const itemVariantId = String(item.variant_id_int ?? "");
      const quantity = Number(item.quantity);
      if (!itemVariantId || !Number.isInteger(quantity) || quantity < 0) {
        throw new Error("CART_STATE_INVALID");
      }
      totalQuantity += quantity;
      return itemVariantId === String(variantId) ? total + quantity : total;
    }, 0);
    const rowCount = payload.items.length;
    const itemCount = Number(payload.item_count);
    // CYBERBIZ storefronts have exposed item_count as either line count or
    // unit count. Both meanings are coherent only when they match the items.
    if (itemCount !== rowCount && itemCount !== totalQuantity) {
      throw new Error("CART_STATE_INVALID");
    }
    const hasTotalQuantity = Object.prototype.hasOwnProperty.call(payload, "total_quantity");
    const reportedTotalQuantity = hasTotalQuantity ? Number(payload.total_quantity) : null;
    if (hasTotalQuantity && (
      !Number.isInteger(reportedTotalQuantity)
      || reportedTotalQuantity < 0
      || reportedTotalQuantity !== totalQuantity
    )) throw new Error("CART_STATE_INVALID");

    const isEmpty = rowCount === 0
      && totalQuantity === 0
      && itemCount === 0
      && (!hasTotalQuantity || reportedTotalQuantity === 0);
    return { variantQuantity, totalQuantity, isEmpty };
  }

  async function waitForCartDelta(variantId, beforeQuantity, signal) {
    const targetQuantity = beforeQuantity + 1;
    let lastUnavailableError = null;
    for (const delay of POSTFLIGHT_POLL_DELAYS_MS) {
      if (delay > 0) {
        await new Promise(resolve => window.setTimeout(resolve, delay));
        if (signal.aborted) throw new Error("CART_REQUEST_TIMEOUT");
      }
      try {
        const state = await cartJsonState(variantId, signal);
        if (state.variantQuantity === targetQuantity) return state;
        // A decrease or an increase larger than the single requested unit is
        // not eventual consistency and must never be retried into success.
        if (state.variantQuantity < beforeQuantity || state.variantQuantity > targetQuantity) {
          throw new Error("CART_VERIFY_FAILED");
        }
      } catch (error) {
        if (error?.name === "AbortError" || signal.aborted || error?.message === "CART_REQUEST_TIMEOUT") {
          throw new Error("CART_REQUEST_TIMEOUT");
        }
        if (error?.message === "CART_STATE_INVALID" || error?.message === "CART_VERIFY_FAILED") {
          throw new Error("CART_VERIFY_FAILED");
        }
        lastUnavailableError = error;
      }
    }
    throw lastUnavailableError || new Error("CART_VERIFY_FAILED");
  }

  async function resolveSessionCartToken(signal, allowEmptyCart = false) {
    // The navigation route is the platform's established way to reach the
    // current cart. Use its final URL, not a guessed field in /cart.json.
    const response = await window.fetch(new URL(CART_URL, STOREFRONT_ORIGIN).href, {
      method: "GET",
      mode: "same-origin",
      credentials: "same-origin",
      headers: { Accept: "text/html" },
      cache: "no-store",
      redirect: "follow",
      signal
    });
    try {
      if (!response.ok || typeof response.url !== "string") throw new Error("CART_IDENTITY_UNVERIFIED");
      const destination = new URL(response.url);
      if (destination.origin !== STOREFRONT_ORIGIN || destination.username || destination.password) {
        throw new Error("CART_IDENTITY_UNVERIFIED");
      }
      const match = destination.pathname.match(/^\/carts\/([A-Za-z0-9_-]+)\/?$/);
      if (match) return match[1];
      // CYBERBIZ redirects an empty /cart to its bare home page. This
      // exception is preflight-only, after /cart.json confirms the whole
      // cart is empty; a home page is never proof of a cart identity.
      const emptyHomeRedirect = response.redirected === true
        && destination.pathname === "/"
        && destination.search === ""
        && destination.hash === "";
      if (allowEmptyCart && (/^\/cart\/?$/.test(destination.pathname) || emptyHomeRedirect)) return null;
      throw new Error("CART_IDENTITY_UNVERIFIED");
    } finally {
      // Only the response URL is needed; do not download or inspect checkout HTML.
      response.body?.cancel?.().catch?.(() => {});
    }
  }

  async function addVariantToCart(target, variantId, size, options = {}) {
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
        verifyTargetProductVariant(target, variantId, size, controller.signal),
        cartJsonState(variantId, controller.signal)
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
      const beforeQuantity = cartResult.value.variantQuantity;
      let beforeCartToken;
      try {
        beforeCartToken = await resolveSessionCartToken(controller.signal, cartResult.value.isEmpty);
      } catch (error) {
        if (controller.signal.aborted) throw new Error("CART_REQUEST_TIMEOUT");
        throw new Error("CART_PREFLIGHT_FAILED");
      }
      const productState = productResult.value;
      const exceedsInventory = productState.inventoryPolicy !== "continue"
        && productState.inventoryQuantity !== null
        && beforeQuantity + 1 > productState.inventoryQuantity;
      const canPost = productState.available === true && !exceedsInventory;

      const preflightResult = options.onPreflight?.(beforeQuantity, {
        canPost,
        cartToken: beforeCartToken,
        cartEmpty: cartResult.value.isEmpty
      });
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
        afterQuantity = (await waitForCartDelta(variantId, beforeQuantity, controller.signal)).variantQuantity;
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) {
          throw new Error("CART_REQUEST_TIMEOUT");
        }
        throw receiptError || new Error("CART_VERIFY_FAILED");
      }

      if (afterQuantity !== beforeQuantity + 1) {
        throw receiptError || new Error("CART_VERIFY_FAILED");
      }

      let verifiedCartToken;
      try {
        verifiedCartToken = await resolveSessionCartToken(controller.signal);
        if (beforeCartToken !== null && verifiedCartToken !== beforeCartToken) {
          throw new Error("CART_IDENTITY_UNVERIFIED");
        }
      } catch (error) {
        if (controller.signal.aborted) throw new Error("CART_REQUEST_TIMEOUT");
        throw new Error("CART_IDENTITY_UNVERIFIED");
      }

      return {
        receipt,
        verifiedByCartDelta: true,
        cartToken: verifiedCartToken,
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
        "CART_VERIFY_FAILED", "CART_REQUEST_TIMEOUT", "STORAGE_UNAVAILABLE", "TOO_MANY_DESIGNS",
        "PRODUCT_PREFLIGHT_FAILED", "PRODUCT_VARIANT_MISMATCH", "VARIANT_UNAVAILABLE",
        "CART_DESIGN_MISMATCH", "CART_IDENTITY_UNVERIFIED"
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

  function lockNativeProductPurchase(context) {
    const productId = context.config.entryProductId;
    const handle = context.handle;
    const controlSelector = [
      `#product_info .product_button > button.addToCart[data-id="${productId}"]`,
      `#product_info .product_button_mobile > button.addToCart_mobile[data-handle="${handle}"]`,
      `#product_description .add-to-cart-container > #add_to_cart[data-id="${productId}"][data-handle="${handle}"]`,
      `#product_info .product_button > button.buy-together[data-id="${productId}"]`,
      `#product_info .product_button_mobile > button.buy-together[data-id="${productId}"]`
    ].join(", ");
    const blockedSelector = "[data-eyefans-native-purchase='blocked']";

    function controlFromTarget(target) {
      const element = target?.closest ? target : target?.parentElement;
      return element?.closest?.(controlSelector) || null;
    }

    function markControls() {
      const controls = Array.from(document.querySelectorAll?.(controlSelector) || []);
      controls.forEach(control => {
        if (control.dataset.eyefansNativePurchase !== "blocked") {
          control.dataset.eyefansNativePurchase = "blocked";
        }
        control.setAttribute?.("aria-disabled", "true");
        control.setAttribute?.("title", "請使用下方客製模擬器完成設計並加入購物車");
        if ("disabled" in control) {
          if (control.disabled !== true) control.disabled = true;
        } else {
          control.setAttribute?.("tabindex", "-1");
        }
        if (control.tagName === "INPUT") {
          if (control.value !== "請使用下方模擬器加入購物車") {
            control.value = "請使用下方模擬器加入購物車";
          }
        } else if (control.textContent !== "請使用下方模擬器加入購物車") {
          control.textContent = "請使用下方模擬器加入購物車";
        }
      });
    }

    function blockNativeClick(event) {
      if (!controlFromTarget(event.target)) return;
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      document.querySelector?.(CUSTOMIZER_IFRAME_SELECTOR)?.scrollIntoView?.({ block: "start" });
    }

    function blockNativeSubmit(event) {
      if (!event.target?.querySelector?.(blockedSelector)) return;
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    }

    if (document.head && document.createElement && !document.getElementById?.("eyefans-native-purchase-lock-style")) {
      const style = document.createElement("style");
      style.id = "eyefans-native-purchase-lock-style";
      style.textContent = [
        `${blockedSelector}{opacity:.72!important;cursor:not-allowed!important}`,
        `${blockedSelector}[aria-disabled='true']{pointer-events:none!important}`
      ].join("");
      document.head.appendChild(style);
    }

    document.addEventListener?.("click", blockNativeClick, true);
    document.addEventListener?.("submit", blockNativeSubmit, true);
    markControls();

    if (typeof MutationObserver === "function") {
      const observer = new MutationObserver(markControls);
      observer.observe?.(document.documentElement, { childList: true, subtree: true });
    }
  }

  function startProductBridge(context) {
    let activeFrame = null;
    const completedResults = new Map();
    const pendingRequests = new Map();

    async function processRequest(request, targetWindow) {
      if (window.top !== window.self) throw new Error("EMBEDDED_PREVIEW_CONTEXT");

      const { target, variantId } = assertTargetConfiguration(context.config, request.selection);

      const fingerprint = fingerprintFor(context.handle, request.selection);
      // A request id is an idempotency key. Never let the same id create a
      // second stored record; an intentional later retry receives a new id
      // and is still checked against authoritative cart state below.
      if (readRecords().some(stored => stored.requestId === request.requestId)) {
        throw new Error("CART_REQUEST_TIMEOUT");
      }

      const record = {
        designId: designIdFor(request.requestId, fingerprint),
        requestId: request.requestId,
        fingerprint,
        handle: context.handle,
        mode: context.config.mode,
        targetHandle: target.handle,
        targetProductId: target.productId,
        variantId,
        selection: canonicalSelection(request.selection),
        status: "pending",
        cartToken: null,
        createdAt: Date.now()
      };

      let zeroBaselineRecordIds = null;
      let addResult;
      try {
        addResult = await addVariantToCart(target, variantId, request.selection.size, {
          onPreflight(beforeQuantity, { canPost, cartToken: sessionCartToken, cartEmpty }) {
            const currentRecords = readRecords();
            const cartCandidates = currentRecords.filter(item => (
              item.variantId === variantId
              && (sessionCartToken === null || mayBelongToCart(item, sessionCartToken))
            ));
            const pendingSafetyScope = cartEmpty ? currentRecords : cartCandidates;
            const recentPendingBlocks = pendingSafetyScope.some(item => (
              item.status === "pending"
              && (!cartEmpty || Date.now() - item.createdAt <= RETRY_GUARD_MS)
            ));
            if (recentPendingBlocks) throw new Error("CART_REQUEST_TIMEOUT");

            // Quantity is a consistency check, never proof that a legacy
            // unbound design belongs to this cart. Resolve ambiguity before POST.
            if (beforeQuantity > 0 && (
              sessionCartToken === null
              || cartCandidates.length !== beforeQuantity
              || cartCandidates.some(item => item.cartToken !== sessionCartToken)
            )) throw new Error("CART_DESIGN_MISMATCH");

            const currentRecent = [...cartCandidates].reverse().find(item => (
              item.fingerprint === fingerprint
              && sessionCartToken !== null
              && item.cartToken === sessionCartToken
              && item.status === "active"
              && Date.now() - item.createdAt <= RETRY_GUARD_MS
            ));
            if (currentRecent && beforeQuantity > 0) {
              const activeDesignCount = cartCandidates.length;
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

            // Keep the exact preflight snapshot. Nothing is retired until the
            // add, quantity delta, and destination cart identity are verified.
            zeroBaselineRecordIds = cartEmpty
              ? new Set(currentRecords.map(item => item.requestId))
              : beforeQuantity === 0
                ? new Set(currentRecords.filter(item => item.variantId === variantId && item.status === "active")
                  .map(item => item.requestId))
                : null;
            // Keep an in-flight add unbound: the session may change during
            // POST. Only the verified postflight identity may bind this record.
            const candidateRecords = [...currentRecords, record];
            if (buildNoteBlock(candidateRecords).length > MAX_NOTE_LENGTH - 300) {
              throw new Error("TOO_MANY_DESIGNS");
            }
            try {
              writeRecords(candidateRecords);
            } catch (error) {
              if (error?.message === "TOO_MANY_DESIGNS") throw error;
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
          designId: addResult.record.designId
        };
      }

      const receipt = addResult.receipt;
      const storedQuantity = Number(receipt?.quantity) >= 1 ? Number(receipt.quantity) : 1;
      const storedCartItemId = receipt?.cart_item_id || `${variantId}_normal_`;

      try {
        const records = readRecords();
        const pendingRecord = records.find(item => item.requestId === request.requestId && item.status === "pending");
        if (!pendingRecord) throw new Error("STORAGE_UNAVAILABLE");
        const activatedRecord = {
          ...pendingRecord,
          status: "active",
          cartToken: addResult.cartToken,
          receipt: {
            variantId: String(variantId),
            cartItemId: storedCartItemId,
            quantity: storedQuantity,
            cartQuantityBefore: addResult.beforeQuantity,
            cartQuantityAfter: addResult.afterQuantity,
            verifiedByCartDelta: addResult.verifiedByCartDelta === true,
            verifiedAt: Date.now()
          }
        };
        const reconciledRecords = records.flatMap(item => {
          if (item.requestId === request.requestId) return [activatedRecord];
          if (!zeroBaselineRecordIds?.has(item.requestId)) {
            return [item];
          }
          if (item.cartToken === addResult.cartToken) return [];
          if (item.cartToken !== null) return [item]; // Other carts remain untouched.
          // An unbound legacy record may belong to another cart. Preserve it,
          // but permanently exclude it from this verified zero-baseline cart.
          const excludedCartTokens = [...new Set([...(item.excludedCartTokens || []), addResult.cartToken])];
          const excludedRecord = { ...item, excludedCartTokens };
          if (!validCartExclusions(excludedRecord)) throw new Error("STORAGE_UNAVAILABLE");
          return [excludedRecord];
        });
        writeRecords(reconciledRecords);
      } catch (error) {
        throw new Error("CART_DESIGN_SAVE_FAILED");
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
        designId: record.designId
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
        sendResult(event.source, requestId, { ok: false, message: publicErrorMessage(error) });
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
        .catch(error => ({ ok: false, message: publicErrorMessage(error) }))
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
    let checkoutInFlight = false;
    let allowNextCheckout = false;
    let allowNextSubmit = false;
    let cartMutationVersion = 0;
    let syncRunVersion = 0;
    let lastVerifiedMutationVersion = -1;
    let lastVerifiedCartSignature = null;
    let cartMutationPending = false;
    let activeCartFetchController = null;
    let cancelActiveSyncDelay = null;

    function ensureStyles() {
      if (document.getElementById("eyefans-cart-production-style")) return;
      const style = document.createElement("style");
      style.id = "eyefans-cart-production-style";
      style.textContent = [
        "#eyefans-cart-design-summary{margin:12px 0;padding:14px 16px;border:1px solid #d8cdbb;border-radius:12px;background:#fffaf1;color:#173f36;line-height:1.65}",
        "#eyefans-cart-design-summary strong{display:block;margin-bottom:6px}",
        "#eyefans-cart-design-summary pre{margin:0;white-space:pre-wrap;font:inherit}",
        "#eyefans-cart-design-summary[data-state='error']{border-color:#c34d35;background:#fff3ef;color:#8b2f20}",
        "#checkout-button[data-eyefans-blocked='1'],.floating-checkout-button button[data-eyefans-blocked='1']{opacity:.55;cursor:not-allowed}"
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
        (note?.parentElement || document.querySelector(CHECKOUT_BUTTON_SELECTOR)?.parentElement || document.body)
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
      const buttons = Array.from(document.querySelectorAll(CHECKOUT_BUTTON_SELECTOR));
      buttons.forEach(button => {
        if (blocked) {
          button.dataset.eyefansBlocked = "1";
          button.setAttribute("aria-disabled", "true");
        } else {
          delete button.dataset.eyefansBlocked;
          button.removeAttribute("aria-disabled");
        }
      });
    }

    function currentDomCartSnapshot() {
      const allRows = Array.from(document.querySelectorAll(CART_LINE_ITEM_SELECTOR));
      const visibleRows = allRows.filter(row => {
        if (row?.hidden === true || row?.getAttribute?.("aria-hidden") === "true") return false;
        if (typeof row?.getClientRects === "function") return row.getClientRects().length > 0;
        return true;
      });
      // Checkout v3 can keep a hidden desktop/mobile copy in the DOM. Prefer
      // the rendered layout; if layout information is not available yet,
      // retain all rows and let the authoritative row-count check fail closed.
      const rows = visibleRows.length > 0 ? visibleRows : allRows;
      const quantities = [];
      let totalQuantity = 0;
      let missingQuantityCount = 0;
      for (const row of rows) {
        const quantityInput = row?.querySelector?.('[data-testid="quantity-input"]');
        if (!quantityInput) {
          // Gift/non-adjustable rows may intentionally omit a quantity input.
          // Their identity and quantity still come only from /cart.json.
          quantities.push("?");
          missingQuantityCount += 1;
          continue;
        }
        const quantity = Number(quantityInput?.value);
        if (!Number.isInteger(quantity) || quantity < 1) return null;
        quantities.push(quantity);
        totalQuantity += quantity;
      }
      return {
        rowCount: rows.length,
        totalQuantity,
        missingQuantityCount,
        // This signature is deliberately identity-free. DOM order cannot
        // safely identify a CYBERBIZ variant, so identity always comes from
        // /cart.json below; the DOM is used only to prove rendering stability.
        signature: `${rows.length}:${quantities.join(",")}`
      };
    }

    function parseAuthoritativeCartPayload(payload) {
      if (
        !isPlainObject(payload)
        || !Array.isArray(payload.items)
        || !Number.isInteger(Number(payload.item_count))
        || Number(payload.item_count) < 0
      ) return null;

      const quantities = new Map();
      const allQuantities = new Map();
      let totalQuantity = 0;
      for (const item of payload.items) {
        if (!isPlainObject(item)) return null;
        const variantId = String(item.variant_id_int ?? "");
        const quantity = Number(item.quantity);
        if (!/^\d+$/.test(variantId) || !Number.isInteger(quantity) || quantity < 1) return null;
        totalQuantity += quantity;
        allQuantities.set(variantId, (allQuantities.get(variantId) || 0) + quantity);
        if (!ALL_CUSTOM_VARIANT_IDS.has(variantId)) continue;
        quantities.set(variantId, (quantities.get(variantId) || 0) + quantity);
      }

      const rowCount = payload.items.length;
      const itemCount = Number(payload.item_count);
      if (itemCount !== rowCount && itemCount !== totalQuantity) return null;
      if (Object.prototype.hasOwnProperty.call(payload, "total_quantity")) {
        const reportedTotalQuantity = Number(payload.total_quantity);
        if (!Number.isInteger(reportedTotalQuantity) || reportedTotalQuantity !== totalQuantity) return null;
      }

      const signature = Array.from(allQuantities.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([variantId, quantity]) => `${variantId}:${quantity}`)
        .join("|");
      return { invalid: false, quantities, rowCount, totalQuantity, signature };
    }

    async function fetchAuthoritativeCartState(expectedMutationVersion, expectedSyncRunVersion) {
      const endpoint = new URL(CART_JSON_PATH, window.location.origin);
      if (endpoint.origin !== STOREFRONT_ORIGIN || endpoint.pathname !== CART_JSON_PATH) return null;
      const controller = new AbortController();
      activeCartFetchController = controller;
      const timeout = window.setTimeout(() => controller.abort(), CART_SYNC_FETCH_TIMEOUT_MS);
      try {
        const response = await window.fetch(endpoint.href, {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          cache: "no-store",
          redirect: "error",
          signal: controller.signal
        });
        if (
          expectedMutationVersion !== cartMutationVersion
          || expectedSyncRunVersion !== syncRunVersion
          || !response.ok
          || response.redirected !== false
          || !/^application\/json(?:\s*;|$)/i.test(response.headers?.get?.("content-type") || "")
        ) return null;
        let payload;
        try {
          payload = JSON.parse(await response.text());
        } catch (error) {
          return null;
        }
        if (
          expectedMutationVersion !== cartMutationVersion
          || expectedSyncRunVersion !== syncRunVersion
        ) return null;
        return parseAuthoritativeCartPayload(payload);
      } catch (error) {
        return null;
      } finally {
        window.clearTimeout(timeout);
        if (activeCartFetchController === controller) activeCartFetchController = null;
      }
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

    function blockUnverifiedDesigns(message) {
      setCheckoutBlocked(true);
      const note = document.querySelector('textarea[name="order[note]"]');
      if (note) updateNoteValue(note, stripExistingNoteBlock(note.value || ""));
      renderPanel("", message);
      return true;
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
        const eligibleUnboundRecords = unboundRecords.filter(record => mayBelongToCart(record, activeCartToken));
        const boundCurrentRecords = allRecords.filter(record => record.cartToken === activeCartToken);
        let records = [...boundCurrentRecords, ...eligibleUnboundRecords];

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
          const manualNote = note ? stripExistingNoteBlock(note.value || "") : "";
          if (note) updateNoteValue(note, manualNote);
          // An active unbound record was created on the product page before
          // CYBERBIZ exposed a /carts/:token URL. It may belong to another
          // cart, so an empty current cart must not discard it.
          writeRecords([...foreignCartRecords, ...unboundRecords]);
          lastVerifiedNoteValue = manualNote;
          setCheckoutBlocked(false);
          document.getElementById("eyefans-cart-design-summary")?.remove();
          return true;
        }

        if (records.some(record => record.status === "pending")) {
          return blockUnverifiedDesigns("客製商品的加入結果仍未確認，為避免套用錯誤的製作資料，目前暫停結帳。請先確認購物車並聯絡客服，不要重複加入。");
        }

        const mismatches = [];
        quantities.forEach((quantity, variantId) => {
          const candidates = records.filter(record => record.variantId === variantId);
          const designCount = candidates.length;
          // Do not choose a subset or bind legacy records merely because their
          // count happens to fill the cart. Identity must have been verified at add.
          if (designCount !== quantity || candidates.some(record => record.cartToken !== activeCartToken)) {
            mismatches.push({ variantId, quantity, designCount });
          }
        });

        if (mismatches.length) {
          const details = mismatches.map(item => (
            `款式 ${item.variantId}：購物車 ${item.quantity} 件／客製設計 ${item.designCount} 筆`
          )).join("\n");
          const message = `客製商品與設計資料無法明確對應。\n${details}\n請刪除此客製商品，再回商品頁由模擬器重新加入；為避免製作錯誤，目前暫停結帳。`;
          return blockUnverifiedDesigns(message);
        }

        records = boundCurrentRecords.filter(record => quantities.has(record.variantId));
        writeRecords([...foreignCartRecords, ...unboundRecords, ...records]);

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

    function showUpdatingMessage(message = "正在確認最新購物車與客製製作資料，請稍候。") {
      setCheckoutBlocked(true);
      renderPanel("", message);
    }

    function waitForSyncDelay(delay) {
      if (delay <= 0) return Promise.resolve();
      return new Promise(resolve => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          if (cancelActiveSyncDelay === cancel) cancelActiveSyncDelay = null;
          resolve();
        }, delay);
        const cancel = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          if (cancelActiveSyncDelay === cancel) cancelActiveSyncDelay = null;
          resolve();
        };
        cancelActiveSyncDelay = cancel;
      });
    }

    async function settleAndSync(expectedMutationVersion, expectedSyncRunVersion, requireChangedCart) {
      let previousDomSignature = null;
      let stableDomSamples = 0;

      for (const delay of CART_SYNC_RETRY_DELAYS_MS) {
        await waitForSyncDelay(delay);
        if (
          expectedMutationVersion !== cartMutationVersion
          || expectedSyncRunVersion !== syncRunVersion
        ) return false;

        const domSnapshot = currentDomCartSnapshot();
        if (!domSnapshot) {
          previousDomSignature = null;
          stableDomSamples = 0;
          continue;
        }
        if (domSnapshot.signature === previousDomSignature) stableDomSamples += 1;
        else {
          previousDomSignature = domSnapshot.signature;
          stableDomSamples = 1;
        }
        if (stableDomSamples < CART_DOM_STABLE_SAMPLES) continue;

        const cartState = await fetchAuthoritativeCartState(
          expectedMutationVersion,
          expectedSyncRunVersion
        );
        if (!cartState) continue;
        if (
          cartState.rowCount !== domSnapshot.rowCount
          || (
            domSnapshot.missingQuantityCount === 0
              ? cartState.totalQuantity !== domSnapshot.totalQuantity
              : cartState.totalQuantity < domSnapshot.totalQuantity + domSnapshot.missingQuantityCount
          )
        ) continue;
        // A click on a quantity/delete control happens before Checkout v3's
        // AJAX response. Do not accept the old, still-stable cart merely
        // because it survived the first two samples; wait until the exact
        // /cart.json identity has actually changed from the last verified cart.
        if (
          requireChangedCart
          && (
            lastVerifiedCartSignature === null
            || cartState.signature === lastVerifiedCartSignature
          )
        ) continue;

        const reconciled = reconcile(cartState);
        if (
          expectedMutationVersion !== cartMutationVersion
          || expectedSyncRunVersion !== syncRunVersion
        ) return false;
        if (!reconciled || checkoutBlocked) return false;
        lastVerifiedMutationVersion = expectedMutationVersion;
        lastVerifiedCartSignature = cartState.signature;
        if (requireChangedCart) cartMutationPending = false;
        return true;
      }

      if (
        expectedMutationVersion === cartMutationVersion
        && expectedSyncRunVersion === syncRunVersion
      ) {
        renderPanel("", "購物車內容仍在更新，或目前無法取得最新購物車資料。為避免客製資料錯置，已暫停結帳；請稍候後再試，若持續發生請重新整理頁面。");
        setCheckoutBlocked(true);
      }
      return false;
    }

    function startSyncRun(requireChangedCart) {
      cancelActiveSyncDelay?.();
      cancelActiveSyncDelay = null;
      activeCartFetchController?.abort();
      activeCartFetchController = null;
      const expectedMutationVersion = cartMutationVersion;
      const expectedSyncRunVersion = ++syncRunVersion;
      showUpdatingMessage();
      return settleAndSync(
        expectedMutationVersion,
        expectedSyncRunVersion,
        requireChangedCart || cartMutationPending
      );
    }

    function scheduleSync(requireChangedCart = false) {
      startSyncRun(requireChangedCart).catch(() => {
        if (lastVerifiedMutationVersion === cartMutationVersion) return;
        renderPanel("", "目前無法讀取購物車內容。為避免客製資料遺失，已暫停結帳；請重新整理頁面後再試。");
        setCheckoutBlocked(true);
      });
    }

    function markCartMutation() {
      cartMutationVersion += 1;
      cartMutationPending = true;
      scheduleSync(true);
    }

    function notifyCartUpdate() {
      cartMutationVersion += 1;
      // Observer/change/lifecycle signals arrive after the UI update. If an
      // earlier action intent is still pending, startSyncRun keeps its
      // require-change baseline; a late duplicate signal after successful
      // verification may safely re-verify the same exact cart.
      scheduleSync(false);
    }

    function scrollToStatusPanel() {
      document.getElementById("eyefans-cart-design-summary")?.scrollIntoView?.({ block: "center" });
    }

    function freshCheckoutButton(originalButton) {
      const wantsDesktop = originalButton?.id === "checkout-button";
      const candidates = Array.from(document.querySelectorAll(CHECKOUT_BUTTON_SELECTOR));
      return candidates.find(button => (
        button?.isConnected !== false
        && (button.id === "checkout-button") === wantsDesktop
        && button.disabled !== true
        && button.dataset?.eyefansBlocked !== "1"
        && button.getAttribute?.("aria-disabled") !== "true"
      )) || null;
    }

    document.addEventListener("click", event => {
      const checkoutButton = event.target.closest?.(CHECKOUT_BUTTON_SELECTOR);
      if (checkoutButton) {
        if (allowNextCheckout) {
          allowNextCheckout = false;
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        if (checkoutInFlight) return;
        checkoutInFlight = true;
        startSyncRun(false).then(synced => {
          checkoutInFlight = false;
          if (synced && !checkoutBlocked && lastVerifiedMutationVersion === cartMutationVersion) {
            const freshButton = freshCheckoutButton(checkoutButton);
            if (!freshButton) {
              setCheckoutBlocked(true);
              scrollToStatusPanel();
              return;
            }
            try {
              allowNextCheckout = true;
              allowNextSubmit = true;
              freshButton.click();
            } catch (error) {
              setCheckoutBlocked(true);
              scrollToStatusPanel();
            } finally {
              // React may replace the button or a theme click handler may
              // throw. Never leave a one-shot bypass for a later real click.
              allowNextCheckout = false;
              allowNextSubmit = false;
            }
            return;
          }
          scrollToStatusPanel();
        }).catch(() => {
          checkoutInFlight = false;
          setCheckoutBlocked(true);
          scrollToStatusPanel();
        });
        return;
      }
      const cartAction = event.target.closest?.(".delete-button, .quantity-group button");
      if (
        cartAction
        && cartAction.disabled !== true
        && cartAction.getAttribute?.("aria-disabled") !== "true"
      ) {
        markCartMutation();
      }
    }, true);
    document.addEventListener("submit", event => {
      const form = event.target;
      const checkoutButton = form?.querySelector?.(CHECKOUT_BUTTON_SELECTOR)
        || document.querySelector(CHECKOUT_BUTTON_SELECTOR);
      if (!checkoutButton || (form?.contains && !form.contains(checkoutButton))) return;
      if (allowNextSubmit) {
        allowNextSubmit = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (checkoutInFlight) return;
      checkoutInFlight = true;
      startSyncRun(false).then(synced => {
        checkoutInFlight = false;
        if (synced && !checkoutBlocked && lastVerifiedMutationVersion === cartMutationVersion) {
          const freshButton = freshCheckoutButton(checkoutButton);
          if (!freshButton) {
            setCheckoutBlocked(true);
            scrollToStatusPanel();
            return;
          }
          const freshForm = freshButton.form
            || freshButton.closest?.("form")
            || (form?.isConnected !== false ? form : null);
          try {
            if (typeof freshForm?.requestSubmit === "function") {
              allowNextSubmit = true;
              freshForm.requestSubmit(freshButton);
            } else {
              allowNextCheckout = true;
              allowNextSubmit = true;
              freshButton.click();
            }
          } catch (error) {
            setCheckoutBlocked(true);
            scrollToStatusPanel();
          } finally {
            allowNextCheckout = false;
            allowNextSubmit = false;
          }
          return;
        }
        scrollToStatusPanel();
      }).catch(() => {
        checkoutInFlight = false;
        setCheckoutBlocked(true);
        scrollToStatusPanel();
      });
    }, true);
    document.addEventListener("change", event => {
      if (event.target.matches?.('[data-testid="quantity-input"]')) {
        notifyCartUpdate();
      }
    }, true);

    function nodeTouchesCartControls(node) {
      if (!node || typeof node !== "object") return false;
      const selector = `${CART_LINE_ITEM_SELECTOR}, .quantity-group, .delete-button, [data-testid="quantity-input"]`;
      return Boolean(node.matches?.(selector) || node.querySelector?.(selector));
    }

    function mutationsTouchCartControls(mutations) {
      return Array.from(mutations || []).some(mutation => {
        if (mutation.type === "attributes") return nodeTouchesCartControls(mutation.target);
        if (mutation.type !== "childList") return false;
        return Array.from(mutation.addedNodes || []).some(nodeTouchesCartControls)
          || Array.from(mutation.removedNodes || []).some(nodeTouchesCartControls);
      });
    }

    // Watch only cart-row/control changes. Note/panel writes are outside this
    // filter, so reconciliation cannot recursively trigger itself.
    if (typeof MutationObserver === "function") {
      const cartObserver = new MutationObserver(mutations => {
        if (mutationsTouchCartControls(mutations)) notifyCartUpdate();
      });
      const observerTarget = document.body || document.documentElement;
      if (observerTarget && typeof cartObserver.observe === "function") {
        cartObserver.observe(observerTarget, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["value"]
        });
      }
    }

    // CYBERBIZ Checkout v3 emits these lifecycle events. Native click/change
    // listeners remain as a defensive fallback, while these hooks resync
    // after React has replaced or updated the cart controls.
    if (typeof window.jQuery === "function") {
      window.jQuery(document).on(
        "checkout_cart:added.eyefansCartProduction",
        () => notifyCartUpdate()
      );
      window.jQuery(document).on(
        "checkout_cart:ready.eyefansCartProduction checkout_cart:logined.eyefansCartProduction",
        () => {
          cartMutationVersion += 1;
          scheduleSync(false);
        }
      );
      // Checkout v3 serializes the form before this event. Copy the last
      // reconciled value into that final payload as a defense against a React
      // rerender between reconciliation and CYBERBIZ's order request.
      window.jQuery(document).on(
        "checkout_cart:checkout.eyefansCartProduction",
        (event, payload) => {
          if (
            checkoutBlocked
            || lastVerifiedMutationVersion !== cartMutationVersion
            || typeof lastVerifiedNoteValue !== "string"
            || !isPlainObject(payload)
          ) {
            event?.preventDefault?.();
            event?.stopImmediatePropagation?.();
            return false;
          }
          payload['order[note]'] = lastVerifiedNoteValue;
          const note = document.querySelector('textarea[name="order[note]"]');
          if (note) updateNoteValue(note, lastVerifiedNoteValue);
          return undefined;
        }
      );
    }

    function start() {
      scheduleSync(false);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }
})();
