const FRAME_COLORS = [
  // Screen-preview midtones calibrated from the 2026 front-view product photos.
  { name: "櫻花粉", value: "#e8b4bf" },
  { name: "粉紫", value: "#c3b3c8" },
  { name: "暖黃", value: "#d5c452" },
  { name: "豆綠", value: "#919871" },
  { name: "深藍", value: "#2b4261" },
  { name: "復刻粉", value: "#c87da9" },
  { name: "芋頭紫", value: "#b48bbe" },
  { name: "奶油黃", value: "#ddaa5b" },
  { name: "薄荷綠", value: "#658987" },
  { name: "丹寧藍", value: "#506799" },
  { name: "梅子", value: "#a77c90" },
  { name: "奶茶", value: "#ddb89d" },
  { name: "青釉綠", value: "#485b50" },
  { name: "天藍", value: "#2285ac" },
  { name: "玫瑰", value: "#9c5354" },
  { name: "咖啡牛奶", value: "#8f8079" },
  { name: "枯黃", value: "#9c8d6c" },
  { name: "霧面黑", value: "#0f0f10" },
  { name: "灰色", value: "#717171" },
  { name: "咖啡紅茶", value: "#834c4c" },
  { name: "霧面白", value: "#ffffff" },
  { name: "琥珀", type: "pattern", value: "amber", thumb: "amber.png" }
];

const TEMPLE_COLORS = FRAME_COLORS.map(color => ({ ...color }));

const SIZE_OPTIONS = [
  { name: "XS", headCircumference: "41–44 cm" },
  { name: "S", headCircumference: "46–49 cm" },
  { name: "M", headCircumference: "50–53 cm" },
  { name: "L", headCircumference: "54–56 cm" }
];

const ALL_COLOR_NAMES = FRAME_COLORS.map(color => color.name);
const SIZE_COLOR_AVAILABILITY = {
  XS: new Set(ALL_COLOR_NAMES),
  S: new Set(ALL_COLOR_NAMES),
  M: new Set(ALL_COLOR_NAMES),
  L: new Set([
    "櫻花粉",
    "粉紫",
    "芋頭紫",
    "奶油黃",
    "奶茶",
    "青釉綠",
    "玫瑰",
    "咖啡牛奶",
    "霧面黑",
    "灰色",
    "咖啡紅茶",
    "霧面白",
    "琥珀"
  ])
};

const LENS_COLORS = [
  {
    id: "gray",
    name: "三號灰片",
    value: "rgba(25,25,28,.78)",
    swatch: "rgba(25,25,28,.78)",
    photoFill: "transparent"
  },
  {
    id: "blue-tea",
    name: "抗藍光鏡片",
    value: "rgba(180,150,90,.38)",
    swatch: "rgba(180,150,90,.55)",
    photoFill: "rgba(222,181,92,.38)"
  }
];

const VIEW_FILES = {
  front: "front.svg",
  side: "side.svg",
  a45: "a45.svg"
};

const PHOTO_ASSETS = {
  "櫻花粉": {
    front: "assets/photos/sakura-front.png",
    a45: "assets/photos/sakura-a45.png"
  },
  "霧面白": {
    front: "assets/photos/white-front.png",
    a45: "assets/photos/white-a45.png"
  },
  "琥珀": {
    front: "assets/photos/amber-front-original.png",
    a45: "assets/photos/amber-a45-original.png"
  }
};

const DEFAULT_PHOTO_COLOR = "櫻花粉";
const TEXT_COLOR_OPTIONS = {
  black: { label: "黑色", fill: "#171817", stroke: "none", outlineWidth: "0" },
  white: { label: "白色", fill: "#fffdf8", stroke: "#111111", outlineWidth: "0.5pt" },
  rainbow: { label: "逐字彩色", fill: "#e66d3f", stroke: "#111111", outlineWidth: "0.5pt" }
};

const ENGRAVING_TEXT_STYLE = {
  label: "白色雷雕示意",
  fill: "#fffdf8",
  stroke: "none",
  outlineWidth: "0"
};

const CUSTOMIZATION_MODES = {
  color: { label: "框腳配色", shortLabel: "純配色" },
  engraving: { label: "框腳配色＋雷雕", shortLabel: "白色雷雕" },
  uv: { label: "框腳配色＋UV 彩印", shortLabel: "UV 彩印" }
};

const RAINBOW_PRINT_COLORS = ["#ef6a4b", "#efbd3f", "#63a56f", "#43a5bd", "#8b72c7", "#df6f99"];

const MODE_NAMES = {
  both: "2 圖＋名字",
  icon: "只要 2 圖",
  name: "只要名字",
  none: "不加印刷"
};

const PRINT_FONTS = {
  zhBold: {
    label: "中文粗體",
    family: '"eYeFans Tsuhsian", "eYeFans GenSen Rounded", "PingFang TC", sans-serif',
    weight: "700",
    uppercaseWidth: .496,
    lowercaseWidth: .430,
    hanWidth: .708
  },
  zhRounded: {
    label: "中文圓體",
    family: '"eYeFans GenSen Rounded", "PingFang TC", sans-serif',
    weight: "700",
    uppercaseWidth: .668,
    lowercaseWidth: .566,
    hanWidth: 1
  },
  purpleSmile: {
    label: "圓潤手寫體",
    family: '"eYeFans Purple Smile", "eYeFans GenSen Rounded", "PingFang TC", sans-serif',
    weight: "400",
    uppercaseWidth: .655,
    lowercaseWidth: .585,
    hanWidth: 1
  },
  baksoSapi: {
    label: "童趣積木體",
    family: '"eYeFans Bakso Sapi", "eYeFans GenSen Rounded", "PingFang TC", sans-serif',
    weight: "400",
    uppercaseWidth: .647,
    lowercaseWidth: .637,
    hanWidth: 1
  }
};

const ENGLISH_FONT_KEYS = new Set(["purpleSmile", "baksoSapi"]);
const MESSAGE_SCHEMA_VERSION = 1;
const STOREFRONT_ORIGIN = "https://www.eyefans.com.tw";
const CART_RESULT_TIMEOUT_MS = 18000;
const CART_IDLE_MESSAGE = "測試串接模式：商品頁會接收本次設計資料。";

const state = {
  customizationMode: "uv",
  customizationModeLocked: false,
  size: "M",
  view: "a45",
  renderMode: "photo",
  frame: FRAME_COLORS[0],
  temple: TEMPLE_COLORS[0],
  lens: LENS_COLORS[0],
  printMode: "both",
  icon1: "01",
  icon2: "04",
  activeIconSlot: "icon1",
  nameSource: "PEIYU",
  name: "PEIYU",
  textColor: "white",
  font: "baksoSapi",
  caseMode: "preserve",
  order: "normal",
  namePosition: "center"
};

