"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const legacySource = fs.readFileSync(path.join(root, "legacy", "index.html"), "utf8");

const expectedPalette = [
  ["櫻花粉", "#dfb4bc"],
  ["粉紫", "#c3b4c7"],
  ["暖黃", "#cdbe54"],
  ["豆綠", "#8f9570"],
  ["深藍", "#2a4360"],
  ["復刻粉", "#be77a1"],
  ["芋頭紫", "#af89b7"],
  ["奶油黃", "#d6a75a"],
  ["薄荷綠", "#638785"],
  ["丹寧藍", "#4e6494"],
  ["梅子", "#a3788c"],
  ["奶茶", "#d7b8a4"],
  ["青釉綠", "#465a4f"],
  ["天藍", "#2c83a6"],
  ["玫瑰", "#965052"],
  ["咖啡牛奶", "#8e7f78"],
  ["枯黃", "#9a8b6a"],
  ["霧面黑", "#272928"],
  ["灰色", "#747474"],
  ["咖啡紅茶", "#7e4b4b"],
  ["霧面白", "#e5e5e3"],
  ["琥珀", "amber", "pattern"]
];

function parsePalette(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  const tail = source.slice(start);
  const end = tail.search(endPattern);
  assert.ok(start >= 0 && end > 0, "palette source block must exist");
  return [...tail.slice(0, end).matchAll(
    /\{ name: "([^"]+)", (?:(type): "pattern", )?value: "([^"]+)"/g
  )].map(([, name, patternType, value]) => patternType
    ? [name, value, "pattern"]
    : [name, value]);
}

const appPalette = parsePalette(appSource, /const FRAME_COLORS = \[/, /const TEMPLE_COLORS/);
const legacyPalette = parsePalette(legacySource, /const COLORS = \[/, /const LENSES/);

assert.deepEqual(appPalette, expectedPalette, "main 2D palette must match the calibrated catalog midtones");
assert.deepEqual(legacyPalette, expectedPalette, "legacy and main 2D palettes must not drift");
assert.match(appSource, /const TEMPLE_COLORS = FRAME_COLORS\.map\(color => \(\{ \.\.\.color \}\)\);/);

for (const retired of ["茶色", "狼棕", "橙黃"]) {
  assert.doesNotMatch(appSource, new RegExp(`name: "${retired}"`));
  assert.doesNotMatch(legacySource, new RegExp(`name: "${retired}"`));
}

for (const [name] of expectedPalette) {
  assert.match(
    appSource,
    new RegExp(`"${name}"\\s*:\\s*rightPhoto\\(`),
    `${name} must retain a matching right-45 photo registration`
  );
}

console.log("Color palette contract passed: catalog-calibrated 22-color parity.");
