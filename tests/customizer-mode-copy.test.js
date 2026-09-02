"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.join(__dirname, "..");
const htmlSource = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");

function declaration(name) {
  const match = appSource.match(new RegExp(`(?:const|let) ${name} = [\\s\\S]*?;\\n`));
  assert.ok(match, `${name} must remain declared`);
  return match[0];
}

const context = {};
vm.createContext(context);
vm.runInContext(`${declaration("CUSTOMIZATION_MODES")}this.result = CUSTOMIZATION_MODES;`, context);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.result)),
  {
    color: {
      label: "框腳配色",
      shortLabel: "純配色",
      headerDescription: "自由配色・即時預覽"
    },
    engraving: {
      label: "框腳配色＋雷雕",
      shortLabel: "白色雷雕",
      headerDescription: "自由配色・英文雷雕預覽"
    },
    uv: {
      label: "框腳配色＋UV 彩印",
      shortLabel: "UV 彩印",
      headerDescription: "自由配色・UV 彩印預覽"
    }
  }
);
assert.match(htmlSource, /<p id="mode-description">自由配色・UV 彩印預覽<\/p>/);
assert.match(
  appSource,
  /document\.getElementById\("mode-description"\)\.textContent = config\.headerDescription;/
);
assert.match(htmlSource, /<script src="app\.js\?v=20260902a" defer><\/script>/);

console.log("customizer mode-specific header copy contract passed");