const customizationDrafts = {
  uv: { nameSource: "PEIYU", font: "baksoSapi", caseMode: "preserve" },
  engraving: { nameSource: null, font: "baksoSapi", caseMode: "preserve" }
};

let nameValidationMessage = "";

const svgs = {};
const printLayers = {};
const photoLayers = {};
let textMeasureContext;
let pendingCartRequestId = null;
let pendingCartSelectionFingerprint = null;
let lastAddedSelectionFingerprint = null;
let cartResultTimer = null;
let cartLockedControlStates = [];
const deferredModelColors = { frame: null, temple: null };
let deferredModelView = null;
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const PRINT_CENTER_OFFSET = { front: 0, side: 15, a45: 30 };
const MAX_PRINT_WIDTH = { side: 205, a45: 112 };

function svgElement(tag) {
  return document.createElementNS(SVG_NS, tag);
}

function setSvgHref(element, href) {
  element.setAttribute("href", href);
  element.setAttributeNS(XLINK_NS, "xlink:href", href);
}

function ensureAmberPattern(svg, key) {
  const patternId = `amberPattern-${key}`;
  let pattern = svg.querySelector(`#${patternId}`) || svg.querySelector("#amberPattern");
  let defs = svg.querySelector("defs");

  if (!defs) {
    defs = svgElement("defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  if (!pattern) {
    pattern = svgElement("pattern");
    defs.appendChild(pattern);
  }

  pattern.setAttribute("id", patternId);
  pattern.setAttribute("patternUnits", "objectBoundingBox");
  pattern.setAttribute("width", "1");
  pattern.setAttribute("height", "1");

  let image = pattern.querySelector("image");
  if (!image) {
    image = svgElement("image");
    pattern.replaceChildren(image);
  }
  setSvgHref(image, "amber.png");
  image.setAttribute("width", "1");
  image.setAttribute("height", "1");
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
  return patternId;
}

function preparePrintLayer(svg, key) {
  const root = svg.querySelector("#engravetext");
  if (!root) return;

  const sourceText = root.querySelector("text");
  const transform = sourceText?.getAttribute("transform") || "";
  const latinFontFamily = sourceText?.getAttribute("font-family") || "BaksoSapi, Arial, sans-serif";
  const originalFontSize = Number.parseFloat(sourceText?.getAttribute("font-size")) || (key === "side" ? 36 : 24);
  const fontSize = originalFontSize * (key === "side" ? .72 : key === "a45" ? .82 : 1);

  const content = svgElement("g");
  content.setAttribute("class", "uv-print-content");
  if (transform) content.setAttribute("transform", transform);

  const iconA = svgElement("image");
  const iconB = svgElement("image");
  [iconA, iconB].forEach(icon => icon.setAttribute("preserveAspectRatio", "xMidYMid meet"));

  const text = svgElement("text");
  text.setAttribute("font-family", latinFontFamily);
  text.setAttribute("font-size", String(fontSize));
  text.setAttribute("font-weight", "700");
  text.setAttribute("fill", key === "front" ? "#ffffff" : "#fffdf8");
  text.setAttribute("paint-order", "stroke");
  text.setAttribute("stroke", "rgba(0,0,0,.12)");
  text.setAttribute("stroke-width", String(Math.max(.5, fontSize * .025)));

  content.append(iconA, text, iconB);
  root.replaceChildren(content);
  root.style.pointerEvents = "none";
  svg.appendChild(root);
  printLayers[key] = { root, content, iconA, iconB, text, fontSize, latinFontFamily };
}

async function loadSvg(key, fileName) {
  const response = await fetch(fileName, { cache: "no-store" });
  if (!response.ok) throw new Error(`${fileName} 載入失敗`);

  const mount = document.getElementById(`view-${key}`);
  const holder = document.createElement("div");
  holder.innerHTML = await response.text();
  const svg = holder.querySelector("svg");
  if (!svg) throw new Error(`${fileName} 找不到 SVG 內容`);
  mount.querySelector("svg:not(.photo-composite)")?.remove();
  mount.prepend(svg);

  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const viewLabel = key === "front" ? "正面" : key === "side" ? "右側面" : "右側 45 度";
  svg.setAttribute("aria-label", `${viewLabel}眼鏡預覽`);
  svg.setAttribute("role", "img");
  ensureAmberPattern(svg, key);
  preparePrintLayer(svg, key);
  svgs[key] = svg;
}

function preparePhotoLayers() {
  ["a45"].forEach(key => {
    const svg = document.getElementById(`photo-${key}`);
    if (!svg) return;
    photoLayers[key] = {
      svg,
      frame: svg.querySelector(".photo-frame-image"),
      temple: svg.querySelector(".photo-temple-image"),
      lensTints: [...svg.querySelectorAll(".photo-lens-tints > *")]
    };
  });
}

function paintGroup(svg, groupId, fill) {
  const group = svg.querySelector(`#${groupId}`);
  if (!group) return;

  const shapes = group.matches("path, polygon, rect, circle, ellipse, polyline")
    ? [group]
    : [...group.querySelectorAll("path, polygon, rect, circle, ellipse, polyline")];

  shapes.forEach(shape => {
    shape.setAttribute("fill", fill);
    shape.style.fill = fill;
  });
}

function fillFor(color, key) {
  return color.type === "pattern" ? `url(#${ensureAmberPattern(svgs[key], key)})` : color.value;
}

function updateColors() {
  Object.entries(svgs).forEach(([key, svg]) => {
    paintGroup(svg, "frame", fillFor(state.frame, key));
    paintGroup(svg, "temple", fillFor(state.temple, key));
    paintGroup(svg, "lens", state.lens.value);
  });
}

function photoAssetFor(color) {
  return PHOTO_ASSETS[color.name] || PHOTO_ASSETS[DEFAULT_PHOTO_COLOR];
}

function updatePhotoComposite() {
  const frameAsset = photoAssetFor(state.frame);
  const templeAsset = photoAssetFor(state.temple);

  Object.entries(photoLayers).forEach(([key, layer]) => {
    setSvgHref(layer.frame, frameAsset[key]);
    setSvgHref(layer.temple, templeAsset[key]);
    const lensFill = state.lens.photoFill;
    layer.lensTints.forEach(shape => {
      shape.style.fill = lensFill || "transparent";
      shape.style.opacity = String(state.lens.photoOpacity ?? 1);
      shape.style.mixBlendMode = state.lens.photoBlendMode || "screen";
    });
  });

  const photoMode = state.renderMode === "photo";
  document.getElementById("viewer").classList.toggle("is-photo-mode", photoMode);
  document.getElementById("view-tabs").classList.toggle("is-photo-mode", photoMode);
  document.getElementById("photo-mode-note").hidden = !photoMode;
  const angleButton = document.querySelector('#view-tabs [data-view="a45"]');
  angleButton.textContent = photoMode ? "左側 45°" : "右側 45°";
  angleButton.setAttribute(
    "aria-label",
    photoMode ? "查看左側 45 度品牌 Logo" : "查看右側 45 度客製效果"
  );
}

function customizationModeFromLocation() {
  try {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    return Object.prototype.hasOwnProperty.call(CUSTOMIZATION_MODES, requestedMode)
      ? requestedMode
      : "uv";
  } catch (error) {
    return "uv";
  }
}

function customizationModeLockedFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const requestedLock = params.get("locked") || params.get("lock");
    return requestedLock === "1" || requestedLock?.toLowerCase() === "true";
  } catch (error) {
    return false;
  }
}

