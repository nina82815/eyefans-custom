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

function htmlElementBlock(tagName, id) {
  const match = htmlSource.match(new RegExp(`<${tagName} id="${id}"[^>]*>[\\s\\S]*?<\\/${tagName}>`));
  assert.ok(match, `${tagName}#${id} must exist`);
  return match[0];
}

function ellipseGeometry(block, className) {
  const elementMatch = block.match(new RegExp(`<ellipse class="${className}"([^>]*)>`));
  assert.ok(elementMatch, `${className} must exist in its calibrated mask or clip`);
  const attributes = Object.fromEntries(
    [...elementMatch[1].matchAll(/([\w-]+)="([^"]+)"/g)].map(([, name, value]) => [name, value])
  );
  const rotation = attributes.transform?.match(/^rotate\(([-.\d]+) ([-.\d]+) ([-.\d]+)\)$/);
  assert.ok(rotation, `${className} must rotate around its own fitted center`);
  assert.deepEqual(
    [Number(rotation[2]), Number(rotation[3])],
    [Number(attributes.cx), Number(attributes.cy)],
    `${className} rotation center must match cx/cy`
  );
  return [
    Number(attributes.cx),
    Number(attributes.cy),
    Number(attributes.rx),
    Number(attributes.ry),
    Number(rotation[1])
  ];
}

