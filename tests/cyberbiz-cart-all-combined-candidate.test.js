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
const v4Core = read("cyberbiz-cart-production-loader-20260904-all-combined-v4.js");
const v4TestEntry = read("cyberbiz-cart-all-combined-live-test-loader-20260904-v1.js");
const guide = read("CYBERBIZ_CART_ALL_COMBINED_CANDIDATE_V4_20260904.md");

assert.equal(
  sha256(legacyLiveTest),
  "1045dfcdef6c56654c01166bd2ccb0e301d63d9a6e4b3628463d9c6831444052",
  "the historic legacy live-test URL must remain byte-identical"
);
assert.equal(
  sha256(v2Core),
  "00689233056c418e6e421d4923ec2ab20abb739cdb59afe31e5290e02b5b248f",
  "the v2 candidate core must remain byte-identical"
);
assert.equal(
  sha256(v3Core),
  "b0afb8f5c1272c20866efd719dab1594ea4ba305ff1b09e3f785a03bc83b6a42",
  "the published UV v3 core must remain byte-identical"
);
assert.equal(
  sha256(v3TestEntry),
  "4d08f5110f5884540794e21c3972b1b408bb542161650ae30153a31ccbc9eb13",
  "the published UV v3 test entry must remain byte-identical"
);

const expectedV4Sha256 = "81d5dd02611b931c1610bd5c72050da5231b9ea853c26eddadee339b7310c3fa";
const expectedV4Sri = "sha384-qYynbWR+bEHbDUIRXgxTXzYq/YGK19+woKNifGrPEu3lenCbQqLPQ+yohKHp2+jv";
const expectedEntrySha256 = "2a4db3a8ceb8ba18f478b9252b4a329a6fb7ee59110d5a4d8634fcfe1e0a5fa1";
const expectedEntrySri = "sha384-03JQQDYL8TjCi2OaNAaqz+h49tVgy45063NL6X09cFuBB5wz7aDKUdkS/DUIT/bg";

assert.equal(sha256(v4Core), expectedV4Sha256);
assert.equal(sri(v4Core), expectedV4Sri);
assert.equal(sha256(v4TestEntry), expectedEntrySha256);
assert.equal(sri(v4TestEntry), expectedEntrySri);

assert.match(v4Core, /UNPUBLISHED PRODUCTION CANDIDATE V4/);
assert.match(v4Core, /eyefans_all_combined_development/);
assert.match(v4Core, /eyefansCustomCartDesignsAllCombinedDevV1/);
assert.match(v4Core, /eyefansCustomCartDesignsProdV1/);
assert.match(v4Core, /XS: "87452738", S: "87452739", M: "87452740", L: "87452741"/);
assert.match(v4Core, /XS: "87870151", S: "87870152", M: "87870153", L: "87870154"/);
assert.match(v4Core, /XS: "87870155", S: "87870157", M: "87870158", L: "87870159"/);
assert.match(v4Core, /XS: "87452764", S: "87452765", M: "87452766", L: "87452767"/);
assert.match(v4Core, /XS: "87856080", S: "87856081", M: "87856082", L: "87856083"/);
assert.match(v4Core, /XS: "87856084", S: "87856085", M: "87856086", L: "87856087"/);
assert.match(v4Core, /XS: "87452778", S: "87817315", M: "87817316", L: "87852179"/);
assert.match(v4Core, /XS: "87852180", S: "87852181", M: "87852182", L: "87852183"/);
assert.match(v4Core, /XS: "87852184", S: "87852185", M: "87852186", L: "87852188"/);
assert.match(v4Core, /optionValue: "抗藍光鏡片"/);
assert.match(v4Core, /optionValue: "偏光鏡片"/);
assert.doesNotMatch(v4Core, /cls-cus-mix-(?:bl|pl)-rd/);
assert.doesNotMatch(v4Core, /cls-cus-mix-(?:laser|uv)-(?:bl|pl)-rd/);
assert.match(v4Core, /"87452746"/);
assert.match(v4Core, /"87452787"/);
assert.match(v4Core, /VERSIONED_TEST_QUERY_KEYS/);

assert.match(v4TestEntry, /eyefans_all_combined_live_test/);
assert.match(v4TestEntry, /eyefans_all_combined_development/);
assert.match(v4TestEntry, /BLOCKING_LOADER_FLAGS/);
assert.match(v4TestEntry, /__eyefansCartUvCombinedDevelopmentLoaderActive/);
assert.ok(v4TestEntry.includes(expectedV4Sri));
assert.ok(guide.includes(expectedV4Sha256));
assert.ok(guide.includes(expectedV4Sri));
assert.ok(guide.includes(expectedEntrySha256));
assert.ok(guide.includes(expectedEntrySri));

console.log("all-combined v4 candidate hashes + historical immutability contract passed");
