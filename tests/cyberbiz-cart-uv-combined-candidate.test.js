"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const integrationDir = path.join(__dirname, "..", "integration");

function read(filename) {
  return fs.readFileSync(path.join(integrationDir, filename), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sri(value) {
  return `sha384-${crypto.createHash("sha384").update(value).digest("base64")}`;
}

const legacyLiveTest = read("cyberbiz-cart-live-test-loader.js");
const v2Core = read("cyberbiz-cart-production-loader-20260901-polarized-v2.js");
const v3Core = read("cyberbiz-cart-production-loader-20260904-uv-combined-v3.js");
const v3TestEntry = read("cyberbiz-cart-uv-combined-live-test-loader-20260904-v1.js");
const guide = read("CYBERBIZ_CART_UV_COMBINED_CANDIDATE_V3_20260904.md");

assert.equal(
  sha256(legacyLiveTest),
  "1045dfcdef6c56654c01166bd2ccb0e301d63d9a6e4b3628463d9c6831444052",
  "the currently installed legacy live-test URL must remain byte-identical"
);
assert.equal(
  sri(legacyLiveTest),
  "sha384-93DoDhGIm3jZC3723gA0VEG1wEC9ZjlMxTeSM/BaNlGofa9o3rx6R6Jtt4oQ2HPX"
);
assert.equal(
  sha256(v2Core),
  "00689233056c418e6e421d4923ec2ab20abb739cdb59afe31e5290e02b5b248f",
  "the v2 candidate core must remain byte-identical"
);

const expectedV3Sha256 = "b0afb8f5c1272c20866efd719dab1594ea4ba305ff1b09e3f785a03bc83b6a42";
const expectedV3Sri = "sha384-6AKlbXT4bNgOyrQiWHPG5zpsHnS957HgKCj8Bp3cDsrQsqLUthkqP+o9jJ00iId1";
const expectedEntrySha256 = "4d08f5110f5884540794e21c3972b1b408bb542161650ae30153a31ccbc9eb13";
const expectedEntrySri = "sha384-Gf/APm/3aS3vP0b8L58VXRDwDGOIBGoMAt5vK/VP+mUl53Vy8OUt+j9EXzh7Niuz";

assert.equal(sha256(v3Core), expectedV3Sha256);
assert.equal(sri(v3Core), expectedV3Sri);
assert.equal(sha256(v3TestEntry), expectedEntrySha256);
assert.equal(sri(v3TestEntry), expectedEntrySri);

assert.match(v3Core, /UNPUBLISHED PRODUCTION CANDIDATE V3/);
assert.match(v3Core, /optionValue: "灰片"/);
assert.match(v3Core, /optionValue: "抗藍光"/);
assert.match(v3Core, /optionValue: "偏光"/);
assert.match(v3Core, /XS: "87452778", S: "87817315", M: "87817316", L: "87852179"/);
assert.match(v3Core, /XS: "87852180", S: "87852181", M: "87852182", L: "87852183"/);
assert.match(v3Core, /XS: "87852184", S: "87852185", M: "87852186", L: "87852188"/);
assert.doesNotMatch(v3Core, /cls-cus-mix-uv-(?:bl|pl)-rd/);
assert.match(v3Core, /CHECKOUT_GUARDED_VARIANT_IDS/);
assert.match(v3Core, /"87452776"/);

assert.match(v3TestEntry, /eyefans_uv_combined_live_test/);
assert.match(v3TestEntry, /eyefans_uv_combined_development/);
assert.match(v3TestEntry, /CONFLICTING_LOADER_FLAGS/);
assert.ok(v3TestEntry.includes(expectedV3Sri));
assert.ok(guide.includes(expectedV3Sha256));
assert.ok(guide.includes(expectedV3Sri));
assert.ok(guide.includes(expectedEntrySha256));
assert.ok(guide.includes(expectedEntrySri));

console.log("UV combined v3 candidate hashes + legacy immutability contract passed");
