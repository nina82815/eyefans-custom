"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function declaration(name) {
  const match = source.match(new RegExp(`const ${name} = [\\s\\S]*?;\\n`));
  assert.ok(match, `${name} must remain available to the print layout`);
  return match[0];
}

function implementation(name) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `${name} must remain available to the print layout`);
  return match[0];
}

class FakeElement {
  constructor(tagName, attributes = {}) {
    this.tagName = tagName;
    this.attributes = new Map(Object.entries(attributes));
    this.style = {};
    this.children = [];
    this.value = "";
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  setAttributeNS(namespace, name, value) { this.setAttribute(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.value = ""; this.children = children; }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(""); }

  querySelector(selector) {
    for (const child of this.children) {
      if (selector === child.tagName || selector === `#${child.getAttribute("id")}`) return child;
      const match = child.querySelector(selector);
      if (match) return match;
    }
    return null;
  }
}

// Deterministic canvas advances exercise the measured-width branch. Wide M/W,
// narrow Latin, Han, spaces and kerning deliberately have different widths;
// this is a layout test, not a replacement for browser font/ink-bounds QA.
function measuredAdvance(value, fontSize, family, separateCharacters = false) {
  const familyScale = family.includes("Tsuhsian") ? .78
    : family.includes("Purple Smile") ? .94
      : family.includes("Bakso Sapi") ? .98 : 1;
  let units = 0;
  for (const character of Array.from(value)) {
    units += /\p{Script=Han}/u.test(character) ? 1
      : /[MW]/.test(character) ? .98
        : /[ilI]/.test(character) ? .28
          : character === " " ? .34 : .61;
  }
  if (!separateCharacters) units -= (value.match(/AV/g) || []).length * .055;
  return units * fontSize * familyScale;
}

const canvasContext = {
  font: "",
  measureText(value) {
    const match = this.font.match(/^\S+ ([\d.]+)px (.+)$/);
    assert.ok(match, `canvas must receive a valid print font: ${this.font}`);
    return { width: measuredAdvance(String(value), Number(match[1]), match[2]) };
  }
};
const sandbox = {
  state: {},
  printLayers: {},
  textMeasureContext: undefined,
  document: {
    createElementNS(namespace, tagName) { return new FakeElement(tagName); },
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      return { getContext: () => canvasContext };
    }
  }
};
vm.createContext(sandbox);
const constantNames = [
  "SVG_NS", "XLINK_NS", "XML_NS", "PRINT_FONTS", "PRINT_CENTER_OFFSET",
  "MAX_PRINT_WIDTH", "TEXT_COLOR_OPTIONS", "ENGRAVING_TEXT_STYLE", "RAINBOW_PRINT_COLORS"
];
const functionNames = [
  "svgElement", "setSvgHref", "preparePrintLayer", "effectivePrintMode",
  "effectiveTextStyle", "usesRainbowText", "isCjk", "estimatedTextWidth",
  "measuredTextWidth", "printTextWidth", "applyPrintTextColor", "positionIcon",
  "visiblePrintSequence", "printSequenceWidth", "positionPrintSequence", "updatePrint"
];
vm.runInContext([
  ...constantNames.map(declaration),
  ...functionNames.map(implementation),
  "testConstants = { PRINT_FONTS, PRINT_CENTER_OFFSET, MAX_PRINT_WIDTH };"
].join("\n"), sandbox);
const constants = JSON.parse(JSON.stringify(sandbox.testConstants));

assert.deepEqual(constants.PRINT_CENTER_OFFSET, { front: 0, side: 15, a45: 32, photo: 0 });
assert.deepEqual(constants.MAX_PRINT_WIDTH, { side: 205, a45: 68, photo: 280 });

