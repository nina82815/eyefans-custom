"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const normalizedDirectory = path.join(root, "assets", "photos", "right-a45", "normalized");
const manifest = JSON.parse(fs.readFileSync(path.join(normalizedDirectory, "manifest.json"), "utf8"));

const expectedGray = new Map([
  ["櫻花粉", "sakura-pink.png"],
  ["粉紫", "powder-purple.png"],
  ["暖黃", "warm-yellow.png"],
  ["豆綠", "pea-green.png"],
  ["深藍", "deep-blue.png"],
  ["復刻粉", "retro-pink.png"],
  ["芋頭紫", "taro-purple.png"],
  ["奶油黃", "butter-yellow.png"],
  ["薄荷綠", "mint-green.png"],
  ["丹寧藍", "denim-blue.png"],
  ["梅子", "plum.png"],
  ["奶茶", "milk-tea.png"],
  ["青釉綠", "celadon-green.png"],
  ["天藍", "sky-blue.png"],
  ["玫瑰", "rose.png"],
  ["咖啡牛奶", "coffee-milk.png"],
  ["枯黃", "withered-yellow.png"],
  ["霧面黑", "matte-black.png"],
  ["灰色", "gray.png"],
  ["咖啡紅茶", "coffee-black-tea.png"],
  ["霧面白", "matte-white.png"],
  ["琥珀", "amber.png"]
]);

const expectedBlueLight = new Map(expectedGray);

const expectedMasks = {
  standard: {
    "frame-full": "masks/standard/frame-full.png",
    "frame-shell": "masks/standard/frame-shell.png",
    temple: "masks/standard/temple.png",
    lens: "masks/standard/lens.png"
  },
  amber: {
    "frame-full": "masks/amber/frame-full.png",
    "frame-shell": "masks/amber/frame-shell.png",
    temple: "masks/amber/temple.png",
    lens: "masks/amber/lens.png"
  }
};
const expectedPairMasks = {
  "amber-frame-standard-temple": {
    temple: "masks/pairs/amber-frame-standard-temple/temple.png"
  }
};

function pngMetadata(relativePath) {
  const buffer = fs.readFileSync(path.join(normalizedDirectory, relativePath));
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    `${relativePath} must be a PNG`
  );
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
    if (type === "IEND") break;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    chunks
  };
}

