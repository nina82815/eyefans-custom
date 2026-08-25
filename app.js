const FRAME_COLORS = [
  { name: "櫻花粉", value: "#eecad4" },
  { name: "粉紫", value: "#d0b5d6" },
  { name: "暖黃", value: "#f2e325" },
  { name: "豆綠", value: "#90b395" },
  { name: "深藍", value: "#0d426e" },
  { name: "復古粉", value: "#cf69a5" },
  { name: "芋頭紫", value: "#a284ba" },
  { name: "奶油黃", value: "#fbc966" },
  { name: "薄荷綠", value: "#6aa1a4" },
  { name: "單寧藍", value: "#4984b7" },
  { name: "梅子", value: "#bd838f" },
  { name: "奶茶", value: "#dcad9b" },
  { name: "青釉綠", value: "#465d55" },
  { name: "天藍", value: "#09afe9" },
  { name: "玫瑰", value: "#a84258" },
  { name: "咖啡牛奶", value: "#a58b84" },
  { name: "枯黃", value: "#d8b269" },
  { name: "霧面黑", value: "#0f0f10" },
  { name: "灰色", value: "#898989" },
  { name: "咖啡紅茶", value: "#8a382c" },
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
  { name: "三號灰片", value: "rgba(25,25,28,.78)", swatch: "rgba(25,25,28,.78)" },
  { name: "抗藍光茶片", value: "rgba(180,150,90,.38)", swatch: "rgba(180,150,90,.55)" }
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
const PHOTO_COVER_FILLS = {
  "櫻花粉": "url(#photo-a45-cover-sakura)",
  "霧面白": "url(#photo-a45-cover-white)",
  "琥珀": "url(#photo-a45-cover-amber)"
};

const TEXT_COLOR_OPTIONS = {
  black: { label: "黑色", fill: "#171817", stroke: "none", outlineWidth: "0" },
  white: { label: "白色", fill: "#fffdf8", stroke: "#111111", outlineWidth: "0.5pt" },
  rainbow: { label: "逐字彩色", fill: "#e66d3f", stroke: "#111111", outlineWidth: "0.5pt" }
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
    label: "Purple Smile",
    family: '"eYeFans Purple Smile", "eYeFans GenSen Rounded", "PingFang TC", sans-serif',
    weight: "400",
    uppercaseWidth: .655,
    lowercaseWidth: .585,
    hanWidth: 1
  },
  baksoSapi: {
    label: "Bakso Sapi",
    family: '"eYeFans Bakso Sapi", "eYeFans GenSen Rounded", "PingFang TC", sans-serif',
    weight: "400",
    uppercaseWidth: .647,
    lowercaseWidth: .637,
    hanWidth: 1
  }
};

const state = {
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
  order: "normal"
};

