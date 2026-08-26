"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const bridgePath = path.join(__dirname, "..", "integration", "cyberbiz-cart-bridge.js");
const bridgeSource = fs.readFileSync(bridgePath, "utf8").replace(
  "const TEST_MODE = true;",
  "const TEST_MODE = false;"
);

const PRODUCT_CASES = [
  {
    handle: "cls-cus-mix-sun-rd",
    mode: "color",
    variants: { XS: "87452738", S: "87452739", M: "87452740", L: "87452741" }
  },
  {
    handle: "cls-cus-mix-laser-sun-rd",
    mode: "engraving",
    variants: { XS: "87452764", S: "87452765", M: "87452766", L: "87452767" }
  },
  {
    handle: "cls-cus-mix-uv-sun-rd",
    mode: "uv",
    variants: { XS: "87452776", S: "87452777", M: "87452778", L: "87452779" }
  }
];

const listeners = {};
const requests = [];
const results = [];
const sourceWindow = {
  postMessage(payload, targetOrigin) {
    results.push({ payload, targetOrigin });
  }
};
const iframe = { contentWindow: sourceWindow, src: "" };
const location = {
  origin: "https://www.eyefans.com.tw",
  href: "https://www.eyefans.com.tw/",
  pathname: "/"
};

const windowStub = {
  location,
  addEventListener(type, listener) {
    listeners[type] = listener;
  },
  setTimeout,
  clearTimeout,
  async fetch(url, options) {
    requests.push({ url, options });
    return {
      ok: true,
      async text() {
        return JSON.stringify({ success: true });
      }
    };
  }
};
const documentStub = {
  querySelectorAll() {
    return [iframe];
  }
};

const originalWindow = global.window;
const originalDocument = global.document;
global.window = windowStub;
global.document = documentStub;
vm.runInThisContext(bridgeSource, { filename: bridgePath });

function flushTasks() {
  return new Promise(resolve => setImmediate(resolve));
}

async function sendSelection({ handle, mode, size, requestId, includeCartFlag = true }) {
  location.pathname = `/zh-TW/products/${handle}`;
  location.href = `${location.origin}${location.pathname}`;
  iframe.src = `https://nina82815.github.io/eyefans-custom/?mode=${mode}&locked=1${includeCartFlag ? "&cart=1" : ""}`;

  listeners.message({
    origin: "https://nina82815.github.io",
    source: sourceWindow,
    data: {
      type: "eyefans-customizer-submit",
      schemaVersion: 1,
      requestId,
      selection: {
        customizationMode: mode,
        customizationModeLocked: true,
        size,
        frame: "測試鏡框",
        temple: "測試鏡腳",
        lens: "測試鏡片",
        summary: "測試客製資料"
      }
    }
  });

  await flushTasks();
  await flushTasks();
}

(async () => {
  try {
    let caseNumber = 0;

    for (const product of PRODUCT_CASES) {
      for (const [size, expectedVariantId] of Object.entries(product.variants)) {
        caseNumber += 1;
        const requestCount = requests.length;
        const resultCount = results.length;
        await sendSelection({
          handle: product.handle,
          mode: product.mode,
          size,
          requestId: `request-${String(caseNumber).padStart(4, "0")}`
        });

        assert.equal(requests.length, requestCount + 1);
        assert.equal(results.length, resultCount + 1);
        assert.equal(requests.at(-1).url, "https://www.eyefans.com.tw/cart/add");
        assert.equal(requests.at(-1).options.method, "POST");
        assert.equal(requests.at(-1).options.body, `id=${expectedVariantId}&quantity=1`);
        assert.equal(results.at(-1).targetOrigin, "https://nina82815.github.io");
        assert.equal(results.at(-1).payload.ok, true);
      }
    }

    const requestCount = requests.length;
    const resultCount = results.length;
    await sendSelection({
      handle: "cls-cus-mix-uv-sun-rd",
      mode: "uv",
      size: "M",
      requestId: "request-no-cart",
      includeCartFlag: false
    });
    assert.equal(requests.length, requestCount, "缺少 cart=1 時不可送出購物車請求");
    assert.equal(results.length, resultCount, "缺少 cart=1 時不可回報假結果");

    console.log(`cart bridge tests passed: ${caseNumber} variant mappings + cart gate`);
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