function paethPredictor(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function decodePng(relativePath) {
  const metadata = pngMetadata(relativePath);
  assert.equal(metadata.bitDepth, 8, `${relativePath} must use 8-bit channels`);
  const bytesPerPixel = metadata.colorType === 0 ? 1 : metadata.colorType === 6 ? 4 : 0;
  assert.ok(bytesPerPixel, `${relativePath} must be grayscale L8 or RGBA8`);
  const rowBytes = metadata.width * bytesPerPixel;
  const compressed = Buffer.concat(
    metadata.chunks.filter(chunk => chunk.type === "IDAT").map(chunk => chunk.data)
  );
  const filtered = zlib.inflateSync(compressed);
  assert.equal(filtered.length, (rowBytes + 1) * metadata.height, `${relativePath} scanline size mismatch`);
  const pixels = Buffer.alloc(rowBytes * metadata.height);
  let sourceOffset = 0;
  for (let y = 0; y < metadata.height; y += 1) {
    const filter = filtered[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = filtered[sourceOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[rowOffset - rowBytes + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[rowOffset - rowBytes + x - bytesPerPixel]
        : 0;
      let reconstructed;
      if (filter === 0) reconstructed = raw;
      else if (filter === 1) reconstructed = raw + left;
      else if (filter === 2) reconstructed = raw + up;
      else if (filter === 3) reconstructed = raw + Math.floor((left + up) / 2);
      else if (filter === 4) reconstructed = raw + paethPredictor(left, up, upperLeft);
      else assert.fail(`${relativePath} uses unsupported PNG filter ${filter}`);
      pixels[rowOffset + x] = reconstructed & 0xff;
    }
    sourceOffset += rowBytes;
  }
  return { ...metadata, bytesPerPixel, pixels };
}

function assertPhoto(relativePath) {
  const metadata = pngMetadata(relativePath);
  assert.deepEqual([metadata.width, metadata.height], [1643, 686], `${relativePath} must use the canonical canvas`);
  assert.equal(metadata.bitDepth, 8, `${relativePath} must use 8-bit channels`);
  assert.equal(metadata.colorType, 6, `${relativePath} must retain RGBA transparency`);
  assert.ok(
    metadata.chunks.some(chunk => chunk.type === "iCCP" || chunk.type === "sRGB"),
    `${relativePath} must embed an sRGB colour profile`
  );
}

function assertL8Mask(relativePath) {
  const metadata = pngMetadata(relativePath);
  assert.deepEqual([metadata.width, metadata.height], [1643, 686], `${relativePath} must use the canonical canvas`);
  assert.equal(metadata.bitDepth, 8, `${relativePath} must be 8-bit`);
  assert.equal(metadata.colorType, 0, `${relativePath} must be L8 grayscale`);
}

assert.deepEqual(manifest.canvas, [1643, 686]);
assert.match(manifest.orientation, /right-45/);
assert.match(manifest.colourSpace, /sRGB/);
assert.equal(Object.keys(manifest.gray).length, 22);
assert.equal(Object.keys(manifest.blueLight).length, 22);
assert.deepEqual(manifest.logoBrush.bbox, [154, 110, 474, 286]);
assert.ok(manifest.logoBrush.pixels > 25000, "the brush must cover the complete photographed logo");
assert.deepEqual(manifest.masks, {
  ...expectedMasks,
  pairs: expectedPairMasks
});

for (const profile of Object.keys(expectedMasks)) {
  for (const relativePath of Object.values(expectedMasks[profile])) assertL8Mask(relativePath);
  const frameFull = decodePng(expectedMasks[profile]["frame-full"]).pixels;
  const frameShell = decodePng(expectedMasks[profile]["frame-shell"]).pixels;
  const temple = decodePng(expectedMasks[profile].temple);
  assert.ok(
    frameShell.every((value, index) => value <= frameFull[index]),
    `${profile} frame-shell must be a subset of frame-full`
  );
  const innerTempleSeed = profile === "amber" ? { x: 580, y: 470 } : { x: 570, y: 500 };
  assert.ok(
    temple.pixels[(innerTempleSeed.y * temple.width) + innerTempleSeed.x] > 200,
    `${profile} temple mask must retain the shorter inner temple`
  );
  if (profile === "amber") {
    for (let y = 360; y < 410; y += 1) {
      for (let x = 630; x < 650; x += 1) {
        assert.equal(
          temple.pixels[(y * temple.width) + x],
          0,
          "amber inner-temple recovery must not include the adjacent frame strip"
        );
      }
    }

    const amberSource = decodePng("gray/amber.png");
    for (let pixel = 0, alphaOffset = 3; pixel < frameFull.length; pixel += 1, alphaOffset += 4) {
      const sourceAlpha = amberSource.pixels[alphaOffset];
      const frameAlpha = frameFull[pixel];
      const templeAlpha = temple.pixels[pixel];
      if (Math.max(frameAlpha, templeAlpha) !== sourceAlpha) {
        assert.fail(`amber frame/temple masks leave a gap at pixel ${pixel}`);
      }
      assert.equal(
        Math.min(frameAlpha, templeAlpha),
        0,
        `generic amber frame/temple ownership must stay complementary at pixel ${pixel}`
      );
    }

    const amberAt = (pixels, x, y) => pixels[(y * temple.width) + x];
    assert.equal(amberAt(frameFull, 680, 400), 255, "amber lower frame edge must belong to frame");
    assert.equal(amberAt(temple.pixels, 680, 400), 0);
    assert.equal(amberAt(frameFull, 580, 470), 0, "amber shorter inner temple must not belong to frame");
    assert.equal(amberAt(temple.pixels, 580, 470), 255);
  }
}

const pairTemplePath = expectedPairMasks["amber-frame-standard-temple"].temple;
assertL8Mask(pairTemplePath);
const pairTemple = decodePng(pairTemplePath).pixels;
const standardTemple = decodePng(expectedMasks.standard.temple).pixels;
const standardFrameFull = decodePng(expectedMasks.standard["frame-full"]).pixels;
const amberTemple = decodePng(expectedMasks.amber.temple).pixels;
const amberLens = decodePng(expectedMasks.amber.lens).pixels;
let pairAddedPixels = 0;
for (let pixel = 0; pixel < pairTemple.length; pixel += 1) {
  const x = pixel % 1643;
  const y = Math.floor(pixel / 1643);
  const isOuterJoint = x >= 495 && x < 520 && y >= 63 && y < 225;
  const isInnerJoint = x >= 619 && x < 650 && y >= 410 && y < 515;
  assert.ok(pairTemple[pixel] >= standardTemple[pixel], "pair temple must retain the complete standard temple");
  if (pairTemple[pixel] === standardTemple[pixel]) continue;
  pairAddedPixels += 1;
  assert.ok(isOuterJoint || isInnerJoint, `pair bridge escapes hinge ROIs at pixel ${pixel}`);
  assert.equal(amberLens[pixel], 0, `pair bridge must not overlap the lens at pixel ${pixel}`);
  assert.equal(
    pairTemple[pixel],
    Math.max(standardTemple[pixel], Math.min(standardFrameFull[pixel], amberTemple[pixel])),
    `pair bridge must use only source-supported alpha at pixel ${pixel}`
  );
}
assert.ok(pairAddedPixels > 2500 && pairAddedPixels < 5000, "pair bridge must add only the two hinge joins");

const decodedProfiles = Object.fromEntries(
  Object.entries(expectedMasks).map(([profile, masks]) => [profile, {
    frameFull: decodePng(masks["frame-full"]).pixels,
    frameShell: decodePng(masks["frame-shell"]).pixels,
    temple: decodePng(masks.temple).pixels,
    lens: decodePng(masks.lens).pixels
  }])
);

// Check the complete photo print envelope in actual raster coordinates, not
// only its text width. Include glyph overhang, ascenders/descenders and margin
// around the icons so a future photo normalization cannot move it off-temple.
const photoPrintTransform = htmlSource.match(
  /id="photo-engravetext"[^>]*transform="translate\(([\d.-]+) ([\d.-]+)\) rotate\(([\d.-]+)\)"/
);
assert.ok(photoPrintTransform, "photo print layer must declare its calibrated transform");
const [, printX, printY, printAngle] = photoPrintTransform.map(Number);
const photoPrintOffset = Number(appSource.match(/const PRINT_CENTER_OFFSET = \{[^}]*photo: ([\d.-]+)/)?.[1]);
const photoPrintWidth = Number(appSource.match(/const MAX_PRINT_WIDTH = \{[^}]*photo: ([\d.-]+)/)?.[1]);
assert.ok(Number.isFinite(photoPrintOffset) && photoPrintWidth > 0);
const printRadians = printAngle * Math.PI / 180;
const printPixels = new Set();
for (let localX = photoPrintOffset - photoPrintWidth / 2 - 12; localX <= photoPrintOffset + photoPrintWidth / 2 + 12; localX += 1) {
  for (let localY = -58; localY <= 24; localY += 1) {
    const x = Math.round(printX + localX * Math.cos(printRadians) - localY * Math.sin(printRadians));
    const y = Math.round(printY + localX * Math.sin(printRadians) + localY * Math.cos(printRadians));
    const pixel = y * 1643 + x;
    printPixels.add(pixel);
    for (const [profile, masks] of Object.entries(decodedProfiles)) {
      assert.ok(masks.temple[pixel] >= 240, `${profile} print area must stay inside the outer temple at ${x},${y}`);
      assert.equal(masks.frameFull[pixel], 0, `${profile} frame must not overlap the print area at ${x},${y}`);
    }
  }
}

const thresholds = [0, 16, 127, 220];
for (const frameProfile of Object.keys(decodedProfiles)) {
  for (const templeProfile of Object.keys(decodedProfiles)) {
    const frame = decodedProfiles[frameProfile];
    const temple = frameProfile === "amber" && templeProfile === "standard"
      ? pairTemple
      : decodedProfiles[templeProfile].temple;
    for (const threshold of thresholds) {
      for (let pixel = 0; pixel < frame.frameFull.length; pixel += 1) {
        const x = pixel % 1643;
        const y = Math.floor(pixel / 1643);
        const isOuterJoint = x >= 495 && x < 520 && y >= 63 && y < 225;
        const isInnerJoint = x >= 619 && x < 650 && y >= 410 && y < 515;
        if (!isOuterJoint && !isInnerJoint) continue;
        const standardSilhouette = Math.max(
          decodedProfiles.standard.frameFull[pixel],
          decodedProfiles.standard.temple[pixel]
        );
        const amberSilhouette = Math.max(
          decodedProfiles.amber.frameFull[pixel],
          decodedProfiles.amber.temple[pixel]
        );
        const commonSilhouette = Math.min(standardSilhouette, amberSilhouette);
        if (commonSilhouette <= threshold) continue;
        if (Math.max(frame.frameFull[pixel], temple[pixel]) <= threshold) {
          assert.fail(`${frameProfile} frame + ${templeProfile} temple leaves a gray gap at pixel ${pixel}`);
        }
        if (Math.max(frame.frameShell[pixel], frame.lens[pixel], temple[pixel]) <= threshold) {
          assert.fail(`${frameProfile} frame + ${templeProfile} temple leaves a blue-light gap at pixel ${pixel}`);
        }
      }
    }
  }
}

for (const [colour, fileName] of expectedGray) {
  const relativePath = `gray/${fileName}`;
  const expectedProfile = colour === "琥珀" ? "amber" : "standard";
  assertPhoto(relativePath);
  assert.equal(manifest.gray[colour].file, relativePath);
  assert.equal(manifest.gray[colour].maskProfile, expectedProfile, `${colour} must use ${expectedProfile} masks`);
  const mappingPattern = expectedProfile === "amber"
    ? new RegExp(`"${colour}"\\s*:\\s*rightPhoto\\("normalized/gray/${fileName.replace(".", "\\.")}",\\s*"amber"\\)`)
    : new RegExp(`"${colour}"\\s*:\\s*rightPhoto\\("normalized/gray/${fileName.replace(".", "\\.")}"\\)`);
  assert.match(appSource, mappingPattern, `${colour} must use its normalized photo and ${expectedProfile} mask profile`);

  const graySource = decodePng(relativePath).pixels;
  for (const pixel of printPixels) {
    assert.ok(graySource[pixel * 4 + 3] >= 240, `${colour} print envelope must have opaque photographed temple beneath it`);
  }
  if (expectedProfile === "standard") {
    let unsupportedPairPixels = 0;
    for (let pixel = 0, alphaOffset = 3; pixel < pairTemple.length; pixel += 1, alphaOffset += 4) {
      const pairAddsVisibleTemple = pairTemple[pixel] > 16 && standardTemple[pixel] <= 16;
      if (pairAddsVisibleTemple && graySource[alphaOffset] <= 16) unsupportedPairPixels += 1;
    }
    assert.ok(
      unsupportedPairPixels <= 8,
      `${colour} must provide photographed colour beneath the pair bridge; unsupported pixels=${unsupportedPairPixels}`
    );
  }
}

for (const [colour, fileName] of expectedBlueLight) {
  const relativePath = `blue-light/${fileName}`;
  const expectedProfile = colour === "琥珀" ? "amber" : "standard";
  assertPhoto(relativePath);
  assert.equal(manifest.blueLight[colour].file, relativePath);
  assert.equal(manifest.blueLight[colour].maskProfile, expectedProfile);
  assert.equal(manifest.blueLight[colour].lensOnly, true);
  assert.equal(manifest.blueLight[colour].alphaMatchesLensMask, true);
  assert.match(manifest.blueLight[colour].normalization, /de-screened with low-frequency chroma/);

  const bluePixels = decodePng(relativePath).pixels;
  const lensPixels = decodePng(expectedMasks[expectedProfile].lens).pixels;
  for (let pixel = 0, alphaOffset = 3; pixel < lensPixels.length; pixel += 1, alphaOffset += 4) {
    assert.equal(
      bluePixels[alphaOffset],
      lensPixels[pixel],
      `${relativePath} alpha must equal ${expectedProfile} lens mask at pixel ${pixel}`
    );
  }

  const mappingPattern = expectedProfile === "amber"
    ? new RegExp(`"${colour}"\\s*:\\s*rightPhoto\\("normalized/blue-light/${fileName.replace(".", "\\.")}",\\s*"amber"\\)`)
    : new RegExp(`"${colour}"\\s*:\\s*rightPhoto\\("normalized/blue-light/${fileName.replace(".", "\\.")}"\\)`);
  assert.match(appSource, mappingPattern, `${colour} must retain its lens-only anti-blue-light reference`);
}

assert.match(appSource, /const PHOTO_ASSET_VERSION = "20260830a";/);
assert.match(appSource, /const PHOTO_MASK_PROFILES = Object\.freeze\(/);
assert.match(appSource, /const PHOTO_TEMPLE_PAIR_MASKS = Object\.freeze\(/);
assert.match(appSource, /function rightPhoto\(file, maskProfile = "standard"\)/);
assert.match(appSource, /function photoMaskProfileFor\(/);
assert.match(appSource, /function photoTempleMaskFor\(/);
assert.match(appSource, /frameMaskImage:/);
assert.match(appSource, /templeMaskImage:/);
assert.match(appSource, /lensMaskImage:/);
assert.match(appSource, /REGISTERED_PHOTO_CANVAS = Object\.freeze\(\{ width: 1643, height: 686 \}\)/);
assert.match(appSource, /REGISTERED_PHOTO_ALIGNMENT = Object\.freeze\(\[900, 65, 625, 1352, 330\]\)/);
assert.match(appSource, /function blueLightPhotoAssetFor\(/);
assert.match(appSource, /BLUE_LIGHT_PHOTO_ASSETS\[color\.name\] \|\| BLUE_LIGHT_PHOTO_ASSETS\["霧面黑"\]/);
assert.doesNotMatch(appSource, /CLEAR_LENS_GEOMETRY|applyLensGeometry/);
assert.doesNotMatch(appSource, /canonicalPhotoJoint|photoTempleJoinTransform|photoJoinPaths|applyPhotoJoin/);
assert.doesNotMatch(appSource, /asset\.joint/, "pixel-registered photos must not be stretched at the hinge");

const photoMarkupStart = htmlSource.indexOf('<svg class="photo-composite"');
const photoMarkupEnd = htmlSource.indexOf("</svg>", photoMarkupStart);
assert.notEqual(photoMarkupStart, -1, "photo composite must exist");
assert.notEqual(photoMarkupEnd, -1, "photo composite must close");
const photoMarkup = htmlSource.slice(photoMarkupStart, photoMarkupEnd);

for (const relativePath of [
  expectedMasks.standard["frame-full"],
  expectedMasks.standard.temple,
  expectedMasks.standard.lens
]) {
  assert.match(photoMarkup, new RegExp(`${relativePath.replaceAll("/", "\\/")}\\?v=20260830a`));
}
assert.match(photoMarkup, /normalized\/gray\/sakura-pink\.png\?v=20260830a/);
assert.match(photoMarkup, /normalized\/blue-light\/matte-black\.png\?v=20260830a/);
assert.match(photoMarkup, /class="photo-blue-light-effect" mask="url\(#photo-a45-lens-mask\)" hidden/);
assert.match(photoMarkup, /class="photo-frame-layer" mask="url\(#photo-a45-frame-mask\)"/);
assert.match(photoMarkup, /<g mask="url\(#photo-a45-temple-mask\)">\s*<image class="photo-temple-image"/);
assert.doesNotMatch(photoMarkup, /<ellipse\b/);
assert.doesNotMatch(
  photoMarkup,
  /photo-a45-frame-clear-mask|photo-a45-clear-lens-clip|photo-blue-light-(?:near|far)-(?:mask|clip)/
);
assert.doesNotMatch(photoMarkup, /clip-path=/);
assert.doesNotMatch(photoMarkup, /photo-frame-region|photo-temple-region|photo-a45-lens-texture/);

const preparationScript = fs.readFileSync(path.join(root, "scripts", "prepare_right_a45_assets.py"), "utf8");
assert.match(preparationScript, /ImageOps\.mirror/);
assert.match(preparationScript, /repair_solid_logo/);
assert.match(preparationScript, /make_final_blue_light_asset/);
assert.match(preparationScript, /normalized_blur/);
assert.match(preparationScript, /MinFilter\(21\)/);
assert.match(preparationScript, /alphaMatchesLensMask/);
assert.match(preparationScript, /temple_bridge_to_amber/);
assert.match(preparationScript, /amber-frame-standard-temple/);
assert.doesNotMatch(preparationScript, /茶色|橙黃|狼棕/, "discontinued colours must not return to the batch");

console.log("right photo raster-mask asset contract tests passed");
