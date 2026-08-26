"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const loaderPath = path.join(root, "integration", "cyberbiz-cart-production-loader.js");
const setupPath = path.join(root, "integration", "CYBERBIZ_CART_PRODUCTION_SETUP.md");
const loader = fs.readFileSync(loaderPath);
const setup = fs.readFileSync(setupPath, "utf8");
const integrity = `sha384-${crypto.createHash("sha384").update(loader).digest("base64")}`;

const documentedIntegrity = [...setup.matchAll(/integrity="(sha384-[A-Za-z0-9+/=]+)"/g)]
  .map(match => match[1]);

assert.deepEqual(documentedIntegrity, [integrity, integrity]);
assert.match(setup, /cyberbiz-cart-production-loader\.js\?v=prod-v1-20260826"/);
assert.match(setup, /cyberbiz-cart-production-loader\.js\?v=prod-v1-20260826&amp;drain=1"/);
assert.match(setup, /請「取代」[\s\S]*cyberbiz-cart-live-test-loader\.js/);

console.log(`Production setup contract passed: ${integrity}`);
