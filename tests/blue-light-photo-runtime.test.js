"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function sourceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} must exist`);
  assert.notEqual(end, -1, `${endMarker} must follow ${startMarker}`);
  return source.slice(start, end);
}

class FakeElement {
  constructor(children = []) {
    this.attributes = new Map();
    this.style = {};
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  toggleAttribute(name, force) {
    if (force) this.attributes.set(name, "");
    else this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  querySelectorAll(selector) {
    assert.equal(selector, "path");
    return this.children;
  }
}

const sandbox = {
  BLUE_LIGHT_LENS_INSET: { horizontal: 2.5, vertical: 3.5 },
  state: { temple: { name: "霧面黑", value: "#0f0f10" } },
  ensureAmberPattern(svg, key) {
    assert.equal(key, "photo");
    assert.ok(svg);
    return "amberPattern-photo";
  }
};
vm.createContext(sandbox);
vm.runInContext(
  sourceBetween("function applyLensGeometry(", "function updatePhotoComposite("),
  sandbox
);

const nearMask = new FakeElement();
const nearClip = new FakeElement();
const farMask = new FakeElement();
const farClip = new FakeElement();
const rearPaths = [new FakeElement(), new FakeElement(), new FakeElement()];
const layer = {
  svg: {},
  frameLayer: new FakeElement(),
  blueLightEffect: new FakeElement(),
  blueLightNearGeometry: [nearMask, nearClip],
  blueLightFarGeometry: [farMask, farClip],
  rearTemple: new FakeElement(rearPaths)
};
const frameAsset = {
  lenses: {
    near: [913, 343, 181, 232, 4.9],
    far: [1349.6, 328.6, 104, 206.6, .8]
  }
};

sandbox.updateBlueLightPhotoEffect(layer, frameAsset, true);
assert.equal(layer.frameLayer.getAttribute("mask"), "url(#photo-a45-frame-clear-mask)");
assert.equal(layer.blueLightEffect.hasAttribute("hidden"), false);
assert.equal(layer.blueLightEffect.style.display, "inline");
assert.equal(nearMask.getAttribute("rx"), "178.5");
assert.equal(nearClip.getAttribute("ry"), "228.5");
assert.equal(nearMask.getAttribute("transform"), "rotate(4.9 913 343)");
assert.equal(farMask.getAttribute("rx"), "101.5");
assert.equal(farClip.getAttribute("ry"), "203.1");
rearPaths.forEach(pathElement => assert.equal(pathElement.getAttribute("fill"), "#0f0f10"));

sandbox.state.temple = { name: "琥珀", type: "pattern", value: "amber" };
sandbox.updateBlueLightPhotoEffect(layer, frameAsset, true);
rearPaths.forEach(pathElement => {
  assert.equal(pathElement.getAttribute("fill"), "url(#amberPattern-photo)");
});

sandbox.updateBlueLightPhotoEffect(layer, frameAsset, false);
assert.equal(layer.frameLayer.getAttribute("mask"), "url(#photo-a45-frame-mask)");
assert.equal(layer.blueLightEffect.hasAttribute("hidden"), true);
assert.equal(layer.blueLightEffect.style.display, "none");

console.log("Blue-light photo runtime passed: fitted masks + clear toggle + temple fill.");