function cartSubmitEnabledFromLocation() {
  try {
    return new URLSearchParams(window.location.search).get("cart") === "1";
  } catch (error) {
    return false;
  }
}

function parentMessageOrigin() {
  const currentOrigin = window.location.origin;

  if (window.parent === window) {
    return currentOrigin && currentOrigin !== "null" ? currentOrigin : "*";
  }

  try {
    const referrerOrigin = new URL(document.referrer).origin;
    if (referrerOrigin === STOREFRONT_ORIGIN) return STOREFRONT_ORIGIN;
    if (referrerOrigin === currentOrigin) return currentOrigin;
  } catch (error) {
    // A missing or invalid referrer must not broaden the production target origin.
  }

  return STOREFRONT_ORIGIN;
}

function syncCustomizationModeInUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", state.customizationMode);
    window.history.replaceState(null, "", url);
  } catch (error) {
    // The simulator can still work when embedded in a restricted host page.
  }
}

function effectivePrintMode() {
  if (state.customizationMode === "color") return "none";
  if (state.customizationMode === "engraving") return "name";
  return state.printMode;
}

function effectiveTextStyle() {
  if (state.customizationMode === "engraving") return ENGRAVING_TEXT_STYLE;
  return TEXT_COLOR_OPTIONS[state.textColor] || TEXT_COLOR_OPTIONS.white;
}

function usesRainbowText() {
  return state.customizationMode === "uv" && state.textColor === "rainbow";
}

function personalizationDraftKey(mode = state.customizationMode) {
  return mode === "uv" || mode === "engraving" ? mode : null;
}

function savePersonalizationDraft() {
  const key = personalizationDraftKey();
  if (!key) return;
  customizationDrafts[key].nameSource = state.nameSource;
  customizationDrafts[key].font = state.font;
  customizationDrafts[key].caseMode = state.caseMode;
}

function loadPersonalizationDraft(seedName = state.nameSource) {
  const key = personalizationDraftKey();
  nameValidationMessage = "";
  if (!key) return;

  const draft = customizationDrafts[key];
  if (key === "engraving" && draft.nameSource === null) {
    const normalized = normalizeEngravingName(seedName);
    draft.nameSource = normalized.value;
    if (normalized.changed) {
      nameValidationMessage = "雷雕僅支援英文字母，請重新確認姓名。";
    }
  }

  state.nameSource = draft.nameSource || "";
  state.caseMode = draft.caseMode || "preserve";
  state.name = applyCase(state.nameSource);
  state.font = key === "engraving" && !ENGLISH_FONT_KEYS.has(draft.font)
    ? "baksoSapi"
    : draft.font;
}

function estimatedTextWidth(name, fontSize, fontMetrics = PRINT_FONTS.baksoSapi) {
  const width = Array.from(name).reduce((total, character) => {
    if (isCjk(character)) return total + (fontSize * fontMetrics.hanWidth);
    if (character === " ") return total + (fontSize * .34);
    if (/[a-z]/.test(character)) return total + (fontSize * fontMetrics.lowercaseWidth);
    return total + (fontSize * fontMetrics.uppercaseWidth);
  }, 0);
  return Math.max(fontSize * .65, width);
}

function measuredTextWidth(name, fontSize, fontMetrics = PRINT_FONTS.baksoSapi) {
  if (typeof document === "undefined") return estimatedTextWidth(name, fontSize, fontMetrics);
  if (!textMeasureContext) textMeasureContext = document.createElement("canvas").getContext("2d");
  if (!textMeasureContext) return estimatedTextWidth(name, fontSize, fontMetrics);

  textMeasureContext.font = `${fontMetrics.weight} ${fontSize}px ${fontMetrics.family}`;
  const measured = textMeasureContext.measureText(name || " ").width;
  return Number.isFinite(measured) && measured > 0
    ? Math.max(fontSize * .65, measured)
    : estimatedTextWidth(name, fontSize, fontMetrics);
}

function printTextWidth(name, fontSize, fontMetrics = PRINT_FONTS.baksoSapi) {
  if (!usesRainbowText() || typeof document === "undefined") {
    return measuredTextWidth(name, fontSize, fontMetrics);
  }
  if (!textMeasureContext) textMeasureContext = document.createElement("canvas").getContext("2d");
  if (!textMeasureContext) return estimatedTextWidth(name, fontSize, fontMetrics);

  textMeasureContext.font = `${fontMetrics.weight} ${fontSize}px ${fontMetrics.family}`;
  const width = Array.from(name || " ").reduce(
    (total, character) => total + textMeasureContext.measureText(character).width,
    0
  );
  return Number.isFinite(width) && width > 0
    ? Math.max(fontSize * .65, width)
    : estimatedTextWidth(name, fontSize, fontMetrics);
}

