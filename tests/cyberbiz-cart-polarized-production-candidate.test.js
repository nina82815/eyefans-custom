"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const integrationDir = path.join(__dirname, "..", "integration");
const developmentSource = fs.readFileSync(
  path.join(integrationDir, "cyberbiz-cart-size-lens-development-loader.js"),
  "utf8"
);
const candidateSource = fs.readFileSync(
  path.join(integrationDir, "cyberbiz-cart-production-loader-20260901-polarized.js"),
  "utf8"
);
const currentProductionSource = fs.readFileSync(
  path.join(integrationDir, "cyberbiz-cart-production-loader-20260901.js"),
  "utf8"
);
const guide = fs.readFileSync(
  path.join(integrationDir, "CYBERBIZ_CART_POLARIZED_CANDIDATE_20260901.md"),
  "utf8"
);

const expectedCandidate = developmentSource
  .replace(
    "eYeFANS CYBERBIZ integration — SIZE × LENS DEVELOPMENT BUILD.",
    "eYeFANS CYBERBIZ integration — SIZE × LENS PRODUCTION CANDIDATE."
  )
  .replace(
    "UNPUBLISHED DEVELOPMENT SNAPSHOT / DO NOT INSTALL.",
    "UNPUBLISHED PRODUCTION CANDIDATE / DO NOT INSTALL ON A PUBLISHED THEME."
  )
  .replace(
    " * variants are pinned below and the catalog snapshot is ready. This file stays\n"
      + " * development-only; use the separately versioned production candidate for\n"
      + " * unpublished-theme QA. Product JSON, inventory, and exact target identity are\n"
      + " * checked before POST.",
    " * variants are pinned below and the catalog snapshot is ready. This candidate\n"
      + " * may be installed only as a replacement loader in an unpublished theme for QA.\n"
      + " * Product JSON, inventory, and exact target identity are checked before POST."
  )
  .replace(
    "function eyefansCyberbizCartSizeLensDevelopmentLoader()",
    "function eyefansCyberbizCartPolarizedProductionCandidateLoader()"
  )
  .replace(
    "const LOADER_FLAG = \"__eyefansCartSizeLensDevelopmentLoaderActive\";",
    "const LOADER_FLAG = \"__eyefansCartProductionLoaderActive\";"
  )
  .replace(
    "// Development records never read, migrate, or overwrite production data.\n"
      + "  const STORAGE_KEY = \"eyefansCustomCartDesignsSizeLensDevV1\";",
    "// This is a replacement candidate and must never run beside another production loader.\n"
      + "  const STORAGE_KEY = \"eyefansCustomCartDesignsProdV1\";"
  );

assert.equal(
  candidateSource,
  expectedCandidate,
  "the candidate may differ from the fully tested development core only by release identity"
);
assert.match(candidateSource, /UNPUBLISHED PRODUCTION CANDIDATE/);
assert.match(candidateSource, /const LOADER_FLAG = "__eyefansCartProductionLoaderActive"/);
assert.match(candidateSource, /const STORAGE_KEY = "eyefansCustomCartDesignsProdV1"/);
assert.doesNotMatch(candidateSource, /SizeLensDevV1|PENDING_/);

const candidateSha256 = crypto.createHash("sha256").update(candidateSource).digest("hex");
const candidateSri = `sha384-${crypto.createHash("sha384").update(candidateSource).digest("base64")}`;
assert.equal(candidateSha256, "ade85d93875ae7192a77c197f4cafd0a4b8787e1082943a6666aebefdd69a579");
assert.equal(candidateSri, "sha384-rPz/izM7fEIWspbrR5dQ1raWC1tk4Eyw3t47nhAjRYE72CKTt/zhGTa2Hg0IU5gr");
assert.match(guide, new RegExp(candidateSha256));
assert.ok(guide.includes(`integrity="${candidateSri}"`));
assert.ok(guide.includes("cyberbiz-cart-production-loader-20260901-polarized.js"));

assert.equal(
  crypto.createHash("sha256").update(currentProductionSource).digest("hex"),
  "4a461f3cedaf510ade2333d55bdcff9d0b1f461bb09d443d146adb33b843f4c8",
  "the installed 20260901 production loader must remain byte-identical"
);

console.log("polarized production candidate contract passed: tested core parity + fixed SRI");