function countElements(block, tagName) {
  return [...block.matchAll(new RegExp(`<${tagName}\\b`, "g"))].length;
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
  /"([^"]+)"\s*:\s*rightPhoto\("([^"]+)",\s*\d+,\s*\d+,\s*\[([^\]]+)\],\s*\[([^\]]+)\],\s*\[([^\]]+)\]\)/g
)];
assert.equal(registeredPhotos.length, 22, "every sale color needs one registered photo");
registeredPhotos.forEach(([, color, fileName, alignmentSource, nearLensSource, farLensSource]) => {
  const alignment = alignmentSource.split(",").map(value => Number(value.trim()));
  assert.equal(alignment.length, 5, `${color}/${fileName} needs five alignment landmarks`);
  assert.ok(alignment.every(Number.isFinite), `${color}/${fileName} landmarks must be finite`);
  assert.ok(alignment[2] > alignment[1], `${color}/${fileName} near-frame bottom must follow top`);
  assert.ok(alignment[3] > alignment[0], `${color}/${fileName} far-frame center must follow near frame`);
  [nearLensSource, farLensSource].forEach((geometrySource, index) => {
    const geometry = geometrySource.split(",").map(value => Number(value.trim()));
    assert.equal(geometry.length, 5, `${color}/${fileName} ${index ? "far" : "near"} lens needs five fitted values`);
    assert.ok(geometry.every(Number.isFinite), `${color}/${fileName} lens geometry must be finite`);
    assert.ok(geometry[2] > 90 && geometry[3] > 190, `${color}/${fileName} lens radii must be plausible`);
    const [cx, cy, fittedRx, fittedRy, rotation] = geometry;
    const coatedRx = fittedRx + 2;
    const coatedRy = fittedRy + 1;
    const radians = rotation * (Math.PI / 180);
    const boundX = Math.hypot(coatedRx * Math.cos(radians), coatedRy * Math.sin(radians));
    const boundY = Math.hypot(coatedRx * Math.sin(radians), coatedRy * Math.cos(radians));
    assert.ok(
      cx - boundX >= 700 && cx + boundX <= 1550 && cy - boundY >= 80 && cy + boundY <= 600,
      `${color}/${fileName} ${index ? "far" : "near"} coated lens must remain inside the coating texture bounds`
    );
  });
});
const defaultPhotoRegistration = registeredPhotos.find(([, color]) => color === "櫻花粉");
assert.ok(defaultPhotoRegistration, "the default photo color must remain registered");
const defaultNearLens = defaultPhotoRegistration[4].split(",").map(value => Number(value.trim()));
const defaultFarLens = defaultPhotoRegistration[5].split(",").map(value => Number(value.trim()));

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
assert.match(htmlSource, /<g class="photo-frame-layer" mask="url\(#photo-a45-frame-mask\)">\s*<image class="photo-frame-image"/);
assert.doesNotMatch(
  htmlSource,
  /id="photo-a45-(?:frame|temple)-reveal"/,
  "frame and temple photos must not return to a fixed percentage split"
);
const frameRegionPath = "M 588 0 H 1643 V 686 H 704 C 673 522 660 430 655 354 C 653 310 647 273 632 239 C 618 207 604 177 596 143 C 588 108 586 58 588 0 Z";
const templeRegionPath = "M 0 0 H 588 C 586 58 588 108 596 143 C 604 177 618 207 632 239 C 647 273 653 310 655 354 C 660 430 673 522 704 686 H 0 Z";
const frameMaskBlock = htmlElementBlock("mask", "photo-a45-frame-mask");
const clearFrameMaskBlock = htmlElementBlock("mask", "photo-a45-frame-clear-mask");
const templeMaskBlock = htmlElementBlock("mask", "photo-a45-temple-mask");
const clearLensClipBlock = htmlElementBlock("clipPath", "photo-a45-clear-lens-clip");
const framePathMarkup = `class="photo-frame-region" d="${frameRegionPath}" fill="#ffffff" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"`;
const templePathMarkup = `class="photo-temple-region" d="${templeRegionPath}" fill="#ffffff"`;
[frameMaskBlock, clearFrameMaskBlock, templeMaskBlock].forEach(maskBlock => {
  assert.match(maskBlock, /maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" style="mask-type:luminance"/);
});
assert.ok(frameMaskBlock.includes(framePathMarkup), "normal frame mask must use the calibrated hinge contour and overlap hairline");
assert.ok(clearFrameMaskBlock.includes(framePathMarkup), "clear frame mask must use the same calibrated hinge contour and overlap hairline");
assert.ok(templeMaskBlock.includes(templePathMarkup), "temple mask must use the complementary hinge contour");
assert.doesNotMatch(templeMaskBlock, /stroke=/, "the overlap may extend only the top frame layer toward the temple");
assert.doesNotMatch(frameMaskBlock, /photo-blue-light-(?:near|far)-mask/, "gray-lens frame mask must not cut lens holes");
assert.deepEqual(
  [countElements(frameMaskBlock, "path"), countElements(frameMaskBlock, "ellipse"), countElements(frameMaskBlock, "rect")],
  [1, 0, 0],
  "normal frame mask must contain only its calibrated region"
);
assert.deepEqual(
  [countElements(clearFrameMaskBlock, "path"), countElements(clearFrameMaskBlock, "ellipse"), countElements(clearFrameMaskBlock, "rect")],
  [1, 2, 0],
  "clear frame mask must contain one frame region and exactly two lens holes"
);
assert.deepEqual(
  [countElements(templeMaskBlock, "path"), countElements(templeMaskBlock, "ellipse"), countElements(templeMaskBlock, "rect")],
  [1, 0, 0],
  "temple mask must contain only its calibrated region"
);
assert.deepEqual(
  [countElements(clearLensClipBlock, "path"), countElements(clearLensClipBlock, "ellipse"), countElements(clearLensClipBlock, "rect")],
  [0, 2, 0],
  "clear-lens effect clip must contain exactly the two fitted lenses"
);
assert.match(
  clearFrameMaskBlock,
  /photo-frame-region[\s\S]*?photo-blue-light-near-mask[\s\S]*?photo-blue-light-far-mask/,
  "clear frame mask must draw the frame contour before cutting both lens holes"
);
assert.match(clearFrameMaskBlock, /photo-blue-light-near-mask[^>]*fill="#000000"/);
assert.match(clearFrameMaskBlock, /photo-blue-light-far-mask[^>]*fill="#000000"/);
const defaultPhotoFile = defaultPhotoRegistration[2].replace(".", "\\.");
["photo-temple-image", "photo-frame-image", "photo-blue-light-source-image"].forEach(className => {
  assert.match(
    htmlSource,
    new RegExp(`<image class="${className}" href="assets/photos/right-a45/${defaultPhotoFile}\\?v=20260827d"`),
    `${className} must initialize from the current registered default photo`
  );
});
assert.match(appSource, /const PHOTO_ASSET_VERSION = "20260827d";/);
assert.match(
  appSource,
  /a45: `assets\/photos\/right-a45\/\$\{file\}\?v=\$\{PHOTO_ASSET_VERSION\}`/,
  "every selected photo needs the same cache-busting asset version"
);
assert.match(appSource, /frame:\s*FRAME_COLORS\[0\]/);
assert.match(appSource, /temple:\s*TEMPLE_COLORS\[0\]/);
assert.match(htmlSource, /class="photo-blue-light-effect"/, "anti-blue-light must use a clean lens-only effect");
assert.match(
  htmlSource,
  /<g class="photo-blue-light-effect" clip-path="url\(#photo-a45-clear-lens-clip\)" hidden>/,
  "blue-light effect must stay hidden until the blue-light lens is selected"
);
assert.doesNotMatch(htmlSource, /photo-blue-light-image/, "full anti-blue-light reference photos must not replace selected frames");
assert.match(htmlSource, /id="photo-a45-frame-clear-mask"/, "clear lenses must remove the original dark photo lenses");
assert.match(htmlSource, /class="photo-blue-light-near-mask"/);
assert.match(htmlSource, /class="photo-blue-light-far-mask"/);
assert.match(htmlSource, /class="photo-blue-light-near-clip"/);
assert.match(htmlSource, /class="photo-blue-light-far-clip"/);
assert.match(htmlSource, /id="photo-a45-clear-coating"/, "anti-blue-light needs a calibrated clear coating");
assert.match(htmlSource, /id="photo-a45-rear-temple" opacity="\.38"/, "clear lenses must visibly recreate the selected rear temple without flattening the lens texture");
assert.match(htmlSource, /class="photo-blue-light-sheen"/, "clear lenses need a blue-purple reflection sheen");
assert.match(
  htmlSource,
  /class="photo-blue-light-source-image"[^>]*opacity="\.24"[^>]*filter="url\(#photo-a45-lens-texture\)"/,
  "clear lenses must retain a subtle photographic texture instead of becoming empty holes"
);
assert.match(htmlSource, /id="photo-a45-crisp-color"/, "photo colors need a crisp alpha and contrast filter");
const crispColorFilterBlock = htmlElementBlock("filter", "photo-a45-crisp-color");
assert.doesNotMatch(
  crispColorFilterBlock,
  /<feColorMatrix\b|<feFunc[RGB]\b/,
  "the shared edge filter must not recolor calibrated source photos"
);
assert.match(
  crispColorFilterBlock,
  /<feFuncA type="linear" slope="1\.18" intercept="-\.09"><\/feFuncA>/,
  "the shared photo filter may tighten only the transparent edge"
);
assert.match(
  htmlSource,
  /class="photo-temple-image"[^>]*filter="url\(#photo-a45-crisp-color\)"[\s\S]*?class="photo-frame-image"[^>]*filter="url\(#photo-a45-crisp-color\)"/,
  "both photo layers must use the same edge treatment"
);
assert.match(
  htmlSource,
  /class="photo-blue-light-effect"[\s\S]*?id="photo-a45-rear-temple"[\s\S]*?class="photo-blue-light-source-image"[\s\S]*?class="photo-blue-light-coating"[\s\S]*?class="photo-blue-light-sheen"/,
  "clear-lens depth order must be rear temple, photographic texture, coating, then sheen"
);
const templeLayerIndex = htmlSource.indexOf('<g mask="url(#photo-a45-temple-mask)">');
const blueLightLayerIndex = htmlSource.indexOf('<g class="photo-blue-light-effect"');
const frameLayerIndex = htmlSource.indexOf('<g class="photo-frame-layer"');
const printLayerIndex = htmlSource.indexOf('<g id="photo-engravetext"');
assert.ok(
  templeLayerIndex < blueLightLayerIndex
    && blueLightLayerIndex < frameLayerIndex
    && frameLayerIndex < printLayerIndex,
  "photo depth order must be temple, lens effect, crisp frame, then customization print"
);
assert.match(
  htmlSource,
  /id="photo-a45-clear-coating"[\s\S]*?stop-opacity="\.18"[\s\S]*?stop-opacity="\.08"[\s\S]*?stop-opacity="\.14"[\s\S]*?stop-opacity="\.09"/,
  "clear coating must remain translucent instead of whitening the lens"
);
assert.match(
  htmlSource,
  /id="photo-a45-blue-light-sheen"[\s\S]*?offset="43%"[\s\S]*?offset="49%"[\s\S]*?offset="56%"/,
  "blue-light color must remain a localized reflection band"
);
assert.match(
  appSource,
  /PRINT_CENTER_OFFSET\s*=\s*\{[^}]*a45:\s*32,[^}]*photo:\s*85[^}]*\}/,
  "45-degree model must stay centered on the temple while the photo remains forward"
);
assert.match(
  appSource,
  /MAX_PRINT_WIDTH\s*=\s*\{[^}]*a45:\s*68,[^}]*photo:\s*320[^}]*\}/,
  "long names and icons must shrink before they touch the temple edge"
);
assert.match(appSource, /blueLightSource:\s*svg\.querySelector\("\.photo-blue-light-source-image"\)/);
assert.match(appSource, /applyPhotoPlacement\(layer\.blueLightSource, frameAsset\)/);
assert.match(
  appSource,
  /BLUE_LIGHT_LENS_OUTSET\s*=\s*Object\.freeze\(\{\s*horizontal:\s*2,\s*vertical:\s*1\s*\}\)/,
  "clear-lens masks must cover the photographed pressure ring without reaching the outer frame"
);
const expectedDefaultNearLens = [...defaultNearLens];
const expectedDefaultFarLens = [...defaultFarLens];
[expectedDefaultNearLens, expectedDefaultFarLens].forEach(geometry => {
  geometry[2] += 2;
  geometry[3] += 1;
});
assert.deepEqual(
  ellipseGeometry(clearFrameMaskBlock, "photo-blue-light-near-mask"),
  expectedDefaultNearLens,
  "the initial near-lens hole must match the registered default photo geometry"
);
assert.deepEqual(
  ellipseGeometry(clearFrameMaskBlock, "photo-blue-light-far-mask"),
  expectedDefaultFarLens,
  "the initial far-lens hole must match the registered default photo geometry"
);
assert.deepEqual(
  ellipseGeometry(clearLensClipBlock, "photo-blue-light-near-clip"),
  expectedDefaultNearLens,
  "the initial near-lens effect clip must match its frame hole exactly"
);
assert.deepEqual(
  ellipseGeometry(clearLensClipBlock, "photo-blue-light-far-clip"),
  expectedDefaultFarLens,
  "the initial far-lens effect clip must match its frame hole exactly"
);
assert.match(appSource, /function applyLensGeometry\(/, "each frame color needs its fitted lens outline");
assert.match(appSource, /frameAsset\.lenses\.near/);
assert.match(appSource, /frameAsset\.lenses\.far/);
assert.match(appSource, /photo-a45-frame-clear-mask/, "blue-light mode must switch the frame to a lens-hole mask");
assert.match(appSource, /state\.temple\.type === "pattern"/, "rear-temple color must follow the selected temple");
assert.doesNotMatch(htmlSource, /photo-a45-blue-light-base|opacity="\.26" style="mix-blend-mode:screen"/);
assert.doesNotMatch(htmlSource, /實拍左側 45°|固定呈現左側 45°/);
assert.doesNotMatch(`${appSource}\n${htmlSource}`, /白水銀|彩虹水銀/);

console.log("Right-photo asset contract passed: 22 frame colors + 4 anti-blue-light references.");