function applyPrintTextColor(textElement, value) {
  const option = effectiveTextStyle();
  const printableValue = value || " ";
  textElement.replaceChildren();
  textElement.setAttributeNS(XML_NS, "xml:space", "preserve");
  textElement.style.fill = option.fill;
  textElement.style.stroke = option.stroke;
  textElement.style.strokeWidth = option.outlineWidth;
  textElement.style.strokeLinejoin = "round";
  textElement.style.paintOrder = "stroke fill";
  textElement.style.vectorEffect = "non-scaling-stroke";

  if (!usesRainbowText()) {
    textElement.textContent = printableValue;
    return;
  }

  let colorIndex = 0;
  Array.from(printableValue).forEach(character => {
    const tspan = svgElement("tspan");
    tspan.textContent = character;
    if (character !== " ") {
      tspan.setAttribute("fill", RAINBOW_PRINT_COLORS[colorIndex % RAINBOW_PRINT_COLORS.length]);
      colorIndex += 1;
    }
    tspan.style.vectorEffect = "non-scaling-stroke";
    textElement.appendChild(tspan);
  });
}

function isCjk(character) {
  return /\p{Script=Han}/u.test(character);
}

function printUnits(character) {
  if (isCjk(character)) return 2.5;
  if (character === " ") return .5;
  return 1;
}

function normalizeUvName(value) {
  const normalizedValue = value.normalize("NFC");
  const allowed = normalizedValue.replace(/[^A-Za-z0-9 \p{Script=Han}]/gu, "");
  let result = "";
  let units = 0;
  for (const character of Array.from(allowed)) {
    const nextUnits = printUnits(character);
    if (units + nextUnits > 10) break;
    result += character;
    units += nextUnits;
  }
  return { value: result, units, changed: result !== normalizedValue };
}

function normalizeEngravingName(value) {
  const normalizedValue = value.normalize("NFC");
  const result = normalizedValue.replace(/[^A-Za-z]/g, "").slice(0, 10);
  return { value: result, units: result.length, changed: result !== normalizedValue };
}

function normalizeName(value) {
  return state.customizationMode === "engraving"
    ? normalizeEngravingName(value)
    : normalizeUvName(value);
}

function applyCase(value, mode = state.caseMode) {
  if (mode === "upper") return value.replace(/[A-Za-z]/g, character => character.toUpperCase());
  if (mode === "lower") return value.replace(/[A-Za-z]/g, character => character.toLowerCase());
  return value;
}

function nameCountLabel(name, units) {
  const characters = Array.from(name);
  if (state.customizationMode === "engraving") return `${characters.length}/10`;
  if (characters.length > 0 && characters.every(isCjk)) return `${characters.length}/4`;
  if (characters.some(isCjk)) return `${units}/10`;
  return `${characters.length}/10`;
}

function positionIcon(icon, x, size) {
  icon.setAttribute("x", String(x));
  icon.setAttribute("y", String(-size * .82));
  icon.setAttribute("width", String(size));
  icon.setAttribute("height", String(size));
}

function visiblePrintSequence(showIcons, showName) {
  const icons = state.order === "reverse" ? ["icon2", "icon1"] : ["icon1", "icon2"];
  if (!showIcons) return showName ? ["name"] : [];
  if (!showName) return icons;
  if (state.namePosition === "before") return ["name", ...icons];
  if (state.namePosition === "after") return [...icons, "name"];
  return [icons[0], "name", icons[1]];
}

function printSequenceWidth(sequence, iconSize, nameWidth, gap) {
  if (!sequence.length) return 0;
  const contentWidth = sequence.reduce(
    (total, item) => total + (item === "name" ? nameWidth : iconSize),
    0
  );
  return contentWidth + (gap * (sequence.length - 1));
}

function positionPrintSequence(layer, sequence, startX, iconSize, nameWidth, gap) {
  const icons = { icon1: layer.iconA, icon2: layer.iconB };
  let cursorX = startX;

  sequence.forEach((item, index) => {
    if (item === "name") {
      layer.text.setAttribute("x", String(cursorX));
      cursorX += nameWidth;
    } else {
      positionIcon(icons[item], cursorX, iconSize);
      cursorX += iconSize;
    }
    if (index < sequence.length - 1) cursorX += gap;
  });
}

function updatePrint() {
  const printMode = effectivePrintMode();
  Object.entries(printLayers).forEach(([key, layer]) => {
    const showIcons = printMode === "both" || printMode === "icon";
    const showName = printMode === "both" || printMode === "name";
    layer.root.style.display = printMode === "none" || key === "front" ? "none" : "inline";

    const selectedFont = PRINT_FONTS[state.font];
    const baseIconSize = layer.fontSize * .88;
    const baseGap = layer.fontSize * .22;
    const baseNameWidth = printTextWidth(state.name || " ", layer.fontSize, selectedFont);
    const sequence = visiblePrintSequence(showIcons, showName);
    const baseTotalWidth = Math.max(1, printSequenceWidth(sequence, baseIconSize, baseNameWidth, baseGap));
    const fitScale = Math.min(1, (MAX_PRINT_WIDTH[key] || baseTotalWidth) / baseTotalWidth);
    const fontSize = layer.fontSize * fitScale;
    const iconSize = baseIconSize * fitScale;
    const gap = baseGap * fitScale;
    const nameWidth = baseNameWidth * fitScale;
    const totalWidth = baseTotalWidth * fitScale;
    const startX = (PRINT_CENTER_OFFSET[key] || 0) - (totalWidth / 2);

    setSvgHref(layer.iconA, `assets/uv-icons/${state.icon1}.svg`);
    setSvgHref(layer.iconB, `assets/uv-icons/${state.icon2}.svg`);
    layer.text.setAttribute("font-family", selectedFont.family);
    layer.text.setAttribute("font-weight", selectedFont.weight);
    layer.text.setAttribute("font-size", String(fontSize));
    layer.text.setAttribute("y", "0");
    applyPrintTextColor(layer.text, state.name);
    layer.iconA.style.display = showIcons ? "inline" : "none";
    layer.iconB.style.display = showIcons ? "inline" : "none";
    layer.text.style.display = showName ? "inline" : "none";

    positionPrintSequence(layer, sequence, startX, iconSize, nameWidth, gap);
  });

}

