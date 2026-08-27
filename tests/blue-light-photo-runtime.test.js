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
  constructor() {
    this.attributes = new Map();
    this.style = {};
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
}

const sandbox = {
  CLEAR_LENS_GEOMETRY: {
    "櫻花粉": {
      near: [909.7, 344.2, 191.5, 234.9, 5.7],
      far: [1350.6, 320, 107.2, 217.9, -1]
    }
  },
  state: {
    frame: { name: "櫻花粉" },
    temple: { name: "霧面黑", value: "#0f0f10" }
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
const layer = {
  frameLayer: new FakeElement(),
  blueLightEffect: new FakeElement(),
  blueLightNearGeometry: [nearMask, nearClip],
  blueLightFarGeometry: [farMask, farClip]
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
assert.equal(nearMask.getAttribute("rx"), "191.5");
assert.equal(nearClip.getAttribute("ry"), "234.9");
assert.equal(nearMask.getAttribute("transform"), "rotate(5.7 909.7 344.2)");
assert.equal(nearMask.getAttribute("cx"), nearClip.getAttribute("cx"));
assert.equal(nearMask.getAttribute("cy"), nearClip.getAttribute("cy"));
assert.equal(nearMask.getAttribute("rx"), nearClip.getAttribute("rx"));
assert.equal(nearMask.getAttribute("ry"), nearClip.getAttribute("ry"));
assert.equal(nearMask.getAttribute("transform"), nearClip.getAttribute("transform"));
assert.equal(farMask.getAttribute("rx"), "107.2");
assert.equal(farClip.getAttribute("ry"), "217.9");
assert.equal(farMask.getAttribute("cx"), farClip.getAttribute("cx"));
assert.equal(farMask.getAttribute("cy"), farClip.getAttribute("cy"));
assert.equal(farMask.getAttribute("rx"), farClip.getAttribute("rx"));
assert.equal(farMask.getAttribute("ry"), farClip.getAttribute("ry"));
assert.equal(farMask.getAttribute("transform"), farClip.getAttribute("transform"));
sandbox.state.temple = { name: "琥珀", type: "pattern", value: "amber" };
sandbox.updateBlueLightPhotoEffect(layer, frameAsset, true);
assert.equal(nearMask.getAttribute("rx"), "191.5", "temple color must not change lens geometry");
assert.equal(farMask.getAttribute("ry"), "217.9", "temple pattern must not leak into clear lenses");

const effectSource = sourceBetween("function updateBlueLightPhotoEffect(", "function updatePhotoComposite(");
assert.doesNotMatch(effectSource, /state\.temple|rearTemple|ensureAmberPattern/);

sandbox.updateBlueLightPhotoEffect(layer, frameAsset, false);
assert.equal(layer.frameLayer.getAttribute("mask"), "url(#photo-a45-frame-mask)");
assert.equal(layer.blueLightEffect.hasAttribute("hidden"), true);
assert.equal(layer.blueLightEffect.style.display, "none");

console.log("Blue-light photo runtime passed: per-frame masks + clear toggle + temple independence.");
