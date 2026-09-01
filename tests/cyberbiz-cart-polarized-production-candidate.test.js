"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const integrationDir = path.join(__dirname, "..", "integration");
const developmentEntrySource = fs.readFileSync(
  path.join(integrationDir, "cyberbiz-cart-size-lens-development-loader.js"),
  "utf8"
);
const v1CandidateSource = fs.readFileSync(
  path.join(integrationDir, "cyberbiz-cart-production-loader-20260901-polarized.js"),
  "utf8"
);
const v2CandidateSource = fs.readFileSync(
  path.join(integrationDir, "cyberbiz-cart-production-loader-20260901-polarized-v2.js"),
  "utf8"
);
const currentProductionSource = fs.readFileSync(
  path.join(integrationDir, "cyberbiz-cart-production-loader-20260901.js"),
  "utf8"
);
const v1Guide = fs.readFileSync(
  path.join(integrationDir, "CYBERBIZ_CART_POLARIZED_CANDIDATE_20260901.md"),
  "utf8"
);
const v2Guide = fs.readFileSync(
  path.join(integrationDir, "CYBERBIZ_CART_POLARIZED_CANDIDATE_V2_20260901.md"),
  "utf8"
);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sri(value) {
  return `sha384-${crypto.createHash("sha384").update(value).digest("base64")}`;
}

assert.equal(
  sha256(currentProductionSource),
  "4a461f3cedaf510ade2333d55bdcff9d0b1f461bb09d443d146adb33b843f4c8",
  "the installed 20260901 production loader must remain byte-identical"
);
assert.equal(
  sha256(v1CandidateSource),
  "ade85d93875ae7192a77c197f4cafd0a4b8787e1082943a6666aebefdd69a579",
  "the already-published polarized v1 candidate URL must remain byte-identical"
);
assert.equal(
  sri(v1CandidateSource),
  "sha384-rPz/izM7fEIWspbrR5dQ1raWC1tk4Eyw3t47nhAjRYE72CKTt/zhGTa2Hg0IU5gr"
);
assert.match(v1Guide, /v1 候選版已停止驗收/);
assert.match(v1Guide, /不得再安裝/);

const v2Sha256 = sha256(v2CandidateSource);
const v2Sri = sri(v2CandidateSource);
assert.equal(v2Sha256, "00689233056c418e6e421d4923ec2ab20abb739cdb59afe31e5290e02b5b248f");
assert.equal(v2Sri, "sha384-W/OS+aihXUMeAXmMoTfl1y0b6dXSdStyc+LTyNjZsAHt6RXhJsbAaiT1cCb6Q7ks");
assert.match(v2CandidateSource, /UNPUBLISHED PRODUCTION CANDIDATE V2/);
assert.match(v2CandidateSource, /CART_SYNC_RETRY_DELAYS_MS/);
assert.match(v2CandidateSource, /fetchAuthoritativeCartState/);
assert.match(v2CandidateSource, /cartMutationPending/);
assert.doesNotMatch(v2CandidateSource, /PENDING_/);
assert.ok(v2Guide.includes(v2Sha256));
assert.ok(v2Guide.includes(`integrity="${v2Sri}"`));
assert.ok(v2Guide.includes("cyberbiz-cart-production-loader-20260901-polarized-v2.js"));

assert.match(developmentEntrySource, /UNPUBLISHED DEVELOPMENT ONLY/);
assert.match(developmentEntrySource, /eyefans_size_lens_development/);
assert.ok(developmentEntrySource.includes(v2Sri),
  "development entry must pin and load the exact v2 core without copying production records");

const appendedScripts = [];
const wrapperWindow = { location: new URL("https://www.eyefans.com.tw/products/cls-cus-mix-sun-rd") };
const wrapperDocument = {
  currentScript: {
    src: "https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-size-lens-development-loader.js"
  },
  head: {
    appendChild(script) {
      appendedScripts.push(script);
    }
  },
  documentElement: null,
  createElement() {
    return {};
  }
};
vm.runInNewContext(developmentEntrySource, {
  URL,
  window: wrapperWindow,
  document: wrapperDocument
});
assert.equal(appendedScripts.length, 1);
assert.equal(
  appendedScripts[0].src,
  "https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader-20260901-polarized-v2.js?eyefans_size_lens_development=1"
);
assert.equal(appendedScripts[0].integrity, v2Sri);
assert.equal(appendedScripts[0].crossOrigin, "anonymous");
assert.equal(appendedScripts[0].async, false);

console.log("polarized v1 immutability + v2 production candidate contract passed");