function setActiveButtons(container, matcher) {
  container.querySelectorAll("button").forEach(button => {
    const active = matcher(button);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function syncViewControls() {
  Object.keys(VIEW_FILES).forEach(key => {
    document.getElementById(`view-${key}`).hidden = key !== state.view;
  });
  setActiveButtons(
    document.getElementById("view-tabs"),
    button => button.dataset.view === state.view
  );
}

function enterPhotoView() {
  deferredModelView = state.view === "a45" ? null : state.view;
  state.view = "a45";
  syncViewControls();
}

function leavePhotoView() {
  if (deferredModelView) state.view = deferredModelView;
  deferredModelView = null;
  syncViewControls();
}

function photoColorAvailable(colorName) {
  return Boolean(PHOTO_ASSETS[colorName]);
}

function sizeColorAvailable(size, colorName) {
  return Boolean(SIZE_COLOR_AVAILABILITY[size]?.has(colorName));
}

function colorOptionsFor(stateKey) {
  return stateKey === "frame" ? FRAME_COLORS : TEMPLE_COLORS;
}

function firstAvailableColor(stateKey, { photoOnly = false } = {}) {
  return colorOptionsFor(stateKey).find(color => (
    sizeColorAvailable(state.size, color.name)
    && (!photoOnly || photoColorAvailable(color.name))
  ));
}

function syncSizeControls() {
  const selectedSize = SIZE_OPTIONS.find(size => size.name === state.size) || SIZE_OPTIONS[2];
  setActiveButtons(
    document.getElementById("size-options"),
    button => button.dataset.size === state.size
  );
  document.getElementById("picked-size").textContent = `${selectedSize.name} · ${selectedSize.headCircumference}`;
}

function syncColorControls() {
  [
    ["frame-swatches", "frame", "picked-frame"],
    ["temple-swatches", "temple", "picked-temple"]
  ].forEach(([mountId, stateKey, pickedId]) => {
    const mount = document.getElementById(mountId);
    setActiveButtons(mount, button => button.dataset.color === state[stateKey].name);
    document.getElementById(pickedId).textContent = state[stateKey].name;
  });
}

function updateColorAvailability() {
  const photoMode = state.renderMode === "photo";
  ["frame-swatches", "temple-swatches"].forEach(mountId => {
    document.getElementById(mountId).querySelectorAll("button[data-color]").forEach(button => {
      const colorName = button.dataset.color;
      const sizeUnavailable = !sizeColorAvailable(state.size, colorName);
      const photoUnavailable = photoMode && !photoColorAvailable(colorName);
      const unavailable = sizeUnavailable || photoUnavailable;
      const reasons = [];
      if (sizeUnavailable) reasons.push(`${state.size} 尺寸無此色`);
      if (photoUnavailable) reasons.push("尚未加入實拍效果，可切換 2D 自由配色使用");

      button.disabled = unavailable;
      button.classList.toggle("is-size-unavailable", sizeUnavailable);
      button.classList.toggle("is-photo-unavailable", photoUnavailable);
      button.classList.toggle("is-unavailable", unavailable);
      button.title = reasons.length ? `${colorName}：${reasons.join("；")}` : colorName;
      button.setAttribute("aria-label", reasons.length ? `${colorName}，${reasons.join("；")}` : colorName);
    });
  });
}

function reconcileColorSelectionsForSize() {
  const photoOnly = state.renderMode === "photo";

  ["frame", "temple"].forEach(stateKey => {
    const current = state[stateKey];
    const currentAvailable = sizeColorAvailable(state.size, current.name)
      && (!photoOnly || photoColorAvailable(current.name));

    if (!currentAvailable) {
      const fallback = firstAvailableColor(stateKey, { photoOnly });
      if (fallback) state[stateKey] = { ...fallback };
    }

    const deferred = deferredModelColors[stateKey];
    if (!deferred) return;
    if (sizeColorAvailable(state.size, deferred.color.name)) {
      deferred.size = state.size;
    } else {
      deferredModelColors[stateKey] = null;
    }
  });
}

function enterPhotoModeSelections() {
  ["frame", "temple"].forEach(stateKey => {
    const current = state[stateKey];
    const sizeAvailable = sizeColorAvailable(state.size, current.name);
    deferredModelColors[stateKey] = null;
    if (!photoColorAvailable(current.name) || !sizeAvailable) {
      if (sizeAvailable) {
        deferredModelColors[stateKey] = {
          size: state.size,
          color: { ...current }
        };
      }
      const fallback = firstAvailableColor(stateKey, { photoOnly: true });
      if (fallback) state[stateKey] = { ...fallback };
    }
  });
  syncColorControls();
}

function leavePhotoModeSelections() {
  ["frame", "temple"].forEach(stateKey => {
    const deferred = deferredModelColors[stateKey];
    if (
      deferred
      && deferred.size === state.size
      && sizeColorAvailable(state.size, deferred.color.name)
    ) {
      state[stateKey] = deferred.color;
    }
    deferredModelColors[stateKey] = null;
  });
  syncColorControls();
}

function updatePrintViewHint() {
  const hint = document.getElementById("print-view-hint");
  const printMode = effectivePrintMode();
  if (state.renderMode === "photo" || printMode === "none") {
    hint.hidden = true;
    return;
  }
  hint.textContent = state.customizationMode === "engraving"
    ? "雷雕位於右外側鏡腳，請切換「側面」或「右側 45°」查看。"
    : "UV 彩印位於右外側鏡腳，請切換「側面」或「右側 45°」查看。";
  hint.hidden = state.view !== "front";
}

function swatchStyle(item) {
  if (item.type === "pattern") return `--swatch:#a16238;--swatch-image:url('${item.thumb}')`;
  return `--swatch:${item.value}`;
}

function renderSwatches(mountId, items, stateKey, pickedId) {
  const mount = document.getElementById(mountId);
  mount.replaceChildren();

  items.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `swatch${state[stateKey].name === item.name ? " is-active" : ""}`;
    button.setAttribute("style", swatchStyle(item));
    button.setAttribute("aria-label", item.name);
    button.setAttribute("title", item.name);
    button.setAttribute("aria-pressed", String(state[stateKey].name === item.name));
    button.dataset.color = item.name;
    button.addEventListener("click", () => {
      state[stateKey] = item;
      if (state.renderMode === "photo") deferredModelColors[stateKey] = null;
      setActiveButtons(mount, candidate => candidate === button);
      document.getElementById(pickedId).textContent = item.name;
      updateAll();
    });
    mount.appendChild(button);
  });
}

function renderLensOptions() {
  const mount = document.getElementById("lens-options");
  mount.replaceChildren();
  LENS_COLORS.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `lens-option${state.lens.name === item.name ? " is-active" : ""}`;
    button.setAttribute("aria-pressed", String(state.lens.name === item.name));
    button.innerHTML = `<i style="--lens:${item.swatch}"></i><span>${item.name}</span>`;
    button.addEventListener("click", () => {
      state.lens = item;
      setActiveButtons(mount, candidate => candidate === button);
      document.getElementById("picked-lens").textContent = item.name;
      updateAll();
    });
    mount.appendChild(button);
  });
}

