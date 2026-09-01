"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loaderPath = path.join(
  __dirname,
  "..",
  "integration",
  "cyberbiz-cart-production-loader-20260901-polarized-v2.js"
);
const rawSource = fs.readFileSync(loaderPath, "utf8");
const developmentEntryPath = path.join(
  __dirname,
  "..",
  "integration",
  "cyberbiz-cart-size-lens-development-loader.js"
);
const developmentEntrySource = fs.readFileSync(developmentEntryPath, "utf8");

const SIZES = Object.freeze(["XS", "S", "M", "L"]);
const LENSES = Object.freeze({
  gray: "三號灰片",
  "blue-tea": "抗藍光鏡片",
  polarized: "偏光鏡片"
});
const PRODUCT_DEFINITIONS = Object.freeze({
  "cls-cus-mix-sun-rd": Object.freeze({
    entryProductId: "71536660",
    mode: "color",
    targetsByLens: Object.freeze({
      gray: Object.freeze({
        handle: "cls-cus-mix-sun-rd",
        productId: "71536660",
        variantsBySize: Object.freeze({ XS: "87452738", S: "87452739", M: "87452740", L: "87452741" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 1,
        price: 88888
      }),
      "blue-tea": Object.freeze({
        handle: "cls-cus-mix-bl-rd",
        productId: "71536666",
        variantsBySize: Object.freeze({ XS: "87452750", S: "87452751", M: "87452752", L: "87452753" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 1,
        price: 88888
      }),
      polarized: Object.freeze({
        handle: "cls-cus-mix-pl-rd",
        productId: "71536665",
        variantsBySize: Object.freeze({ XS: "87452746", S: "87452747", M: "87452748", L: "87452749" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 1,
        price: 89188
      })
    })
  }),
  "cls-cus-mix-laser-sun-rd": Object.freeze({
    entryProductId: "71536670",
    mode: "engraving",
    targetsByLens: Object.freeze({
      gray: Object.freeze({
        handle: "cls-cus-mix-laser-sun-rd",
        productId: "71536670",
        variantsBySize: Object.freeze({ XS: "87452764", S: "87452765", M: "87452766", L: "87452767" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 1,
        price: 88888
      }),
      "blue-tea": Object.freeze({
        handle: "cls-cus-mix-laser-bl-rd",
        productId: "71536672",
        variantsBySize: Object.freeze({ XS: "87452772", S: "87452773", M: "87452774", L: "87452775" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 1,
        price: 88888
      }),
      polarized: Object.freeze({
        handle: "cls-cus-mix-laser-pl-rd",
        productId: "71536671",
        variantsBySize: Object.freeze({ XS: "87452768", S: "87452769", M: "87452770", L: "87452771" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 1,
        price: 89188
      })
    })
  }),
  "cls-cus-mix-uv-sun-rd": Object.freeze({
    entryProductId: "71536673",
    mode: "uv",
    targetsByLens: Object.freeze({
      gray: Object.freeze({
        handle: "cls-cus-mix-uv-sun-rd",
        productId: "71536673",
        variantsBySize: Object.freeze({ XS: "87452776", S: "87452777", M: "87452778", L: "87452779" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 20,
        price: 88888
      }),
      "blue-tea": Object.freeze({
        handle: "cls-cus-mix-uv-bl-rd",
        productId: "71536675",
        variantsBySize: Object.freeze({ XS: "87452784", S: "87452785", M: "87452786", L: "87452787" }),
        available: true,
        inventoryPolicy: "continue",
        inventoryQuantity: 0,
        price: 88888
      }),
      polarized: Object.freeze({
        handle: "cls-cus-mix-uv-pl-rd",
        productId: "71536674",
        variantsBySize: Object.freeze({ XS: "87452780", S: "87452781", M: "87452782", L: "87452783" }),
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 1,
        price: 89188
      })
    })
  })
});

function configuredFixture() {
  const products = {};

  for (const [entryHandle, definition] of Object.entries(PRODUCT_DEFINITIONS)) {
    const targetsByLens = Object.fromEntries(
      Object.entries(definition.targetsByLens).map(([lensId, target]) => [lensId, {
        ...target,
        variantsBySize: { ...target.variantsBySize },
        available: true,
        inventoryPolicy: "deny",
        inventoryQuantity: 20
      }])
    );
    products[entryHandle] = { ...definition, targetsByLens };
  }
  return { source: rawSource, products };
}

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    dump() {
      return Object.fromEntries(values);
    }
  };
}

function response({ status = 200, body = "", contentType = "application/json", redirected = false, url = "" }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    redirected,
    url,
    headers: {
      get(name) {
        return String(name).toLowerCase() === "content-type" ? contentType : null;
      }
    },
    async text() {
      return body;
    }
  };
}

function createProductEnvironment({
  source,
  products,
  handle,
  productVariantsTransform = variants => variants,
  recordsJson
}) {
  const definition = products?.[handle] || PRODUCT_DEFINITIONS[handle];
  const targetsByLens = definition.targetsByLens;
  const targetByHandle = new Map(
    Object.values(targetsByLens).map(target => [target.handle, target])
  );
  const targetByVariantId = new Map();
  for (const target of targetByHandle.values()) {
    for (const variantId of Object.values(target.variantsBySize)) {
      targetByVariantId.set(String(variantId), target);
    }
  }
  const listeners = {};
  const documentListeners = {};
  const requests = [];
  const replies = [];
  const quantities = new Map();
  const localStorage = memoryStorage(recordsJson === undefined ? {} : {
    eyefansCustomCartDesignsSizeLensDevV1: recordsJson
  });
  const frameWindow = {
    postMessage(message, targetOrigin) {
      replies.push({ message, targetOrigin });
    }
  };
  const frame = {
    src: `https://nina82815.github.io/eyefans-custom/?mode=${definition.mode}&locked=1`,
    contentWindow: frameWindow
  };

  function productJsonBody(targetHandle) {
    const target = targetByHandle.get(targetHandle);
    if (!target) return JSON.stringify({});
    const variants = Object.entries(target.variantsBySize).map(([size, variantId]) => ({
      id: Number(variantId),
      product_id: Number(target.productId),
      option1: size,
      option2: "固定",
      option3: "固定",
      available: target.available !== false,
      inventory_policy: target.inventoryPolicy || "deny",
      inventory_quantity: target.inventoryQuantity ?? 20,
      price: target.price ?? 88888
    }));
    return JSON.stringify({
      id: Number(target.productId),
      handle: target.handle,
      url: `/products/${target.handle}`,
      available: target.available !== false,
      variants: productVariantsTransform(variants, target)
    });
  }

  function cartJsonBody() {
    const items = Array.from(quantities, ([variantId, quantity]) => ({
      variant_id_int: Number(variantId),
      variant_id: `${variantId}_normal_`,
      cart_item_id: `${variantId}_normal_`,
      quantity
    }));
    const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
    return JSON.stringify({
      items,
      item_count: items.length,
      total_quantity: totalQuantity
    });
  }

  const window = {
    location: new URL(`https://www.eyefans.com.tw/products/${handle}`),
    localStorage,
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    setTimeout(callback, delay) {
      return delay === 15000 ? setTimeout(callback, delay) : setImmediate(callback);
    },
    clearTimeout(handleValue) {
      clearTimeout(handleValue);
      clearImmediate(handleValue);
    },
    pullNavCart() {
      return Promise.resolve();
    },
    async fetch(url, options) {
      requests.push({ url, options });
      const pathname = new URL(url).pathname;
      if (options.method === "GET" && pathname.startsWith("/products/")) {
        const targetHandle = decodeURIComponent(pathname.slice("/products/".length));
        return response({ body: productJsonBody(targetHandle), contentType: "application/json; charset=utf-8" });
      }
      if (options.method === "GET" && pathname === "/cart.json") {
        return response({ body: cartJsonBody(), contentType: "application/json; charset=utf-8" });
      }
      if (options.method === "GET" && pathname === "/cart") {
        return response({
          body: "",
          contentType: "text/html; charset=utf-8",
          redirected: true,
          url: "https://www.eyefans.com.tw/carts/size-lens-cart-token"
        });
      }
      assert.equal(options.method, "POST");
      assert.equal(pathname, "/cart/add");
      const variantId = new URLSearchParams(options.body).get("id");
      const target = targetByVariantId.get(String(variantId));
      assert.ok(target, `POST used an unknown target variant ${variantId}`);
      quantities.set(variantId, (quantities.get(variantId) || 0) + 1);
      return response({
        body: JSON.stringify({
          product_id: Number(target.productId),
          variant_id_int: Number(variantId),
          variant_id: `${variantId}_normal_`,
          cart_item_id: `${variantId}_normal_`,
          quantity: 1,
          sku: `SIZE-LENS-${variantId}`
        }),
        contentType: "application/json; charset=utf-8"
      });
    }
  };
  window.self = window;
  window.top = window;

  const document = {
    readyState: "complete",
    documentElement: {},
    head: null,
    currentScript: {
      src: "https://example.invalid/cyberbiz-cart-production-loader-20260901-polarized-v2.js?eyefans_size_lens_development=1"
    },
    querySelectorAll(selector) {
      return selector === ".eyefans-custom-wrap iframe" ? [frame] : [];
    },
    querySelector(selector) {
      return selector === ".eyefans-custom-wrap iframe" ? frame : null;
    },
    addEventListener(type, listener) {
      documentListeners[type] = listener;
    }
  };

  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortController,
    window,
    document,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    console,
    setTimeout,
    clearTimeout,
    setImmediate,
    clearImmediate
  });
  vm.runInContext(source, context, { filename: loaderPath });
  return {
    context,
    listeners,
    documentListeners,
    frame,
    frameWindow,
    requests,
    replies,
    localStorage,
    quantities
  };
}

function baseSelection(mode, overrides = {}) {
  const selection = {
    customizationMode: mode,
    customizationModeLabel: mode === "uv" ? "框腳配色＋UV 彩印" : mode === "engraving" ? "框腳配色＋雷雕" : "框腳配色",
    customizationModeLocked: true,
    size: "M",
    view: "a45",
    renderMode: "photo",
    frame: "櫻花粉",
    temple: "櫻花粉",
    lens: "三號灰片",
    lensId: "gray",
    printMode: "both",
    uvPrintMode: "both",
    icon1: "01",
    icon2: "04",
    name: "PEIYU",
    textColor: "white",
    font: "baksoSapi",
    caseMode: "preserve",
    order: "normal",
    namePosition: "center",
    customizationSide: "right",
    customizationSideLabel: "右外側鏡腳",
    summary: "尺寸與鏡片測試搭配"
  };
  if (mode === "color") Object.assign(selection, {
    printMode: "none",
    uvPrintMode: null,
    icon1: null,
    icon2: null,
    name: "",
    textColor: null,
    font: null,
    caseMode: null,
    order: null,
    namePosition: null,
    customizationSide: null,
    customizationSideLabel: null
  });
  if (mode === "engraving") Object.assign(selection, {
    printMode: "name",
    uvPrintMode: null,
    icon1: null,
    icon2: null,
    order: null,
    namePosition: null
  });
  return { ...selection, ...overrides };
}

function messageInContext(environment, requestId, selection) {
  environment.context.__request = {
    type: "eyefans-customizer-submit",
    schemaVersion: 1,
    requestId,
    selection
  };
  return vm.runInContext("JSON.parse(JSON.stringify(__request))", environment.context);
}

async function submit(environment, requestId, selection) {
  environment.listeners.message({
    origin: "https://nina82815.github.io",
    source: environment.frameWindow,
    data: messageInContext(environment, requestId, selection)
  });
  for (let index = 0; index < 16; index += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
  return environment.replies.at(-1)?.message;
}

function postRequests(environment) {
  return environment.requests.filter(request => request.options.method === "POST");
}

function storedRecords(environment) {
  return JSON.parse(
    environment.localStorage.getItem("eyefansCustomCartDesignsSizeLensDevV1") || "[]"
  );
}

function createCheckoutBoot(source, variantId, developmentRuntime = true) {
  const window = {
    location: new URL("https://www.eyefans.com.tw/carts/size-lens-cart-token"),
    lineItems: [{ variant_id: String(variantId), quantity: 1 }],
    localStorage: memoryStorage(),
    addEventListener() {},
    setTimeout,
    clearTimeout
  };
  window.self = window;
  window.top = window;
  const documentListeners = {};
  const document = {
    readyState: "loading",
    documentElement: {},
    currentScript: {
      src: `https://example.invalid/cyberbiz-cart-production-loader-20260901-polarized-v2.js${developmentRuntime ? "?eyefans_size_lens_development=1" : ""}`
    },
    scripts: [],
    addEventListener(type, listener) {
      documentListeners[type] = listener;
    }
  };
  vm.runInContext(source, vm.createContext({
    URL,
    URLSearchParams,
    AbortController,
    window,
    document,
    MutationObserver: class {},
    console,
    setTimeout,
    clearTimeout
  }), { filename: loaderPath });
  return { window, documentListeners };
}

async function main() {
  assert.match(rawSource, /UNPUBLISHED PRODUCTION CANDIDATE V2 \/ DO NOT INSTALL ON A PUBLISHED THEME/);
  assert.match(rawSource, /CYBERBIZ owns all prices/);
  assert.match(rawSource, /polarized: "偏光鏡片"/);
  assert.match(rawSource, /eyefans_size_lens_development/);
  assert.match(rawSource, /"eyefansCustomCartDesignsSizeLensDevV1"/);
  assert.match(rawSource, /"eyefansCustomCartDesignsProdV1"/);
  assert.doesNotMatch(rawSource, /body\.set\(["']price["']/);

  const candidateSri = `sha384-${crypto.createHash("sha384").update(rawSource).digest("base64")}`;
  assert.match(developmentEntrySource, /UNPUBLISHED DEVELOPMENT ONLY/);
  assert.match(developmentEntrySource, /eyefans_size_lens_development/);
  assert.ok(developmentEntrySource.includes(candidateSri),
    "development entry must pin the exact v2 candidate core SRI");

  assert.doesNotMatch(rawSource, /PENDING_/, "all nine target mappings must be pinned before catalog QA");

  let readyLiveIndex = 0;
  for (const entryHandle of ["cls-cus-mix-sun-rd", "cls-cus-mix-laser-sun-rd"]) {
    const definition = PRODUCT_DEFINITIONS[entryHandle];
    for (const lensId of Object.keys(LENSES)) {
      readyLiveIndex += 1;
      const target = definition.targetsByLens[lensId];
      const environment = createProductEnvironment({
        source: rawSource,
        products: null,
        handle: entryHandle
      });
      const result = await submit(
        environment,
        `request-live-ready-${readyLiveIndex}-0001`,
        baseSelection(definition.mode, { lens: LENSES[lensId], lensId })
      );
      assert.equal(result.ok, true, `${definition.mode}/${lensId} should reflect the ready live snapshot`);
      assert.equal(
        postRequests(environment)[0].options.body,
        `id=${target.variantsBySize.M}&quantity=1`
      );
      assert.ok(environment.requests.some(request => (
        request.options.method === "GET"
        && request.url === `https://www.eyefans.com.tw/products/${target.handle}`
      )), `${definition.mode}/${lensId} must preflight its exact live target`);
      assert.equal(storedRecords(environment)[0].targetHandle, target.handle);
      assert.equal(storedRecords(environment)[0].targetProductId, target.productId);
    }
  }

  const rawGray = createProductEnvironment({
    source: rawSource,
    products: null,
    handle: "cls-cus-mix-uv-sun-rd"
  });
  const rawGrayResult = await submit(rawGray, "request-known-gray-0001", baseSelection("uv"));
  assert.equal(rawGrayResult.ok, true, "the already-known SUN/gray target remains pinned to its existing product");
  assert.equal(postRequests(rawGray)[0].options.body, "id=87452778&quantity=1");

  const rawUvBlue = createProductEnvironment({
    source: rawSource,
    products: null,
    handle: "cls-cus-mix-uv-sun-rd"
  });
  const rawUvBlueResult = await submit(
    rawUvBlue,
    "request-known-uv-blue-0001",
    baseSelection("uv", { lens: LENSES["blue-tea"], lensId: "blue-tea" })
  );
  assert.equal(rawUvBlueResult.ok, true, "verified UV BL catalog data should select its separate product");
  assert.equal(postRequests(rawUvBlue)[0].options.body, "id=87452786&quantity=1");
  assert.ok(rawUvBlue.requests.some(request => (
    request.options.method === "GET"
    && request.url === "https://www.eyefans.com.tw/products/cls-cus-mix-uv-bl-rd"
  )));

  const rawUvPolarized = createProductEnvironment({
    source: rawSource,
    products: null,
    handle: "cls-cus-mix-uv-sun-rd"
  });
  const rawUvPolarizedResult = await submit(
    rawUvPolarized,
    "request-known-uv-polarized-0001",
    baseSelection("uv", { lens: LENSES.polarized, lensId: "polarized" })
  );
  assert.equal(rawUvPolarizedResult.ok, true, "verified UV PL catalog data should select its separate product");
  assert.equal(postRequests(rawUvPolarized)[0].options.body, "id=87452782&quantity=1");
  assert.ok(rawUvPolarized.requests.some(request => (
    request.options.method === "GET"
    && request.url === "https://www.eyefans.com.tw/products/cls-cus-mix-uv-pl-rd"
  )));

  const configured = configuredFixture();
  const postedVariantIds = new Set();
  let matrixIndex = 0;
  for (const [handle, definition] of Object.entries(configured.products)) {
    for (const lensId of Object.keys(LENSES)) {
      for (const size of SIZES) {
        matrixIndex += 1;
        const environment = createProductEnvironment({
          source: configured.source,
          products: configured.products,
          handle
        });
        const result = await submit(
          environment,
          `request-matrix-${String(matrixIndex).padStart(2, "0")}-0001`,
          baseSelection(definition.mode, {
            size,
            lensId,
            lens: LENSES[lensId]
          })
        );
        const target = definition.targetsByLens[lensId];
        const expectedVariantId = target.variantsBySize[size];
        assert.ok(environment.requests.some(request => (
          request.options.method === "GET"
          && request.url === `https://www.eyefans.com.tw/products/${target.handle}`
        )), `${definition.mode}/${size}/${lensId} must preflight the selected target product`);
        assert.equal(result.ok, true, `${definition.mode}/${size}/${lensId} should succeed`);
        assert.equal(postRequests(environment).length, 1);
        assert.equal(
          postRequests(environment)[0].options.body,
          `id=${expectedVariantId}&quantity=1`,
          `${definition.mode}/${size}/${lensId} must post the exact configured variant`
        );
        assert.equal(storedRecords(environment)[0].selection.lensId, lensId);
        assert.equal(storedRecords(environment)[0].variantId, expectedVariantId);
        assert.equal(storedRecords(environment)[0].targetHandle, target.handle);
        assert.equal(storedRecords(environment)[0].targetProductId, target.productId);
        postedVariantIds.add(expectedVariantId);
      }
    }
  }
  assert.equal(matrixIndex, 36);
  assert.equal(postedVariantIds.size, 36, "all configured combinations must resolve to distinct variants");

  const uv = configured.products["cls-cus-mix-uv-sun-rd"];
  const sameSize = createProductEnvironment({
    source: configured.source,
    products: configured.products,
    handle: "cls-cus-mix-uv-sun-rd"
  });
  assert.equal((await submit(
    sameSize,
    "request-same-size-gray-0001",
    baseSelection("uv", { size: "M", lensId: "gray", lens: LENSES.gray })
  )).ok, true);
  assert.equal((await submit(
    sameSize,
    "request-same-size-polarized-0001",
    baseSelection("uv", { size: "M", lensId: "polarized", lens: LENSES.polarized, name: "POLAR" })
  )).ok, true);
  assert.deepEqual(
    postRequests(sameSize).map(request => new URLSearchParams(request.options.body).get("id")),
    [uv.targetsByLens.gray.variantsBySize.M, uv.targetsByLens.polarized.variantsBySize.M]
  );
  assert.equal(storedRecords(sameSize).length, 2, "same-size lenses must keep separate design records");
  assert.deepEqual(
    storedRecords(sameSize).map(record => record.selection.lensId),
    ["gray", "polarized"]
  );
  assert.deepEqual(
    storedRecords(sameSize).map(record => record.targetHandle),
    [uv.targetsByLens.gray.handle, uv.targetsByLens.polarized.handle]
  );

  const outOfStockPolarized = createProductEnvironment({
    source: configured.source,
    products: configured.products,
    handle: "cls-cus-mix-uv-sun-rd",
    productVariantsTransform(variants, target) {
      if (target.handle !== uv.targetsByLens.polarized.handle) return variants;
      return variants.map(variant => variant.id === Number(uv.targetsByLens.polarized.variantsBySize.M)
        ? { ...variant, available: false, inventory_policy: "deny", inventory_quantity: 0 }
        : variant);
    }
  });
  const outOfStockResult = await submit(
    outOfStockPolarized,
    "request-polarized-out-of-stock-0001",
    baseSelection("uv", { lensId: "polarized", lens: LENSES.polarized })
  );
  assert.equal(outOfStockResult.ok, false);
  assert.match(outOfStockResult.message, /目前沒有可用庫存/);
  assert.equal(postRequests(outOfStockPolarized).length, 0, "a later PL stockout must never be bypassed");
  assert.equal(storedRecords(outOfStockPolarized).length, 0);

  const wrongTargetSize = createProductEnvironment({
    source: configured.source,
    products: configured.products,
    handle: "cls-cus-mix-uv-sun-rd",
    productVariantsTransform(variants, target) {
      if (target.handle !== uv.targetsByLens.polarized.handle) return variants;
      return variants.map(variant => variant.id === Number(uv.targetsByLens.polarized.variantsBySize.M)
        ? { ...variant, option1: "S" }
        : variant);
    }
  });
  const wrongTargetResult = await submit(
    wrongTargetSize,
    "request-wrong-target-size-0001",
    baseSelection("uv", { lensId: "polarized", lens: LENSES.polarized })
  );
  assert.equal(wrongTargetResult.ok, false);
  assert.match(wrongTargetResult.message, /商品款式設定與模擬器不一致/);
  assert.equal(postRequests(wrongTargetSize).length, 0, "a target with a mismatched size must never POST");
  assert.equal(storedRecords(wrongTargetSize).length, 0);

  const duplicatePair = createProductEnvironment({
    source: configured.source,
    products: configured.products,
    handle: "cls-cus-mix-uv-sun-rd",
    productVariantsTransform(variants, target) {
      if (target.handle !== uv.targetsByLens.gray.handle) return variants;
      const selected = variants.find(variant => variant.id === Number(uv.targetsByLens.gray.variantsBySize.M));
      return [...variants, { ...selected, id: 99999998 }];
    }
  });
  const duplicateResult = await submit(
    duplicatePair,
    "request-duplicate-pair-0001",
    baseSelection("uv")
  );
  assert.equal(duplicateResult.ok, false);
  assert.equal(postRequests(duplicatePair).length, 0, "an ambiguous size in the target product must never POST");

  const mismatchedLabel = createProductEnvironment({
    source: configured.source,
    products: configured.products,
    handle: "cls-cus-mix-uv-sun-rd"
  });
  const mismatchedLabelResult = await submit(
    mismatchedLabel,
    "request-lens-label-mismatch-0001",
    baseSelection("uv", { lensId: "polarized", lens: "三號灰片" })
  );
  assert.equal(mismatchedLabelResult.ok, false);
  assert.equal(mismatchedLabel.requests.length, 0, "lens label/id mismatch must fail before network");

  const premiumCheckout = createCheckoutBoot(
    configured.source,
    uv.targetsByLens.polarized.variantsBySize.M
  );
  assert.equal(premiumCheckout.window.__eyefansCartSizeLensDevelopmentLoaderActive, true);
  assert.equal(typeof premiumCheckout.documentListeners.DOMContentLoaded, "function",
    "a premium variant in checkout must activate the guarded note-sync path");

  const productionCandidateBoot = createCheckoutBoot(
    configured.source,
    uv.targetsByLens.polarized.variantsBySize.M,
    false
  );
  assert.equal(productionCandidateBoot.window.__eyefansCartProductionLoaderActive, true,
    "the normal v2 URL must use the production replacement flag");
  assert.equal(productionCandidateBoot.window.__eyefansCartSizeLensDevelopmentLoaderActive, undefined);
  assert.equal(typeof productionCandidateBoot.documentListeners.DOMContentLoaded, "function");

  console.log("cyberbiz cart size+lens development loader tests passed");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
