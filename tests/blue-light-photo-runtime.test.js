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

const lensSandbox = {};
vm.createContext(lensSandbox);
vm.runInContext(
  `${sourceBetween("const GRAY_LENS_VISUAL", "const VIEW_FILES")}\n`
    + "globalThis.__LENS_COLORS = LENS_COLORS;",
  lensSandbox
);
const lenses = JSON.parse(JSON.stringify(lensSandbox.__LENS_COLORS));
assert.deepEqual(lenses.map(lens => lens.id), ["gray", "blue-tea", "polarized"]);
const grayLens = lenses.find(lens => lens.id === "gray");
const polarizedLens = lenses.find(lens => lens.id === "polarized");
assert.equal(polarizedLens.name, "偏光鏡片");
assert.equal(polarizedLens.priceDelta, 300);
assert.deepEqual(
  {
    value: polarizedLens.value,
    swatch: polarizedLens.swatch,
    photoFill: polarizedLens.photoFill
  },
  { value: grayLens.value, swatch: grayLens.swatch, photoFill: grayLens.photoFill },
  "polarized lens must deliberately reuse the gray-lens 2D and photo appearance"
);
assert.match(
  sourceBetween("function updatePhotoComposite(", "function customizationModeFromLocation("),
  /state\.lens\.id === "blue-tea"/,
  "only anti-blue-light lenses may enable the special photographed coating"
);

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

const PHOTO_MASK_PROFILES = {
  standard: {
    frameFull: "standard/frame-full.png",
    frameShell: "standard/frame-shell.png",
    temple: "standard/temple.png",
    lens: "standard/lens.png"
  },
  amber: {
    frameFull: "amber/frame-full.png",
    frameShell: "amber/frame-shell.png",
    temple: "amber/temple.png",
    lens: "amber/lens.png"
  }
};
const PHOTO_TEMPLE_PAIR_MASKS = {
  "amber:standard": "pairs/amber-frame-standard-temple/temple.png"
};

const sandbox = {
  PHOTO_MASK_PROFILES,
  PHOTO_TEMPLE_PAIR_MASKS,
  setSvgHref(element, href) {
    element.setAttribute("href", href);
  }
};
vm.createContext(sandbox);
vm.runInContext(
  sourceBetween("function photoMaskProfileFor(", "function updatePhotoComposite("),
  sandbox
);

const layer = {
  frameLayer: new FakeElement(),
  frameMaskImage: new FakeElement(),
  templeMaskImage: new FakeElement(),
  lensMaskImage: new FakeElement(),
  blueLightEffect: new FakeElement()
};
const standardFrame = { maskProfile: "standard" };
const standardTemple = { maskProfile: "standard" };
const amberFrame = { maskProfile: "amber" };
const amberTemple = { maskProfile: "amber" };

// The frame selects frame + lens masks, while the temple independently selects
// only the temple mask. Gray lenses must use the complete photographed frame.
sandbox.updateBlueLightPhotoEffect(layer, standardFrame, amberTemple, false);
assert.equal(layer.frameMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.standard.frameFull);
assert.equal(layer.templeMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.temple);
assert.equal(layer.lensMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.standard.lens);
assert.equal(layer.blueLightEffect.hasAttribute("hidden"), true);
assert.equal(layer.blueLightEffect.style.display, "none");

// Blue-light mode switches only the frame from full to shell. The real lens
// aperture remains tied to the frame profile, even with an amber temple.
sandbox.updateBlueLightPhotoEffect(layer, standardFrame, amberTemple, true);
assert.equal(layer.frameMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.standard.frameShell);
assert.equal(layer.templeMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.temple);
assert.equal(layer.lensMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.standard.lens);
assert.equal(layer.blueLightEffect.hasAttribute("hidden"), false);
assert.equal(layer.blueLightEffect.style.display, "inline");
const standardLensHref = layer.lensMaskImage.getAttribute("href");

// Changing the temple profile must not change the lens aperture or frame mask.
sandbox.updateBlueLightPhotoEffect(layer, standardFrame, standardTemple, true);
assert.equal(layer.frameMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.standard.frameShell);
assert.equal(layer.templeMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.standard.temple);
assert.equal(layer.lensMaskImage.getAttribute("href"), standardLensHref);

// Amber has independent raster geometry. Its frame and lens use amber masks,
// while a standard temple uses the pair-specific bridge at both hinge joins.
sandbox.updateBlueLightPhotoEffect(layer, amberFrame, standardTemple, true);
assert.equal(layer.frameMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.frameShell);
assert.equal(layer.templeMaskImage.getAttribute("href"), PHOTO_TEMPLE_PAIR_MASKS["amber:standard"]);
assert.equal(layer.lensMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.lens);

// Returning to gray restores frame-full without disturbing independent masks.
sandbox.updateBlueLightPhotoEffect(layer, amberFrame, standardTemple, false);
assert.equal(layer.frameMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.frameFull);
assert.equal(layer.templeMaskImage.getAttribute("href"), PHOTO_TEMPLE_PAIR_MASKS["amber:standard"]);
assert.equal(layer.lensMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.lens);

// Matching amber temples leave the pair-specific route and restore the normal
// amber temple mask. The reverse standard-frame combination must not opt in.
sandbox.updateBlueLightPhotoEffect(layer, amberFrame, amberTemple, false);
assert.equal(layer.templeMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.temple);
sandbox.updateBlueLightPhotoEffect(layer, standardFrame, amberTemple, false);
assert.equal(layer.templeMaskImage.getAttribute("href"), PHOTO_MASK_PROFILES.amber.temple);

const effectSource = sourceBetween("function updateBlueLightPhotoEffect(", "function updatePhotoComposite(");
assert.doesNotMatch(effectSource, /CLEAR_LENS_GEOMETRY|applyLensGeometry|state\.frame|state\.temple/);

console.log("Blue-light photo runtime passed: raster profiles + full/shell toggle + temple independence.");