function updateIconSlotUi() {
  ["icon1", "icon2"].forEach(slot => {
    document.getElementById(`${slot}-preview`).src = `assets/uv-icons/${state[slot]}.svg`;
    document.getElementById(`${slot}-label`).textContent = `NO.${state[slot]}`;
  });
  setActiveButtons(document.getElementById("icon-slots"), button => button.dataset.slot === state.activeIconSlot);
  setActiveButtons(document.getElementById("icon-catalog"), button => button.dataset.icon === state[state.activeIconSlot]);
}

function chooseIcon(id) {
  const active = state.activeIconSlot;
  const other = active === "icon1" ? "icon2" : "icon1";
  if (state[other] === id) {
    state[other] = state[active];
  }
  state[active] = id;
  updateIconSlotUi();
  updateAll();
}

function renderIconCatalog() {
  const mount = document.getElementById("icon-catalog");
  const fragment = document.createDocumentFragment();
  for (let number = 1; number <= 33; number += 1) {
    const id = String(number).padStart(2, "0");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.icon = id;
    button.className = `icon-option${state[state.activeIconSlot] === id ? " is-active" : ""}`;
    button.setAttribute("aria-label", `UV 彩印圖案 ${id}`);
    button.setAttribute("aria-pressed", String(state[state.activeIconSlot] === id));
    button.innerHTML = `<img src="assets/uv-icons/${id}.svg" alt="" loading="lazy"><span>${id}</span>`;
    button.addEventListener("click", () => chooseIcon(id));
    fragment.appendChild(button);
  }
  mount.appendChild(fragment);
}

function updateConditionalFields() {
  const mode = state.customizationMode;
  const config = CUSTOMIZATION_MODES[mode] || CUSTOMIZATION_MODES.uv;
  const isUv = mode === "uv";
  const isEngraving = mode === "engraving";
  const printMode = effectivePrintMode();
  const usesIcon = printMode === "both" || printMode === "icon";
  const usesName = printMode === "both" || printMode === "name";

  setActiveButtons(
    document.getElementById("customization-mode-options"),
    button => button.dataset.customizationMode === mode
  );
  const customizationModeSection = document.querySelector(".customization-mode-section");
  customizationModeSection.classList.toggle("is-locked", state.customizationModeLocked);
  document.getElementById("customization-mode-title").textContent = state.customizationModeLocked
    ? "本商品方案"
    : "客製方案";
  document.getElementById("picked-customization-mode").textContent = state.customizationModeLocked
    ? `${config.shortLabel} · 已鎖定`
    : config.shortLabel;
  document.querySelectorAll("#customization-mode-options button").forEach(button => {
    button.disabled = state.customizationModeLocked;
  });

  const personalizationSection = document.getElementById("personalization-section");
  personalizationSection.hidden = mode === "color";
  document.getElementById("personalization-title").textContent = isEngraving ? "雷雕客製" : "UV 彩印客製";
  document.getElementById("picked-print").textContent = isEngraving
    ? "白色英文雷雕"
    : MODE_NAMES[state.printMode];
  document.getElementById("engraving-rule").hidden = !isEngraving;

  document.getElementById("print-mode-field").hidden = !isUv;
  document.getElementById("icon-field").hidden = !isUv || !usesIcon;
  document.getElementById("name-field").hidden = !usesName;
  document.getElementById("text-color-field").hidden = !isUv || !usesName;
  document.getElementById("font-field").hidden = !usesName;
  document.getElementById("case-field").hidden = !usesName;
  document.getElementById("layout-field").hidden = !isUv || state.printMode !== "both";
  document.getElementById("chinese-font-group").hidden = isEngraving;

  const nameInput = document.getElementById("name-input");
  nameInput.maxLength = isEngraving ? 10 : 24;
  nameInput.value = state.name;
  nameInput.style.fontFamily = PRINT_FONTS[state.font].family;
  if (isEngraving) {
    nameInput.lang = "en";
    nameInput.pattern = "[A-Za-z]*";
  } else {
    nameInput.removeAttribute("lang");
    nameInput.removeAttribute("pattern");
  }

  document.getElementById("name-legend-label").textContent = isEngraving ? "輸入雷雕英文" : "輸入名字";
  document.getElementById("name-limit-label").textContent = isEngraving ? "英文 10 字" : "英文 10 字／中文 4 字";
  document.getElementById("name-count").textContent = nameCountLabel(state.nameSource, Array.from(state.nameSource).reduce((total, character) => total + printUnits(character), 0));
  document.getElementById("name-help").textContent = isEngraving
    ? "僅支援 A–Z／a–z，最多 10 個英文字母；不接受中文、數字、空格與符號。"
    : "支援中文、英文與數字；中文可使用注音、拼音等輸入法，完成選字後計算字數。";
  document.getElementById("font-help").textContent = isEngraving
    ? "雷雕僅提供圓潤手寫體與童趣積木體兩款英文字體。"
    : "英文類字體不含中文字形；輸入中文時會自動以中文圓體補足。";
  document.getElementById("print-note").textContent = isEngraving
    ? "模擬位置為右外側鏡腳；白色僅為雷雕效果示意，實品深淺會依鏡腳材質與正式打樣呈現。"
    : "模擬位置為右外側鏡腳；2D 右側 45° 可確認客製排列，實拍左側 45° 保留 eYeFANS 品牌 Logo。";

  const validation = document.getElementById("name-validation");
  validation.textContent = nameValidationMessage;
  validation.hidden = !nameValidationMessage || !isEngraving;

  setActiveButtons(
    document.getElementById("font-options"),
    button => button.dataset.font === state.font
  );
  setActiveButtons(
    document.getElementById("print-mode-options"),
    button => button.dataset.mode === state.printMode
  );
  setActiveButtons(
    document.getElementById("case-options"),
    button => button.dataset.case === state.caseMode
  );
}

function setChip(id, item) {
  const chip = document.getElementById(id);
  const isPattern = item.type === "pattern";
  chip.style.backgroundColor = isPattern ? "#a16238" : item.swatch || item.value;
  chip.style.backgroundImage = isPattern ? "url('amber.png')" : "none";
  chip.style.backgroundSize = "cover";
}

function updateSummary() {
  document.getElementById("size-summary").textContent = state.size;
  document.getElementById("size-chip").textContent = state.size;
  document.getElementById("frame-summary").textContent = state.frame.name;
  document.getElementById("temple-summary").textContent = state.temple.name;
  document.getElementById("lens-summary").textContent = state.lens.name;
  setChip("frame-chip", state.frame);
  setChip("temple-chip", state.temple);
  setChip("lens-chip", state.lens);
}