function attributes(markup) {
  return Object.fromEntries([...markup.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
}

const defaultSandbox = { FRAME_COLORS: [{}], TEMPLE_COLORS: [{}], LENS_COLORS: [{}] };
vm.createContext(defaultSandbox);
vm.runInContext([
  declaration("state"),
  declaration("customizationDrafts"),
  "defaults = { state, uvDraft: customizationDrafts.uv };"
].join("\n"), defaultSandbox);
assert.equal(defaultSandbox.defaults.state.nameSource, "eyefans", "default input must be exact lowercase eyefans");
assert.equal(defaultSandbox.defaults.state.name, "eyefans", "initial rendered name must match the input");
assert.equal(defaultSandbox.defaults.state.caseMode, "preserve", "default text must not be forced to uppercase");
assert.equal(defaultSandbox.defaults.uvDraft.nameSource, "eyefans", "returning to UV must retain the lowercase default");
assert.equal(defaultSandbox.defaults.uvDraft.caseMode, "preserve");
const nameInput = html.match(/<input\b[^>]*\bid="name-input"[^>]*>/)?.[0];
assert.ok(nameInput, "name input must exist");
assert.equal(attributes(nameInput).value, "eyefans", "HTML fallback input must match the runtime default");
assert.match(html, /<span id="name-count">7\/10<\/span>/, "initial count must match the seven-letter default");

const originalTransforms = {};
const expectedModelText = {
  front: { size: 30.4007, scale: 1, transform: "matrix(0.9912 -0.1326 0.1326 0.9912 829.222 476.606)" },
  side: { size: 36.3786, scale: .72, transform: "matrix(0.9903 -0.1392 0.1392 0.9903 714.9219 456.4347)" },
  a45: { size: 22.2902, scale: .82, transform: "matrix(0.981 -0.1941 0.1941 0.981 152.612 230.9299)" }
};

for (const key of ["front", "side", "a45", "photo"]) {
  const assetSource = key === "photo" ? html : fs.readFileSync(path.join(root, `${key}.svg`), "utf8");
  const rootId = key === "photo" ? "photo-engravetext" : "engravetext";
  const group = assetSource.match(new RegExp(`<g([^>]*\\bid="${rootId}"[^>]*)>([\\s\\S]*?)<\\/g>`));
  assert.ok(group, `${key} print root must exist`);
  const textTag = group[2].match(/<text([^>]*)>([\s\S]*?)<\/text>/);
  assert.ok(textTag, `${key} must provide its original text metrics`);
  assert.equal(textTag[2], "eyefans", `${key} fallback preview must show exact lowercase eyefans`);
  const rootElement = new FakeElement("g", attributes(group[1]));
  const sourceText = new FakeElement("text", attributes(textTag[1]));
  sourceText.textContent = textTag[2];
  rootElement.append(sourceText);
  const svg = new FakeElement("svg");
  svg.append(rootElement);
  sandbox.preparePrintLayer(svg, key, `#${rootId}`);
  const layer = sandbox.printLayers[key];
  if (key === "photo") {
    assert.equal(rootElement.getAttribute("transform"), "translate(340 200) rotate(-20)");
    assert.equal(layer.fontSize, 46, "photo print must use the enlarged base font size");
  } else {
    const expected = expectedModelText[key];
    assert.equal(Number.parseFloat(sourceText.getAttribute("font-size")), expected.size);
    assert.equal(layer.fontSize, expected.size * expected.scale, `${key} font scale must remain unchanged`);
    assert.equal(layer.content.getAttribute("transform"), expected.transform, `${key} placement must remain unchanged`);
  }
  originalTransforms[key] = {
    root: layer.root.getAttribute("transform"),
    content: layer.content.getAttribute("transform")
  };
}

const arrangements = [
  { order: "normal", namePosition: "center", sequence: ["icon1", "name", "icon2"] },
  { order: "reverse", namePosition: "center", sequence: ["icon2", "name", "icon1"] },
  { order: "normal", namePosition: "after", sequence: ["icon1", "icon2", "name"] },
  { order: "reverse", namePosition: "after", sequence: ["icon2", "icon1", "name"] },
  { order: "normal", namePosition: "before", sequence: ["name", "icon1", "icon2"] },
  { order: "reverse", namePosition: "before", sequence: ["name", "icon2", "icon1"] }
];
const names = ["eyefans", "PEIYU", "MMMMMMMMMM", "WWWWWWWWWW", "gyqpjgyqpj", "眼睛客製", "AV AV", ""];
const printModes = ["both", "icon", "name", "none"];
let checkedLayouts = 0;

function almostEqual(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} != ${expected}`);
}

function verifyLayout(customizationMode, printMode, font, textColor, name, arrangement) {
  Object.assign(sandbox.state, {
    customizationMode, printMode, font, textColor, name,
    icon1: "01", icon2: "04", order: arrangement.order, namePosition: arrangement.namePosition
  });
  sandbox.updatePrint();
  const mode = customizationMode === "color" ? "none" : customizationMode === "engraving" ? "name" : printMode;
  const showIcons = mode === "both" || mode === "icon";
  const showName = mode === "both" || mode === "name";
  const sequence = arrangement.sequence.filter(item => item === "name" ? showName : showIcons);
  const rainbow = customizationMode === "uv" && textColor === "rainbow";
  const metrics = constants.PRINT_FONTS[font];
  const label = `${customizationMode}/${printMode}/${font}/${textColor}/${name || "empty"}/${arrangement.namePosition}/${arrangement.order}`;

  for (const [key, layer] of Object.entries(sandbox.printLayers)) {
    const visible = mode !== "none" && key !== "front";
    assert.equal(layer.root.style.display, visible ? "inline" : "none", `${key}/${label} root visibility`);
    assert.equal(layer.iconA.style.display, showIcons ? "inline" : "none");
    assert.equal(layer.iconB.style.display, showIcons ? "inline" : "none");
    assert.equal(layer.text.style.display, showName ? "inline" : "none");
    assert.equal(layer.root.getAttribute("transform"), originalTransforms[key].root);
    assert.equal(layer.content.getAttribute("transform"), originalTransforms[key].content);
    assert.equal(layer.text.getAttribute("font-family"), metrics.family);
    assert.equal(layer.text.getAttribute("font-weight"), metrics.weight);
    assert.equal(layer.text.textContent, name || " ");
    assert.equal(layer.iconA.getAttribute("href"), "assets/uv-icons/01.svg");
    assert.equal(layer.iconB.getAttribute("href"), "assets/uv-icons/04.svg");
    assert.equal(layer.text.children.length, rainbow ? Array.from(name || " ").length : 0, "updates must not accumulate rainbow tspans");
    const expectedStroke = customizationMode === "engraving" || textColor === "black" ? "none" : "#111111";
    assert.equal(layer.text.style.stroke, expectedStroke);

    if (!sequence.length) continue;
    const baseNameWidth = Math.max(layer.fontSize * .65, measuredAdvance(name || " ", layer.fontSize, metrics.family, rainbow));
    const baseIconSize = layer.fontSize * .88;
    const baseGap = layer.fontSize * .22;
    const baseWidth = sequence.reduce((sum, item) => sum + (item === "name" ? baseNameWidth : baseIconSize), 0)
      + (baseGap * (sequence.length - 1));
    const maximum = constants.MAX_PRINT_WIDTH[key] || baseWidth;
    const scale = Math.min(1, maximum / baseWidth);
    const fontSize = Number(layer.text.getAttribute("font-size"));
    almostEqual(fontSize, layer.fontSize * scale, `${key}/${label} fit scale`);
    const elements = { icon1: layer.iconA, icon2: layer.iconB, name: layer.text };
    let left;
    let right;
    for (const [index, item] of sequence.entries()) {
      const element = elements[item];
      const x = Number(element.getAttribute("x"));
      const width = item === "name" ? baseNameWidth * scale : Number(element.getAttribute("width"));
      assert.ok(Number.isFinite(x) && Number.isFinite(width) && width > 0, `${key}/${label} finite item bounds`);
      if (index === 0) left = x;
      else almostEqual(x - right, baseGap * scale, `${key}/${label} ordered gap`);
      right = x + width;
      if (item !== "name") {
        almostEqual(width, baseIconSize * scale, `${key}/${label} icon scale`);
        almostEqual(Number(element.getAttribute("height")), width, `${key}/${label} square icon`);
        almostEqual(Number(element.getAttribute("y")), -width * .82, `${key}/${label} icon baseline`);
      }
    }
    assert.ok(right - left <= maximum + 1e-7, `${key}/${label} must fit its safe width`);
    almostEqual((left + right) / 2, constants.PRINT_CENTER_OFFSET[key], `${key}/${label} fixed print center`);
    if (key === "photo") {
      assert.ok(left >= -140 - 1e-7 && right <= 140 + 1e-7, `${label} must not drift toward the photo hinge`);
    }
    checkedLayouts += 1;
  }
}

for (const font of Object.keys(constants.PRINT_FONTS)) {
  for (const name of names) {
    for (const arrangement of arrangements) {
      for (const printMode of printModes) {
        for (const textColor of ["black", "white", "rainbow"]) {
          verifyLayout("uv", printMode, font, textColor, name, arrangement);
        }
      }
    }
  }
}
for (const customizationMode of ["color", "engraving"]) {
  for (const printMode of printModes) {
    for (const arrangement of arrangements) {
      verifyLayout(customizationMode, printMode, "baksoSapi", "rainbow", "WWWWWWWWWW", arrangement);
    }
  }
}

console.log(`Photo print layout passed: ${checkedLayouts} fitted layouts, all fonts/modes/arrangements, and calibrated 2D geometry.`);
