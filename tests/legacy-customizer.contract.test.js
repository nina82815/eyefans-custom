"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const legacyFile = path.join(root, "legacy", "index.html");
const source = fs.readFileSync(legacyFile, "utf8");

assert.match(source, /eYeFANS 客製化配色模擬器/);
assert.match(source, /舊版商品專用/);
assert.match(source, /fetch\(`\.\.\/\$\{key\}\.svg`/);
assert.match(source, /href", "\.\.\/amber\.png"/);
assert.match(source, /patternUnits", "userSpaceOnUse"/);
assert.match(source, /patternContentUnits", "userSpaceOnUse"/);
assert.match(source, /pattern\.setAttribute\("width", "400"\)/);
assert.match(source, /if \(href === "amber\.png"\)/);
assert.match(source, /xlink:href", "\.\.\/amber\.png"/);
assert.match(source, /鏡框顏色/);
assert.match(source, /鏡腳顏色/);
assert.match(source, /鏡片顏色/);
assert.match(source, /三號灰片/);
assert.match(source, /抗藍光鏡片/);
assert.match(source, /querySelector\("#engravetext"\)\?\.setAttribute\("display", "none"\)/);
assert.doesNotMatch(source, /UV 彩印|雷雕|加入購物車|名字/);
assert.doesNotMatch(source, /茶色|狼棕|橙黃/);

const colorEntries = [...source.matchAll(/\{ name: "([^"]+)", (?:type: "pattern", )?value: /g)]
  .map(match => match[1])
  .filter(name => name !== "三號灰片" && name !== "抗藍光鏡片");
assert.equal(colorEntries.length, 22, "legacy simulator must retain exactly 22 sale colors");
assert.equal(new Set(colorEntries).size, 22, "legacy sale colors must be unique");

["front.svg", "side.svg", "a45.svg", "amber.png"].forEach(fileName => {
  assert.ok(fs.existsSync(path.join(root, fileName)), `${fileName} must support the legacy route`);
});

console.log("Legacy customizer contract passed: color-only UI + 22 sale colors.");