function buildSelectionPayload() {
  const customizationConfig = CUSTOMIZATION_MODES[state.customizationMode] || CUSTOMIZATION_MODES.uv;
  const printMode = effectivePrintMode();
  const usesIcon = printMode === "both" || printMode === "icon";
  const usesName = printMode === "both" || printMode === "name";
  const textColorLabel = TEXT_COLOR_OPTIONS[state.textColor]?.label || TEXT_COLOR_OPTIONS.white.label;
  const personalization = state.customizationMode === "color"
    ? "不加印刷"
    : state.customizationMode === "engraving"
      ? `白色英文雷雕／${state.name || "未輸入英文"}`
      : printMode === "none"
        ? "不加印刷"
        : `${MODE_NAMES[printMode]}${usesIcon ? `／圖案 ${state.icon1}+${state.icon2}` : ""}${usesName ? `／${state.name || "未輸入名字"}／文字${textColorLabel}` : ""}`;
  const previewMode = state.renderMode === "photo" ? "實拍效果" : "2D 自由配色";
  const customizationSideLabel = state.customizationMode !== "color" && printMode !== "none"
    ? "右外側鏡腳"
    : null;
  const summary = `${previewMode}、${customizationConfig.label}、尺寸 ${state.size}、鏡框 ${state.frame.name}、鏡腳 ${state.temple.name}、鏡片 ${state.lens.name}、${personalization}${customizationSideLabel ? `、客製位置 ${customizationSideLabel}` : ""}`;

  return {
    customizationMode: state.customizationMode,
    customizationModeLabel: customizationConfig.label,
    customizationModeLocked: state.customizationModeLocked,
    size: state.size,
    view: state.view,
    renderMode: state.renderMode,
    frame: state.frame.name,
    temple: state.temple.name,
    lens: state.lens.name,
    lensId: state.lens.id,
    printMode,
    uvPrintMode: state.customizationMode === "uv" ? state.printMode : null,
    icon1: usesIcon ? state.icon1 : null,
    icon2: usesIcon ? state.icon2 : null,
    name: usesName ? state.name : "",
    textColor: usesName
      ? state.customizationMode === "engraving" ? "white" : state.textColor
      : null,
    font: usesName ? state.font : null,
    caseMode: usesName ? state.caseMode : null,
    order: usesIcon ? state.order : null,
    namePosition: printMode === "both" ? state.namePosition : null,
    customizationSide: customizationSideLabel ? "right" : null,
    customizationSideLabel,
    summary
  };
}

function announceAndNotifyParent() {
  const selection = buildSelectionPayload();
  document.getElementById("live-status").textContent = selection.summary;

  const cartPanel = document.getElementById("cart-submit-panel");
  if (
    cartPanel?.dataset.state === "success"
    && lastAddedSelectionFingerprint
    && cartSelectionFingerprint(selection) !== lastAddedSelectionFingerprint
  ) {
    setCartSubmitState("idle", CART_IDLE_MESSAGE);
  }

  window.parent?.postMessage({
    type: "eyefans-customizer-change",
    schemaVersion: MESSAGE_SCHEMA_VERSION,
    selection
  }, parentMessageOrigin());
}

function createCartRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `eyefans-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cartSelectionFingerprint(selection) {
  const { view, renderMode, summary, ...cartSelection } = selection;
  return JSON.stringify(cartSelection);
}

function setCustomizerControlsLocked(locked) {
  if (locked) {
    if (cartLockedControlStates.length) return;
    cartLockedControlStates = Array.from(
      document.querySelectorAll(".controls-panel button:not(#cart-submit-button), .controls-panel input, .controls-panel select")
    ).map(control => ({ control, disabled: control.disabled }));
    cartLockedControlStates.forEach(({ control }) => {
      control.disabled = true;
    });
    return;
  }

  cartLockedControlStates.forEach(({ control, disabled }) => {
    control.disabled = disabled;
  });
  cartLockedControlStates = [];
}

function setCartSubmitState(status, message) {
  const panel = document.getElementById("cart-submit-panel");
  const button = document.getElementById("cart-submit-button");
  const statusElement = document.getElementById("cart-submit-status");
  const isLoading = status === "loading";
  const isSuccess = status === "success";
  panel.dataset.state = status;
  button.disabled = isLoading || isSuccess;
  button.setAttribute("aria-busy", String(isLoading));
  button.textContent = isLoading
    ? "正在加入購物車…"
    : isSuccess
      ? "已加入購物車"
      : "確認設計並加入購物車";
  setCustomizerControlsLocked(isLoading);
  statusElement.textContent = message;
}

function clearCartResultTimer() {
  if (cartResultTimer === null) return;
  window.clearTimeout(cartResultTimer);
  cartResultTimer = null;
}

function submitCustomizerSelection() {
  if (pendingCartRequestId) return;

  const selection = buildSelectionPayload();
  const needsName = selection.customizationMode === "engraving"
    || (selection.customizationMode === "uv" && ["both", "name"].includes(selection.printMode));

  if (needsName && !selection.name.trim()) {
    setCartSubmitState("error", "請先輸入客製名字，再加入購物車。");
    document.getElementById("name-input")?.focus();
    return;
  }

  const requestId = createCartRequestId();
  pendingCartRequestId = requestId;
  pendingCartSelectionFingerprint = cartSelectionFingerprint(selection);
  setCartSubmitState("loading", "正在將設計資料送至商品頁……");

  window.parent?.postMessage({
    type: "eyefans-customizer-submit",
    schemaVersion: MESSAGE_SCHEMA_VERSION,
    requestId,
    selection
  }, parentMessageOrigin());

  clearCartResultTimer();
  cartResultTimer = window.setTimeout(() => {
    if (pendingCartRequestId !== requestId) return;
    pendingCartRequestId = null;
    pendingCartSelectionFingerprint = null;
    cartResultTimer = null;
    setCartSubmitState("error", "商品頁尚未回應，請稍後再試或重新整理頁面。");
  }, CART_RESULT_TIMEOUT_MS);
}

function handleCartResult(event) {
  const expectedOrigin = parentMessageOrigin();
  if (
    event.source !== window.parent
    || expectedOrigin === "*"
    || event.origin !== expectedOrigin
  ) return;

  const message = event.data;
  if (
    !message
    || message.type !== "eyefans-customizer-cart-result"
    || message.schemaVersion !== MESSAGE_SCHEMA_VERSION
    || message.requestId !== pendingCartRequestId
    || typeof message.ok !== "boolean"
  ) return;

  clearCartResultTimer();
  const completedSelectionFingerprint = pendingCartSelectionFingerprint;
  pendingCartRequestId = null;
  pendingCartSelectionFingerprint = null;

  if (message.ok) {
    lastAddedSelectionFingerprint = completedSelectionFingerprint;
    setCartSubmitState("success", message.message || "已成功加入購物車。");
    return;
  }

  setCartSubmitState("error", message.message || "加入購物車失敗，請稍後再試。");
}

function initializeCartSubmit() {
  if (!cartSubmitEnabledFromLocation()) return;

  const panel = document.getElementById("cart-submit-panel");
  panel.hidden = false;
  panel.dataset.state = "idle";
  document.getElementById("cart-submit-button").addEventListener("click", submitCustomizerSelection);
  window.addEventListener("message", handleCartResult);
}

function updateAll() {
  syncSizeControls();
  updateColors();
  updatePhotoComposite();
  updatePrint();
  updateConditionalFields();
  updateSummary();
  updateColorAvailability();
  updatePrintViewHint();
  announceAndNotifyParent();
}

function bindControls() {
  document.getElementById("customization-mode-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-customization-mode]");
    if (
      state.customizationModeLocked
      || !button
      || button.dataset.customizationMode === state.customizationMode
    ) return;
    const seedName = state.nameSource;
    savePersonalizationDraft();
    state.customizationMode = button.dataset.customizationMode;
    loadPersonalizationDraft(seedName);
    syncCustomizationModeInUrl();
    updateAll();
  });

  document.getElementById("size-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-size]");
    if (!button || button.dataset.size === state.size) return;
    state.size = button.dataset.size;
    reconcileColorSelectionsForSize();
    syncColorControls();
    updateAll();
  });

  document.getElementById("view-tabs").addEventListener("click", event => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    if (state.renderMode === "photo" && button.dataset.view !== "a45") return;
    state.view = button.dataset.view;
    syncViewControls();
    updatePrintViewHint();
    announceAndNotifyParent();
  });

  document.getElementById("render-mode-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-render-mode]");
    if (!button) return;
    const nextMode = button.dataset.renderMode;
    if (nextMode === state.renderMode) return;
    if (nextMode === "photo") {
      enterPhotoModeSelections();
      enterPhotoView();
    }
    if (state.renderMode === "photo" && nextMode === "model") {
      leavePhotoModeSelections();
      leavePhotoView();
    }
    state.renderMode = nextMode;
    setActiveButtons(document.getElementById("render-mode-options"), candidate => candidate === button);
    updateAll();
  });

  document.getElementById("print-mode-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    state.printMode = button.dataset.mode;
    setActiveButtons(document.getElementById("print-mode-options"), candidate => candidate === button);
    updatePrintViewHint();
    updateAll();
  });

  document.getElementById("icon-slots").addEventListener("click", event => {
    const button = event.target.closest("button[data-slot]");
    if (!button) return;
    state.activeIconSlot = button.dataset.slot;
    updateIconSlotUi();
  });

  document.getElementById("layout-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-order]");
    if (!button) return;
    state.order = button.dataset.order;
    state.namePosition = button.dataset.namePosition;
    setActiveButtons(
      document.getElementById("layout-options"),
      candidate => candidate.dataset.order === state.order
        && candidate.dataset.namePosition === state.namePosition
    );
    updateAll();
  });

  document.getElementById("font-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-font]");
    if (!button) return;
    if (state.customizationMode === "engraving" && !ENGLISH_FONT_KEYS.has(button.dataset.font)) return;
    state.font = button.dataset.font;
    const draftKey = personalizationDraftKey();
    if (draftKey) customizationDrafts[draftKey].font = state.font;
    setActiveButtons(document.getElementById("font-options"), candidate => candidate === button);
    document.getElementById("name-input").style.fontFamily = PRINT_FONTS[state.font].family;
    updateAll();
  });

  document.getElementById("text-color-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-text-color]");
    if (!button) return;
    state.textColor = button.dataset.textColor;
    setActiveButtons(document.getElementById("text-color-options"), candidate => candidate === button);
    updateAll();
  });

  document.getElementById("case-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-case]");
    if (!button) return;
    state.caseMode = button.dataset.case;
    state.name = applyCase(state.nameSource);
    const draftKey = personalizationDraftKey();
    if (draftKey) customizationDrafts[draftKey].caseMode = state.caseMode;
    document.getElementById("name-input").value = state.name;
    setActiveButtons(document.getElementById("case-options"), candidate => candidate === button);
    updateAll();
  });

  const nameInput = document.getElementById("name-input");
  let isNameComposing = false;

  const commitNameInput = () => {
    const normalized = normalizeName(nameInput.value);
    nameValidationMessage = state.customizationMode === "engraving" && normalized.changed
      ? "雷雕僅支援英文字母，其他字元已移除。"
      : "";
    state.nameSource = normalized.value;
    state.name = applyCase(normalized.value);
    const draftKey = personalizationDraftKey();
    if (draftKey) customizationDrafts[draftKey].nameSource = normalized.value;
    nameInput.value = state.name;
    document.getElementById("name-count").textContent = nameCountLabel(normalized.value, normalized.units);
    updateAll();
  };

  nameInput.addEventListener("compositionstart", () => {
    isNameComposing = true;
  });

  nameInput.addEventListener("compositionend", () => {
    isNameComposing = false;
    commitNameInput();
  });

  nameInput.addEventListener("input", event => {
    if (isNameComposing || event.isComposing) return;
    commitNameInput();
  });
}

async function init() {
  state.customizationMode = customizationModeFromLocation();
  state.customizationModeLocked = customizationModeLockedFromLocation();
  initializeCartSubmit();
  loadPersonalizationDraft(state.nameSource);
  preparePhotoLayers();
  bindControls();
  syncViewControls();
  syncSizeControls();
  renderSwatches("frame-swatches", FRAME_COLORS, "frame", "picked-frame");
  renderSwatches("temple-swatches", TEMPLE_COLORS, "temple", "picked-temple");
  renderLensOptions();
  renderIconCatalog();
  updateIconSlotUi();
  updateConditionalFields();
  updateColorAvailability();

  try {
    await Promise.all(Object.entries(VIEW_FILES).map(([key, file]) => loadSvg(key, file)));
    document.getElementById("loading-state").classList.add("is-hidden");
    updateAll();
    document.fonts?.ready.then(updatePrint);
  } catch (error) {
    console.error(error);
    document.getElementById("loading-state").textContent = "模型載入失敗，請重新整理頁面。";
  }
}

init();
