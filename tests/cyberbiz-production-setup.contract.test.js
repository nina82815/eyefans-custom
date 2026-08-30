"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const loaderPath = path.join(root, "integration", "cyberbiz-cart-production-loader-20260830.js");
const setupPath = path.join(root, "integration", "CYBERBIZ_CART_PRODUCTION_SETUP.md");
const loader = fs.readFileSync(loaderPath);
const setup = fs.readFileSync(setupPath, "utf8");
const integrity = `sha384-${crypto.createHash("sha384").update(loader).digest("base64")}`;

const documentedIntegrity = [...setup.matchAll(/integrity="(sha384-[A-Za-z0-9+/=]+)"/g)]
  .map(match => match[1]);

assert.deepEqual(documentedIntegrity, [integrity, integrity]);
assert.match(setup, /cyberbiz-cart-production-loader-20260830\.js"/);
assert.match(setup, /cyberbiz-cart-production-loader-20260830\.js\?drain=1"/);
assert.match(setup, /請「取代」[\s\S]*cyberbiz-cart-live-test-loader\.js/);
assert.match(setup, /程式檔發布不代表官網主題已更新/);
assert.match(setup, /正式主題變更須另行確認/);
const legacyLoader = fs.readFileSync(path.join(root, "integration", "cyberbiz-cart-production-loader.js"));
assert.equal(
  crypto.createHash("sha384").update(legacyLoader).digest("base64"),
  "aX+eJhnar+/dkFGFuzj+xGWTPeuc6IK7zi1XI4tQG+M1q3G9OJUuc7OtFIErKxHI",
  "The already-published loader must keep its original SRI during the staged rollout"
);

console.log(`Production setup contract passed: ${integrity}`);