const svgs = {};
const printLayers = {};
const photoLayers = {};
let photoPrintLayer;
let textMeasureContext;
const deferredModelColors = { frame: null, temple: null };
let deferredModelView = null;
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const PRINT_CENTER_OFFSET = { front: 0, side: 15, a45: 30 };
const MAX_PRINT_WIDTH = { side: 205, a45: 112, photoA45: 270 };

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
  svg.setAttribute("aria-label", `${key === "front" ? "正面" : key === "side" ? "側面" : "45 度"}眼鏡預覽`);
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
      lensTints: [...svg.querySelectorAll(".photo-lens-tints > *")],
      logoPattern: svg.querySelector(".photo-logo-pattern-image"),
      logoCoverBase: svg.querySelector(".photo-logo-cover-base")
    };
  });

  const root = document.querySelector("#photo-a45 .photo-print-root");
  if (!root) return;
  photoPrintLayer = {
    root,
    iconA: root.querySelector(".photo-print-icon-a"),
    iconB: root.querySelector(".photo-print-icon-b"),
    text: root.querySelector(".photo-print-text"),
    fontSize: 48
  };
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
  const teaLens = state.lens.name === "抗藍光茶片";

  Object.entries(photoLayers).forEach(([key, layer]) => {
    setSvgHref(layer.frame, frameAsset[key]);
    setSvgHref(layer.temple, templeAsset[key]);
    if (layer.logoPattern) setSvgHref(layer.logoPattern, templeAsset[key]);
    if (layer.logoCoverBase) {
      layer.logoCoverBase.setAttribute("fill", PHOTO_COVER_FILLS[state.temple.name] || PHOTO_COVER_FILLS[DEFAULT_PHOTO_COLOR]);
    }
    layer.lensTints.forEach(shape => {
      shape.style.fill = teaLens ? "rgba(222, 181, 92, .38)" : "transparent";
    });
  });

  const photoMode = state.renderMode === "photo";
  document.getElementById("viewer").classList.toggle("is-photo-mode", photoMode);
  document.getElementById("view-tabs").classList.toggle("is-photo-mode", photoMode);
  document.getElementById("photo-mode-note").hidden = !photoMode;
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
  if (state.textColor !== "rainbow" || typeof document === "undefined") {
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
  const option = TEXT_COLOR_OPTIONS[state.textColor] || TEXT_COLOR_OPTIONS.white;
  const printableValue = value || " ";
  textElement.replaceChildren();
  textElement.setAttributeNS(XML_NS, "xml:space", "preserve");
  textElement.style.fill = option.fill;
  textElement.style.stroke = option.stroke;
  textElement.style.strokeWidth = option.outlineWidth;
  textElement.style.strokeLinejoin = "round";
  textElement.style.paintOrder = "stroke fill";
  textElement.style.vectorEffect = "non-scaling-stroke";

  if (state.textColor !== "rainbow") {
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

function normalizeName(value) {
  const allowed = value.normalize("NFC").replace(/[^A-Za-z0-9 \p{Script=Han}]/gu, "");
  let result = "";
  let units = 0;
  for (const character of Array.from(allowed)) {
    const nextUnits = printUnits(character);
    if (units + nextUnits > 10) break;
    result += character;
    units += nextUnits;
  }
  return { value: result, units };
}

function applyCase(value, mode = state.caseMode) {
  if (mode === "upper") return value.replace(/[A-Za-z]/g, character => character.toUpperCase());
  if (mode === "lower") return value.replace(/[A-Za-z]/g, character => character.toLowerCase());
  return value;
}

function nameCountLabel(name, units) {
  const characters = Array.from(name);
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

function updatePrint() {
  Object.entries(printLayers).forEach(([key, layer]) => {
    const showIcons = state.printMode === "both" || state.printMode === "icon";
    const showName = state.printMode === "both" || state.printMode === "name";
    layer.root.style.display = state.printMode === "none" || key === "front" ? "none" : "inline";

    const selectedFont = PRINT_FONTS[state.font];
    const baseIconSize = layer.fontSize * .88;
    const baseGap = layer.fontSize * .22;
    const baseNameWidth = printTextWidth(state.name || " ", layer.fontSize, selectedFont);
    const firstId = state.order === "normal" ? state.icon1 : state.icon2;
    const secondId = state.order === "normal" ? state.icon2 : state.icon1;
    const baseTotalWidth = showIcons && showName
      ? (baseIconSize * 2) + (baseGap * 2) + baseNameWidth
      : showIcons
        ? (baseIconSize * 2) + baseGap
        : baseNameWidth;
    const fitScale = Math.min(1, (MAX_PRINT_WIDTH[key] || baseTotalWidth) / baseTotalWidth);
    const fontSize = layer.fontSize * fitScale;
    const iconSize = baseIconSize * fitScale;
    const gap = baseGap * fitScale;
    const nameWidth = baseNameWidth * fitScale;
    const totalWidth = baseTotalWidth * fitScale;
    const startX = (PRINT_CENTER_OFFSET[key] || 0) - (totalWidth / 2);

    setSvgHref(layer.iconA, `assets/uv-icons/${firstId}.svg`);
    setSvgHref(layer.iconB, `assets/uv-icons/${secondId}.svg`);
    layer.text.setAttribute("font-family", selectedFont.family);
    layer.text.setAttribute("font-weight", selectedFont.weight);
    layer.text.setAttribute("font-size", String(fontSize));
    layer.text.setAttribute("y", "0");
    applyPrintTextColor(layer.text, state.name);
    layer.iconA.style.display = showIcons ? "inline" : "none";
    layer.iconB.style.display = showIcons ? "inline" : "none";
    layer.text.style.display = showName ? "inline" : "none";

    if (showIcons && showName) {
      positionIcon(layer.iconA, startX, iconSize);
      layer.text.setAttribute("x", String(startX + iconSize + gap));
      positionIcon(layer.iconB, startX + iconSize + gap + nameWidth + gap, iconSize);
    } else if (showIcons) {
      positionIcon(layer.iconA, startX, iconSize);
      positionIcon(layer.iconB, startX + iconSize + gap, iconSize);
    } else {
      layer.text.setAttribute("x", String(startX));
    }
  });

  updatePhotoPrint();
}

function updatePhotoPrint() {
  const layer = photoPrintLayer;
  if (!layer) return;

  const showIcons = state.printMode === "both" || state.printMode === "icon";
  const showName = state.printMode === "both" || state.printMode === "name";
  layer.root.style.display = state.renderMode === "photo" && state.printMode !== "none" ? "inline" : "none";

  const selectedFont = PRINT_FONTS[state.font];
  const baseIconSize = layer.fontSize * .88;
  const baseGap = layer.fontSize * .22;
  const baseNameWidth = printTextWidth(state.name || " ", layer.fontSize, selectedFont);
  const firstId = state.order === "normal" ? state.icon1 : state.icon2;
  const secondId = state.order === "normal" ? state.icon2 : state.icon1;
  const baseTotalWidth = showIcons && showName
    ? (baseIconSize * 2) + (baseGap * 2) + baseNameWidth
    : showIcons
      ? (baseIconSize * 2) + baseGap
      : baseNameWidth;
  const fitScale = Math.min(1, MAX_PRINT_WIDTH.photoA45 / baseTotalWidth);
  const fontSize = layer.fontSize * fitScale;
  const iconSize = baseIconSize * fitScale;
  const gap = baseGap * fitScale;
  const nameWidth = baseNameWidth * fitScale;
  const totalWidth = baseTotalWidth * fitScale;
  const startX = -(totalWidth / 2);
  setSvgHref(layer.iconA, `assets/uv-icons/${firstId}.svg`);
  setSvgHref(layer.iconB, `assets/uv-icons/${secondId}.svg`);
  layer.text.setAttribute("font-family", selectedFont.family);
  layer.text.setAttribute("font-weight", selectedFont.weight);
  layer.text.setAttribute("font-size", String(fontSize));
  layer.text.setAttribute("y", "0");
  applyPrintTextColor(layer.text, state.name);
  layer.iconA.style.display = showIcons ? "inline" : "none";
  layer.iconB.style.display = showIcons ? "inline" : "none";
  layer.text.style.display = showName ? "inline" : "none";

  if (showIcons && showName) {
    positionIcon(layer.iconA, startX, iconSize);
    layer.text.setAttribute("x", String(startX + iconSize + gap));
    positionIcon(layer.iconB, startX + iconSize + gap + nameWidth + gap, iconSize);
  } else if (showIcons) {
    positionIcon(layer.iconA, startX, iconSize);
    positionIcon(layer.iconB, startX + iconSize + gap, iconSize);
  } else {
    layer.text.setAttribute("x", String(startX));
  }
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
  if (state.renderMode === "photo") {
    hint.hidden = true;
    return;
  }
  hint.textContent = "UV 彩印位於左外側鏡腳，請切換「側面」或「左側 45°」查看。";
  hint.hidden = state.view !== "front" || state.printMode === "none";
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
  const usesIcon = state.printMode === "both" || state.printMode === "icon";
  const usesName = state.printMode === "both" || state.printMode === "name";
  document.getElementById("icon-field").hidden = !usesIcon;
  document.getElementById("name-field").hidden = !usesName;
  document.getElementById("text-color-field").hidden = !usesName;
  document.getElementById("font-field").hidden = !usesName;
  document.getElementById("case-field").hidden = !usesName;
  document.getElementById("layout-field").hidden = state.printMode !== "both";
  document.getElementById("picked-print").textContent = MODE_NAMES[state.printMode];
}

function setChip(id, item) {
  const chip = document.getElementById(id);
  chip.style.backgroundColor = item.type === "pattern" ? "#a16238" : item.swatch || item.value;
  chip.style.backgroundImage = item.type === "pattern" ? "url('amber.png')" : "none";
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

function announceAndNotifyParent() {
  const textColorLabel = TEXT_COLOR_OPTIONS[state.textColor]?.label || TEXT_COLOR_OPTIONS.white.label;
  const print = state.printMode === "none"
    ? "不加印刷"
    : `${MODE_NAMES[state.printMode]}${state.printMode !== "name" ? `／圖案 ${state.icon1}+${state.icon2}` : ""}${state.printMode !== "icon" ? `／${state.name || "未輸入名字"}／文字${textColorLabel}` : ""}`;
  const previewMode = state.renderMode === "photo" ? "實拍效果" : "2D 自由配色";
  const summary = `${previewMode}、尺寸 ${state.size}、鏡框 ${state.frame.name}、鏡腳 ${state.temple.name}、鏡片 ${state.lens.name}、${print}`;
  document.getElementById("live-status").textContent = summary;
  window.parent?.postMessage({
    type: "eyefans-customizer-change",
    selection: {
      size: state.size,
      view: state.view,
      renderMode: state.renderMode,
      frame: state.frame.name,
      temple: state.temple.name,
      lens: state.lens.name,
      printMode: state.printMode,
      icon1: state.icon1,
      icon2: state.icon2,
      name: state.name,
      textColor: state.textColor,
      font: state.font,
      caseMode: state.caseMode,
      order: state.order,
      summary
    }
  }, "*");
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
    setActiveButtons(document.getElementById("layout-options"), candidate => candidate === button);
    updateAll();
  });

  document.getElementById("font-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-font]");
    if (!button) return;
    state.font = button.dataset.font;
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
    document.getElementById("name-input").value = state.name;
    setActiveButtons(document.getElementById("case-options"), candidate => candidate === button);
    updateAll();
  });

  const nameInput = document.getElementById("name-input");
  let isNameComposing = false;

  const commitNameInput = () => {
    const normalized = normalizeName(nameInput.value);
    state.nameSource = normalized.value;
    state.name = applyCase(normalized.value);
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
  preparePhotoLayers();
  bindControls();
  syncViewControls();
  syncSizeControls();
  renderSwatches("frame-swatches", FRAME_COLORS, "frame", "picked-frame");
  renderSwatches("temple-swatches", TEMPLE_COLORS, "temple", "picked-temple");
  renderLensOptions();
  renderIconCatalog();
  updateIconSlotUi();
  updateColorAvailability();
  document.getElementById("name-input").style.fontFamily = PRINT_FONTS[state.font].family;

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
