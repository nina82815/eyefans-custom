"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const photoDirectory = path.join(root, "assets", "photos", "right-a45");

const expectedFramePhotos = new Map([
  ["櫻花粉", ["IMG_3594.png", 1448, 1086]],
  ["粉紫", ["IMG_3591.png", 1086, 1448]],
  ["暖黃", ["IMG_3626.png", 1086, 1448]],
  ["豆綠", ["IMG_3603.png", 1086, 1448]],
  ["深藍", ["IMG_3593.png", 1086, 1448]],
  ["復刻粉", ["IMG_3604.png", 1086, 1448]],
  ["芋頭紫", ["IMG_3612.png", 1536, 1024]],
  ["奶油黃", ["IMG_3596.png", 1086, 1448]],
  ["薄荷綠", ["IMG_3620.png", 1448, 1086]],
  ["丹寧藍", ["IMG_3610.png", 1086, 1448]],
  ["梅子", ["IMG_3605.png", 1086, 1448]],
  ["奶茶", ["IMG_3616.png", 1086, 1448]],
  ["青釉綠", ["IMG_3629.png", 1086, 1448]],
  ["天藍", ["IMG_3617.png", 1086, 1448]],
  ["玫瑰", ["IMG_3606.png", 1086, 1448]],
  ["咖啡牛奶", ["IMG_3614.png", 1086, 1448]],
  ["枯黃", ["IMG_3601.png", 1672, 941]],
  ["霧面黑", ["IMG_3589.png", 1086, 1448]],
  ["灰色", ["IMG_3595.png", 1448, 1086]],
  ["咖啡紅茶", ["IMG_3627.png", 1086, 1448]],
  ["霧面白", ["IMG_3621.png", 1448, 1086]],
  ["琥珀", ["IMG_3630.png", 1448, 1086]]
]);

const expectedBlueLightReferences = new Map([
  ["IMG_3631.png", [1086, 1448]],
  ["IMG_3632.png", [1086, 1448]],
  ["IMG_3634.png", [1086, 1448]],
  ["IMG_3635.png", [1536, 1024]]
]);

function pngMetadata(fileName) {
  const buffer = fs.readFileSync(path.join(photoDirectory, fileName));
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    `${fileName} must remain a PNG`
  );
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25]
  };
}

for (const [color, [fileName, width, height]] of expectedFramePhotos) {
  assert.match(
    appSource,
    new RegExp(`"${color}"\\s*:\\s*rightPhoto\\("${fileName.replace(".", "\\.")}"`),
    `${color} must map to ${fileName}`
  );
  const metadata = pngMetadata(fileName);
  assert.deepEqual([metadata.width, metadata.height], [width, height], `${fileName} dimensions changed`);
  assert.equal(metadata.bitDepth, 8, `${fileName} must use 8-bit channels`);
  assert.equal(metadata.colorType, 6, `${fileName} must retain RGBA transparency`);
}

for (const [fileName, [width, height]] of expectedBlueLightReferences) {
  assert.match(appSource, new RegExp(`"${fileName.replace(".", "\\.")}"`));
  const metadata = pngMetadata(fileName);
  assert.deepEqual([metadata.width, metadata.height], [width, height], `${fileName} dimensions changed`);
  assert.equal(metadata.colorType, 6, `${fileName} must retain RGBA transparency`);
}

const registeredPhotos = [...appSource.matchAll(
  /"([^"]+)"\s*:\s*rightPhoto\("([^"]+)",\s*\d+,\s*\d+,\s*\[([^\]]+)\]\)/g
)];
assert.equal(registeredPhotos.length, 22, "every sale color needs one registered photo");
registeredPhotos.forEach(([, color, fileName, alignmentSource]) => {
  const alignment = alignmentSource.split(",").map(value => Number(value.trim()));
  assert.equal(alignment.length, 5, `${color}/${fileName} needs five alignment landmarks`);
  assert.ok(alignment.every(Number.isFinite), `${color}/${fileName} landmarks must be finite`);
  assert.ok(alignment[2] > alignment[1], `${color}/${fileName} near-frame bottom must follow top`);
  assert.ok(alignment[3] > alignment[0], `${color}/${fileName} far-frame center must follow near frame`);
});

assert.equal(expectedFramePhotos.size, 22);
assert.equal(new Set([...expectedFramePhotos.values()].map(value => value[0])).size, 22);
assert.equal(
  fs.readdirSync(photoDirectory).filter(fileName => fileName.endsWith(".png")).length,
  26,
  "right-photo directory must contain 22 frame photos and 4 anti-blue-light references"
);
assert.doesNotMatch(appSource, /DEFAULT_PHOTO_COLOR/, "missing photos must not silently show another color");
assert.match(appSource, /function photoAlignmentMatrix\(/, "photos need frame-landmark registration");
assert.match(appSource, /asset\.alignment/, "placement must use registered landmarks instead of whole-image bounds");
assert.doesNotMatch(appSource, /PHOTO_TARGET_BOUNDS|asset\.bbox/, "whole-image bbox stretching causes frame ghosts");
assert.match(appSource, /BLUE_LIGHT_REFERENCE_FILES/, "anti-blue-light reference photos must be retained");
assert.match(htmlSource, /右側 45° 客製面/);
assert.match(htmlSource, /id="photo-engravetext"/, "photo mode must render UV and engraving content");
assert.match(
  htmlSource,
  /<g id="photo-engravetext" class="photo-print-layer" transform="translate\(390 260\) rotate\(-17\)">/,
  "photo print position and angle must remain calibrated to the outer temple"
);
assert.match(htmlSource, /<g mask="url\(#photo-a45-temple-mask\)">\s*<image class="photo-temple-image"/);
assert.match(htmlSource, /<g mask="url\(#photo-a45-frame-mask\)">\s*<image class="photo-frame-image"/);
assert.match(
  htmlSource,
  /id="photo-a45-temple-reveal"[\s\S]*?<stop offset="43%" stop-color="#ffffff"><\/stop>\s*<stop offset="43%" stop-color="#000000"><\/stop>/,
  "temple must remain opaque beneath the frame fade so the background cannot leak through"
);
assert.match(htmlSource, /class="photo-blue-light-effect"/, "anti-blue-light must use a clean lens-only effect");
assert.doesNotMatch(htmlSource, /photo-blue-light-image/, "full anti-blue-light reference photos must not replace selected frames");
assert.match(htmlSource, /id="photo-a45-blue-light-base"/, "anti-blue-light needs a calibrated coating base");
assert.match(htmlSource, /fill="url\(#photo-a45-blue-light-base\)" opacity="\.26" style="mix-blend-mode:screen"/);
assert.match(htmlSource, /fill="url\(#photo-a45-blue-light-sheen\)" opacity="\.42" style="mix-blend-mode:screen"/);
assert.match(htmlSource, /<ellipse cx="911" cy="343" rx="179" ry="229"/);
assert.match(htmlSource, /<ellipse cx="1352" cy="328" rx="104" ry="201"/);
assert.doesNotMatch(htmlSource, /實拍左側 45°|固定呈現左側 45°/);
assert.doesNotMatch(`${appSource}\n${htmlSource}`, /白水銀|彩虹水銀/);

console.log("Right-photo asset contract passed: 22 frame colors + 4 anti-blue-light references.");
