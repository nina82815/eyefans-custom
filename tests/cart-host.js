(function cartHostHarness() {
  "use strict";

  const SCHEMA_VERSION = 1;
  const CHANGE_TYPE = "eyefans-customizer-change";
  const SUBMIT_TYPE = "eyefans-customizer-submit";
  const RESULT_TYPE = "eyefans-customizer-cart-result";
  const EXPECTED_MODE = "uv";
  const ALLOWED_MODES = new Set(["color", "engraving", "uv"]);
  const ALLOWED_SIZES = new Set(["XS", "S", "M", "L"]);
  const ALLOWED_VIEWS = new Set(["front", "side", "a45"]);
  const ALLOWED_RENDER_MODES = new Set(["photo", "model"]);
  const ALLOWED_PRINT_MODES = new Set(["none", "name", "icon", "both"]);
  const ALLOWED_TEXT_COLORS = new Set(["black", "white", "rainbow"]);
  const ALLOWED_FONTS = new Set(["zhBold", "zhRounded", "purpleSmile", "baksoSapi"]);
  const ALLOWED_CASE_MODES = new Set(["preserve", "upper", "lower"]);
  const ALLOWED_ORDERS = new Set(["normal", "reverse"]);
  const ALLOWED_NAME_POSITIONS = new Set(["before", "center", "after"]);
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

  // Fake IDs intentionally differ from the production bridge configuration.
  const TEST_VARIANTS = Object.freeze({
    color: Object.freeze({ XS: "MOCK-COLOR-XS", S: "MOCK-COLOR-S", M: "MOCK-COLOR-M", L: "MOCK-COLOR-L" }),
    engraving: Object.freeze({ XS: "MOCK-ENGRAVING-XS", S: "MOCK-ENGRAVING-S", M: "MOCK-ENGRAVING-M", L: "MOCK-ENGRAVING-L" }),
    uv: Object.freeze({ XS: "MOCK-UV-XS", S: "MOCK-UV-S", M: "MOCK-UV-M", L: "MOCK-UV-L" })
  });

  const frame = document.getElementById("customizer-frame");
  const frameStatus = document.getElementById("frame-status");
  const expectedOriginOutput = document.getElementById("expected-origin");
  const latestSummary = document.getElementById("latest-summary");
  const simulationResult = document.getElementById("simulation-result");
  const messageLog = document.getElementById("message-log");
  const clearLogButton = document.getElementById("clear-log");
  const frameUrl = new URL(frame.getAttribute("src"), window.location.href);
  const expectedOrigin = frameUrl.origin;

  expectedOriginOutput.textContent = expectedOrigin;

  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function assertExactKeys(value, allowedKeys, label) {
    const unexpected = Object.keys(value).filter(key => !allowedKeys.has(key));
    if (unexpected.length) throw new Error(`${label} 包含未允許欄位：${unexpected.join(", ")}`);
  }

  function assertString(value, label, maximumLength, allowEmpty = false) {
    if (typeof value !== "string") throw new Error(`${label} 必須是字串`);
    if (!allowEmpty && !value.trim()) throw new Error(`${label} 不可為空`);
    if (value.length > maximumLength) throw new Error(`${label} 超過 ${maximumLength} 字元`);
  }

  function assertNullableEnum(value, allowed, label) {
    if (value !== null && !allowed.has(value)) throw new Error(`${label} 值不合法`);
  }

  function assertNullableString(value, label, maximumLength) {
    if (value !== null) assertString(value, label, maximumLength, true);
  }

  function validateSelection(selection) {
    if (!isPlainObject(selection)) throw new Error("selection 必須是純物件");
    assertExactKeys(selection, ALLOWED_SELECTION_KEYS, "selection");

    if (!ALLOWED_MODES.has(selection.customizationMode)) throw new Error("customizationMode 不合法");
    if (!ALLOWED_SIZES.has(selection.size)) throw new Error("size 不合法");
    if (selection.customizationModeLocked !== true) throw new Error("測試頁要求 locked=1");
    if (selection.customizationMode !== EXPECTED_MODE) throw new Error(`模式應為 ${EXPECTED_MODE}`);

    assertString(selection.customizationModeLabel, "customizationModeLabel", 80);
    assertString(selection.frame, "frame", 80);
    assertString(selection.temple, "temple", 80);
    assertString(selection.lens, "lens", 80);
    assertString(selection.lensId, "lensId", 80);
    assertString(selection.summary, "summary", 1200);

    if (!ALLOWED_VIEWS.has(selection.view)) throw new Error("view 不合法");
    if (!ALLOWED_RENDER_MODES.has(selection.renderMode)) throw new Error("renderMode 不合法");
    if (!ALLOWED_PRINT_MODES.has(selection.printMode)) throw new Error("printMode 不合法");
    assertNullableEnum(selection.uvPrintMode, ALLOWED_PRINT_MODES, "uvPrintMode");
    assertNullableString(selection.icon1, "icon1", 8);
    assertNullableString(selection.icon2, "icon2", 8);
    assertString(selection.name, "name", 40, true);
    assertNullableEnum(selection.textColor, ALLOWED_TEXT_COLORS, "textColor");
    assertNullableEnum(selection.font, ALLOWED_FONTS, "font");
    assertNullableEnum(selection.caseMode, ALLOWED_CASE_MODES, "caseMode");
    assertNullableEnum(selection.order, ALLOWED_ORDERS, "order");
    assertNullableEnum(selection.namePosition, ALLOWED_NAME_POSITIONS, "namePosition");
    assertNullableString(selection.customizationSide, "customizationSide", 20);
    assertNullableString(selection.customizationSideLabel, "customizationSideLabel", 80);

    return selection;
  }

  function validateRequestEnvelope(data) {
    if (!isPlainObject(data)) throw new Error("訊息必須是純物件");
    assertExactKeys(data, new Set(["type", "schemaVersion", "requestId", "selection"]), "送出訊息");
    if (data.type !== SUBMIT_TYPE) throw new Error("type 不符合送出契約");
    if (data.schemaVersion !== SCHEMA_VERSION) throw new Error("schemaVersion 不支援");
    if (typeof data.requestId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(data.requestId)) {
      throw new Error("requestId 格式不合法");
    }
    return data.requestId;
  }

  function formatLog(direction, payload) {
    return `[${new Date().toLocaleTimeString("zh-TW", { hour12: false })}] ${direction}\n${JSON.stringify(payload, null, 2)}\n\n`;
  }

  function appendLog(direction, payload) {
    if (messageLog.textContent === "等待 postMessage…") messageLog.textContent = "";
    messageLog.textContent = formatLog(direction, payload) + messageLog.textContent;
  }

  function postResult(targetWindow, requestId, result) {
    const payload = {
      type: RESULT_TYPE,
      schemaVersion: SCHEMA_VERSION,
      requestId,
      ...result
    };
    targetWindow.postMessage(payload, expectedOrigin);
    appendLog("父頁 → iframe", payload);
  }

  function handleSelectionChange(data) {
    if (!isPlainObject(data) || data.type !== CHANGE_TYPE || !isPlainObject(data.selection)) return;

    try {
      validateSelection(data.selection);
      latestSummary.textContent = data.selection.summary;
      appendLog("iframe → 父頁（選擇更新）", data);
    } catch (error) {
      appendLog("拒絕不合法的選擇更新", { reason: error.message, received: data });
    }
  }

  function handleSubmit(event) {
    let requestId;

    try {
      requestId = validateRequestEnvelope(event.data);
    } catch (error) {
      appendLog("拒絕不合法的送出訊息", { reason: error.message, received: event.data });
      return;
    }

    appendLog("iframe → 父頁（加入購物車）", event.data);

    try {
      const selection = validateSelection(event.data.selection);
      const variantId = TEST_VARIANTS[selection.customizationMode]?.[selection.size];
      if (!variantId) throw new Error("找不到模式與尺寸對應的測試款式 ID");

      window.setTimeout(() => {
        if (simulationResult.value === "error") {
          postResult(event.source, requestId, {
            ok: false,
            message: "測試錯誤：CYBERBIZ 暫時無法加入購物車。"
          });
          return;
        }

        postResult(event.source, requestId, {
          ok: true,
          message: `測試成功：${selection.customizationMode}/${selection.size} → ${variantId}`,
          cartUrl: new URL("#mock-cart", window.location.href).href
        });
      }, 450);
    } catch (error) {
      postResult(event.source, requestId, {
        ok: false,
        message: `測試驗證失敗：${error.message}`
      });
    }
  }

  window.addEventListener("message", event => {
    if (event.origin !== expectedOrigin) {
      appendLog("拒絕錯誤 origin", { expected: expectedOrigin, received: event.origin });
      return;
    }
    if (event.source !== frame.contentWindow) {
      appendLog("拒絕錯誤 source", { receivedType: event.data?.type || null });
      return;
    }

    if (event.data?.type === CHANGE_TYPE) {
      handleSelectionChange(event.data);
      return;
    }
    if (event.data?.type === SUBMIT_TYPE) handleSubmit(event);
  });

  frame.addEventListener("load", () => {
    frameStatus.textContent = "模擬器已載入";
    frameStatus.dataset.state = "ready";
    appendLog("父頁", { message: "iframe load", src: frameUrl.href });
  });

  frame.addEventListener("error", () => {
    frameStatus.textContent = "模擬器載入失敗";
    frameStatus.dataset.state = "error";
  });

  clearLogButton.addEventListener("click", () => {
    messageLog.textContent = "等待 postMessage…";
  });
})();
