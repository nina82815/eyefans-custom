"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loaderPath = path.join(__dirname, "..", "integration", "cyberbiz-cart-live-test-loader.js");
const source = fs.readFileSync(loaderPath, "utf8");
const TEST_PRODUCTS = Object.freeze({
  "cls-cus-mix-sun-rd": Object.freeze({
    id: 71536660,
    variants: Object.freeze({ XS: 87452738, S: 87452739, M: 87452740, L: 87452741 })
  }),
  "cls-cus-mix-laser-sun-rd": Object.freeze({
    id: 71536670,
    variants: Object.freeze({ XS: 87452764, S: 87452765, M: 87452766, L: 87452767 })
  }),
  "cls-cus-mix-uv-sun-rd": Object.freeze({
    id: 71536673,
    variants: Object.freeze({ XS: 87452776, S: 87452777, M: 87452778, L: 87452779 })
  })
});

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    dump() {
      return Object.fromEntries(values);
    }
  };
}

function createProductEnvironment(href, mode = "uv", behavior = {}) {
  const listeners = {};
  const requests = [];
  const replies = [];
  const cartQuantities = new Map(
    Object.entries(behavior.initialCartQuantities || {}).map(([variantId, quantity]) => (
      [String(variantId), Number(quantity)]
    ))
  );
  let cartGetCount = 0;
  let pullNavCartCalls = 0;
  const localStorage = memoryStorage(behavior.recordsJson
    ? { eyefansCustomCartDesignsV3: behavior.recordsJson }
    : {});
  const sessionStorage = memoryStorage();
  const frameWindow = {
    postMessage(message, targetOrigin) {
      replies.push({ message, targetOrigin });
    }
  };
  const frame = {
    src: `https://nina82815.github.io/eyefans-custom/?mode=${mode}&locked=1`,
    contentWindow: frameWindow
  };
  const productHandle = new URL(href).pathname.match(/\/products\/([^/?#]+)/)?.[1] || "";
  const productConfig = TEST_PRODUCTS[productHandle];
  function mockResponse({ status = 200, body = "", contentType = "application/json", redirected = false }) {
    return {
      ok: status >= 200 && status < 300,
      status,
      redirected,
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

  function cartJsonBody() {
    const items = Array.from(cartQuantities, ([variantId, quantity]) => ({
      variant_id_int: Number(variantId),
      variant_id: `${variantId}_normal_`,
      cart_item_id: `${variantId}_normal_`,
      quantity
    }));
    return JSON.stringify({
      items,
      item_count: items.reduce((total, item) => total + item.quantity, 0)
    });
  }

  function productJsonBody() {
    if (!productConfig) return JSON.stringify({});
    const variants = Object.entries(productConfig.variants).map(([size, variantId]) => {
      const exhausted = behavior.unavailableAfterAdd
        && (cartQuantities.get(String(variantId)) || 0) > 0;
      return {
        id: variantId,
        product_id: productConfig.id,
        option1: size,
        option2: "黑",
        option3: "黑",
        available: !exhausted,
        inventory_policy: "deny",
        inventory_quantity: exhausted ? 0 : 5,
        ...(behavior.productVariantOverrides?.[size] || {})
      };
    });
    return JSON.stringify({
      id: productConfig.id,
      handle: productHandle,
      url: `/products/${productHandle}`,
      available: true,
      variants,
      ...(behavior.productPayloadOverrides || {})
    });
  }

  const window = {
    location: new URL(href),
    localStorage,
    sessionStorage,
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    setTimeout,
    clearTimeout,
    pullNavCart() {
      pullNavCartCalls += 1;
      return Promise.resolve();
    },
    async fetch(url, options) {
      requests.push({ url, options });
      if (options.method === "GET") {
        const requestPath = new URL(url).pathname;
        if (requestPath.startsWith("/products/")) {
          if (behavior.productThrows) throw new Error("product network failure");
          return mockResponse({
            status: behavior.productStatus ?? 200,
            body: behavior.productBody ?? productJsonBody(),
            contentType: behavior.productContentType ?? "application/json; charset=utf-8",
            redirected: behavior.productRedirected ?? false
          });
        }
        assert.equal(requestPath, "/cart.json");
        cartGetCount += 1;
        const phase = cartGetCount === 1 ? "preflight" : "postflight";
        if (behavior[`${phase}Throws`]) throw new Error(`${phase} network failure`);
        return mockResponse({
          status: behavior[`${phase}Status`] ?? 200,
          body: behavior[`${phase}Body`] ?? cartJsonBody(),
          contentType: behavior[`${phase}ContentType`] ?? "application/json; charset=utf-8",
          redirected: behavior[`${phase}Redirected`] ?? false
        });
      }
      if (behavior.hangPost) {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }
      const variantId = new URLSearchParams(options.body).get("id");
      if (variantId && !behavior.skipCartIncrement && !behavior.postStatus) {
        cartQuantities.set(variantId, (cartQuantities.get(variantId) || 0) + 1);
      }
      if (behavior.throwAfterIncrement) throw new Error("connection interrupted");
      const status = behavior.postStatus || 200;
      const receipt = {
        product_id: 71536673,
        variant_id_int: Number(variantId),
        variant_id: `${variantId}_normal_`,
        cart_item_id: `${variantId}_normal_`,
        quantity: 1,
        sku: `TEST-${variantId}`,
        ...(behavior.postReceiptOverrides || {})
      };
      return mockResponse({
        status,
        body: behavior.postBody ?? JSON.stringify(receipt),
        contentType: behavior.postContentType ?? "application/json; charset=utf-8",
        redirected: behavior.postRedirected ?? false
      });
    }
  };
  window.self = window;
  window.top = behavior.embedded ? {} : window;
  const document = {
    readyState: "complete",
    documentElement: {},
    querySelectorAll(selector) {
      assert.equal(selector, ".eyefans-custom-wrap iframe");
      return [frame];
    },
    addEventListener() {}
  };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortController,
    window,
    document,
    MutationObserver: class {},
    console,
    setTimeout,
    clearTimeout
  });
  vm.runInContext(source, context, { filename: loaderPath });
  return {
    context,
    frame,
    frameWindow,
    listeners,
    localStorage,
    sessionStorage,
    requests,
    replies,
    cartQuantities,
    pullNavCartCalls() {
      return pullNavCartCalls;
    }
  };
}

function uvSelection(overrides = {}) {
  return {
    customizationMode: "uv",
    customizationModeLabel: "框腳配色＋UV 彩印",
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
    summary: "UV 彩印測試搭配",
    ...overrides
  };
}

function colorSelection(overrides = {}) {
  return {
    ...uvSelection(),
    customizationMode: "color",
    customizationModeLabel: "框腳配色",
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
    customizationSideLabel: null,
    summary: "自由配色測試搭配",
    ...overrides
  };
}

function engravingSelection(overrides = {}) {
  return {
    ...uvSelection(),
    customizationMode: "engraving",
    customizationModeLabel: "框腳配色＋雷雕",
    printMode: "name",
    uvPrintMode: null,
    icon1: null,
    icon2: null,
    textColor: "white",
    order: null,
    namePosition: null,
    summary: "雷雕測試搭配",
    ...overrides
  };
}

function requestInContext(context, requestId, selection) {
  context.__testRequest = {
    type: "eyefans-customizer-submit",
    schemaVersion: 1,
    requestId,
    selection
  };
  return vm.runInContext("JSON.parse(JSON.stringify(__testRequest))", context);
}

function flushTasks() {
  return new Promise(resolve => setImmediate(resolve));
}

function genericElement(tagName, id = "") {
  return {
    tagName: tagName.toUpperCase(),
    id,
    dataset: {},
    attributes: new Map(),
    children: [],
    textContent: "",
    parentElement: null,
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    append(...children) {
      children.forEach(child => {
        child.parentElement = this;
        this.children.push(child);
      });
    },
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    replaceChildren(...children) {
      this.children = [];
      this.append(...children);
    },
    insertBefore(child) {
      child.parentElement = this;
      this.children.unshift(child);
      return child;
    },
    remove() {
      if (!this.parentElement) return;
      this.parentElement.children = this.parentElement.children.filter(child => child !== this);
      this.parentElement = null;
    },
    scrollIntoView() {}
  };
}

function createCartEnvironment({
  recordsJson,
  quantity,
  pageScriptBody = null,
  runtimeLineItems = null,
  storageThrows = false
}) {
  const listeners = {};
  let fetchCount = 0;
  const pageLineItems = quantity > 0
    ? [{ variant_id: "87452778", quantity: 1 }]
    : [];
  const localStorage = memoryStorage({ eyefansCustomCartDesignsV3: recordsJson });
  if (storageThrows) {
    localStorage.setItem = () => {
      throw new Error("storage blocked");
    };
  }
  const sessionStorage = memoryStorage();
  const elements = new Map();
  const head = genericElement("head");
  const body = genericElement("body");
  const noteParent = genericElement("div");
  const note = genericElement("textarea");
  note.name = "order[note]";
  note.value = "客人原有備註";
  note.dispatched = [];
  note.dispatchEvent = event => note.dispatched.push(event.type);
  noteParent.append(note);
  const checkout = genericElement("button", "checkout-button");
  checkout.clickCount = 0;
  const quantityInput = genericElement("input");
  quantityInput.value = String(quantity);
  const row = genericElement("tr");
  row.querySelector = selector => (
    selector === '[data-testid="quantity-input"]' ? quantityInput : null
  );
  elements.set("checkout-button", checkout);

  const originalHeadAppend = head.appendChild.bind(head);
  head.appendChild = child => {
    if (child.id) elements.set(child.id, child);
    return originalHeadAppend(child);
  };
  const originalInsert = noteParent.insertBefore.bind(noteParent);
  noteParent.insertBefore = child => {
    if (child.id) elements.set(child.id, child);
    return originalInsert(child);
  };

  const document = {
    readyState: "complete",
    head,
    body,
    scripts: [{
      textContent: pageScriptBody ?? `window.lineItems = ${JSON.stringify(pageLineItems)};\nwindow.customer = null;`
    }],
    createElement(tagName) {
      return genericElement(tagName);
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      if (selector === 'textarea[name="order[note]"]') return note;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "tr.line-item") return pageLineItems.length ? [row] : [];
      return [];
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    }
  };
  const window = {
    location: new URL("https://www.eyefans.com.tw/carts/cart-token-123"),
    localStorage,
    sessionStorage,
    setTimeout(callback, delay) {
      return setTimeout(callback, delay);
    },
    clearTimeout,
    setInterval,
    clearInterval,
    async fetch(url, options) {
      fetchCount += 1;
      throw new Error(`unexpected cart-page fetch: ${options?.method || "GET"} ${url}`);
    }
  };
  if (runtimeLineItems !== null) window.lineItems = runtimeLineItems;
  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortController,
    window,
    document,
    Event: class Event {
      constructor(type) {
        this.type = type;
      }
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });
  vm.runInContext(source, context, { filename: loaderPath });
  checkout.click = () => {
    checkout.clickCount += 1;
    listeners.click?.({
      target: {
        closest(selector) {
          return selector === "#checkout-button" ? checkout : null;
        }
      },
      preventDefault() {
        checkout.syntheticPrevented = true;
      },
      stopImmediatePropagation() {}
    });
  };
  return {
    checkout,
    document,
    listeners,
    localStorage,
    note,
    noteParent,
    window,
    fetchCount() {
      return fetchCount;
    }
  };
}

(async () => {
  const normal = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd"
  );
  assert.equal(normal.listeners.message, undefined, "normal product URL must stay inert");
  assert.equal(new URL(normal.frame.src).searchParams.has("cart"), false);

  const live = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { unavailableAfterAdd: true }
  );
  assert.equal(typeof live.listeners.message, "function");
  assert.equal(new URL(live.frame.src).searchParams.get("cart"), "1");

  const mutuallyExclusive = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_test=1&eyefans_cart_live_test=1"
  );
  assert.equal(mutuallyExclusive.listeners.message, undefined, "live loader must refuse a double test gate");
  assert.equal(new URL(mutuallyExclusive.frame.src).searchParams.has("cart"), false);

  live.listeners.message({
    origin: "https://nina82815.github.io",
    source: live.frameWindow,
    data: requestInContext(live.context, "request-live-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();

  const livePostRequests = live.requests.filter(request => request.options.method === "POST");
  assert.equal(livePostRequests.length, 1);
  assert.equal(
    live.requests.filter(request => request.options.method === "GET").length,
    3,
    "successful flow must verify product availability plus the /cart.json baseline and +1 delta"
  );
  assert.equal(
    live.requests.filter(request => request.url === "https://www.eyefans.com.tw/cart.json").length,
    2
  );
  assert.ok(live.requests.some(request => (
    request.url === "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd"
    && request.options.headers.Accept === "application/json"
  )));
  assert.equal(livePostRequests[0].url, "https://www.eyefans.com.tw/cart/add");
  assert.equal(livePostRequests[0].options.body, "id=87452778&quantity=1");
  assert.equal(livePostRequests[0].options.redirect, "error");
  assert.equal(live.replies.at(-1).message.ok, true);
  assert.match(live.replies.at(-1).message.designId, /^EF-/);
  assert.equal(live.pullNavCartCalls(), 1, "nav-cart refresh is best effort after verified success");

  const savedRecords = JSON.parse(live.localStorage.getItem("eyefansCustomCartDesignsV3"));
  assert.equal(savedRecords.length, 1);
  assert.equal(savedRecords[0].status, "active");
  assert.equal(savedRecords[0].selection.name, "PEIYU");
  assert.equal(savedRecords[0].receipt.variantId, "87452778");
  assert.equal(savedRecords[0].receipt.cartItemId, "87452778_normal_");
  assert.equal(savedRecords[0].receipt.cartQuantityBefore, 0);
  assert.equal(savedRecords[0].receipt.cartQuantityAfter, 1);
  assert.equal(savedRecords[0].receipt.verifiedByCartDelta, true);

  live.listeners.message({
    origin: "https://nina82815.github.io",
    source: live.frameWindow,
    data: requestInContext(live.context, "request-live-0002", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(
    live.requests.filter(request => request.options.method === "POST").length,
    1,
    "same design retry must not add a second cart item"
  );
  assert.equal(
    live.requests.filter(request => request.options.method === "GET").length,
    5,
    "cached success must still verify current product and cart state before returning"
  );
  assert.match(live.replies.at(-1).message.message, /此設計已加入購物車/);

  const localizedProduct = createProductEnvironment(
    "https://www.eyefans.com.tw/zh-TW/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1"
  );
  localizedProduct.listeners.message({
    origin: "https://nina82815.github.io",
    source: localizedProduct.frameWindow,
    data: requestInContext(localizedProduct.context, "request-localized-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(localizedProduct.replies.at(-1).message.ok, true);
  assert.ok(localizedProduct.requests.some(request => (
    request.url === "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd"
  )), "locale-prefixed product pages should use the canonical product JSON endpoint");

  const embedded = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { embedded: true }
  );
  embedded.listeners.message({
    origin: "https://nina82815.github.io",
    source: embedded.frameWindow,
    data: requestInContext(embedded.context, "request-embedded-0001", uvSelection())
  });
  await flushTasks();
  assert.equal(embedded.replies.at(-1).message.ok, false);
  assert.match(embedded.replies.at(-1).message.message, /新分頁/);
  assert.equal(embedded.requests.length, 0, "embedded preview must be blocked before any cart request");
  assert.equal(embedded.localStorage.getItem("eyefansCustomCartDesignsV3"), null);

  const postTimeout = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { hangPost: true }
  );
  postTimeout.listeners.message({
    origin: "https://nina82815.github.io",
    source: postTimeout.frameWindow,
    data: requestInContext(postTimeout.context, "request-post-timeout-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(
    postTimeout.requests.filter(request => request.options.method === "POST").length,
    1,
    "a timed-out cart POST must never be repeated automatically"
  );
  assert.equal(postTimeout.replies.at(-1).message.ok, false);
  assert.match(postTimeout.replies.at(-1).message.message, /購物車連線逾時/);
  assert.equal(
    JSON.parse(postTimeout.localStorage.getItem("eyefansCustomCartDesignsV3"))[0].status,
    "pending"
  );

  const oldPendingRecord = JSON.parse(
    postTimeout.localStorage.getItem("eyefansCustomCartDesignsV3")
  )[0];
  oldPendingRecord.createdAt = Date.now() - (6 * 60 * 1000);
  const oldPendingRetry = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { recordsJson: JSON.stringify([oldPendingRecord]) }
  );
  oldPendingRetry.listeners.message({
    origin: "https://nina82815.github.io",
    source: oldPendingRetry.frameWindow,
    data: requestInContext(oldPendingRetry.context, "request-old-pending-retry-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(
    oldPendingRetry.requests.filter(request => request.options.method === "POST").length,
    0,
    "an unresolved pending design must never auto-unlock into a second POST"
  );

  const beforeInvalidRequests = live.requests.filter(request => request.options.method === "POST").length;
  live.listeners.message({
    origin: "https://nina82815.github.io",
    source: live.frameWindow,
    data: requestInContext(live.context, "request-live-0003", uvSelection({
      size: "L",
      frame: "暖黃"
    }))
  });
  await flushTasks();
  assert.equal(
    live.requests.filter(request => request.options.method === "POST").length,
    beforeInvalidRequests
  );
  assert.equal(live.replies.at(-1).message.ok, false);

  const modeCases = [
    {
      handle: "cls-cus-mix-sun-rd",
      mode: "color",
      size: "XS",
      expectedVariant: "87452738",
      selection: colorSelection({ size: "XS" })
    },
    {
      handle: "cls-cus-mix-laser-sun-rd",
      mode: "engraving",
      size: "L",
      expectedVariant: "87452767",
      selection: engravingSelection({ size: "L", frame: "霧面黑", temple: "霧面白" })
    }
  ];

  for (const [index, testCase] of modeCases.entries()) {
    const environment = createProductEnvironment(
      `https://www.eyefans.com.tw/products/${testCase.handle}?eyefans_cart_live_test=1`,
      testCase.mode
    );
    environment.listeners.message({
      origin: "https://nina82815.github.io",
      source: environment.frameWindow,
      data: requestInContext(environment.context, `request-mode-${index + 1}-0001`, testCase.selection)
    });
    await flushTasks();
    await flushTasks();
    const postRequests = environment.requests.filter(request => request.options.method === "POST");
    assert.equal(postRequests.length, 1, `${testCase.mode} should call the cart once`);
    assert.equal(postRequests[0].options.body, `id=${testCase.expectedVariant}&quantity=1`);
    assert.equal(environment.replies.at(-1).message.ok, true);
  }

  const matchingCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 1
  });
  await flushTasks();
  await flushTasks();
  assert.match(matchingCart.note.value, /客人原有備註/);
  assert.match(matchingCart.note.value, /【eYeFANS 客製設計資料】/);
  assert.match(matchingCart.note.value, /尺寸：M/);
  assert.match(matchingCart.note.value, /鏡框：櫻花粉/);
  assert.match(matchingCart.note.value, /圖案：01／04/);
  assert.match(matchingCart.note.value, /排列：1 NAME 2/);
  assert.deepEqual(matchingCart.note.dispatched, ["input", "change"]);
  assert.equal(matchingCart.checkout.attributes.has("aria-disabled"), false);
  assert.equal(matchingCart.fetchCount(), 0, "cart page must use its current page state without GET /cart");

  matchingCart.note.value = "客人修改後的備註";
  let checkoutPrevented = false;
  matchingCart.listeners.click({
    target: {
      closest(selector) {
        return selector === "#checkout-button" ? matchingCart.checkout : null;
      }
    },
    preventDefault() {
      checkoutPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  await flushTasks();
  await flushTasks();
  assert.equal(checkoutPrevented, true);
  assert.equal(matchingCart.checkout.clickCount, 1);
  assert.equal(matchingCart.checkout.syntheticPrevented, undefined);
  assert.match(matchingCart.note.value, /客人修改後的備註/);
  assert.match(matchingCart.note.value, /【eYeFANS 客製設計資料】/);

  const mismatchCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 2
  });
  await flushTasks();
  await flushTasks();
  assert.equal(mismatchCart.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(mismatchCart.checkout.dataset.eyefansBlocked, "1");
  assert.equal(mismatchCart.note.value, "客人原有備註");
  const panel = mismatchCart.document.getElementById("eyefans-cart-design-summary");
  assert.equal(panel.dataset.state, "error");
  assert.match(panel.children[1].textContent, /購物車 2 件／客製設計 1 筆/);

  const invalidRecord = structuredClone(savedRecords[0]);
  invalidRecord.selection.size = "XS";
  const invalidStoredCart = createCartEnvironment({
    recordsJson: JSON.stringify([invalidRecord]),
    quantity: 1
  });
  await flushTasks();
  await flushTasks();
  assert.equal(invalidStoredCart.checkout.attributes.get("aria-disabled"), "true");

  const storageFailureCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 1,
    storageThrows: true
  });
  await flushTasks();
  await flushTasks();
  assert.equal(storageFailureCart.checkout.attributes.get("aria-disabled"), "true");
  assert.match(
    storageFailureCart.document.getElementById("eyefans-cart-design-summary").children[1].textContent,
    /無法保存或讀取客製資料/
  );

  const runtimeLineItemsCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 1,
    pageScriptBody: "window.customer = null;",
    runtimeLineItems: [{ variant_id: "87452778", quantity: 1 }]
  });
  await flushTasks();
  await flushTasks();
  assert.equal(runtimeLineItemsCart.checkout.attributes.has("aria-disabled"), false);
  assert.match(runtimeLineItemsCart.note.value, /【eYeFANS 客製設計資料】/);

  const unreadableCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 1,
    pageScriptBody: "window.customer = null;"
  });
  await flushTasks();
  await flushTasks();
  assert.equal(unreadableCart.checkout.attributes.get("aria-disabled"), "true");
  assert.match(
    unreadableCart.document.getElementById("eyefans-cart-design-summary").children[1].textContent,
    /無法讀取購物車內容/
  );

  const pendingRecord = structuredClone(savedRecords[0]);
  pendingRecord.status = "pending";
  pendingRecord.createdAt = Date.now();
  const pendingEmptyCart = createCartEnvironment({
    recordsJson: JSON.stringify([pendingRecord]),
    quantity: 0
  });
  await flushTasks();
  await flushTasks();
  assert.equal(pendingEmptyCart.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(JSON.parse(pendingEmptyCart.localStorage.getItem("eyefansCustomCartDesignsV3")).length, 1);
  assert.match(
    pendingEmptyCart.document.getElementById("eyefans-cart-design-summary").children[1].textContent,
    /仍在確認是否加入購物車/
  );

  const pendingPresentCart = createCartEnvironment({
    recordsJson: JSON.stringify([pendingRecord]),
    quantity: 1
  });
  await flushTasks();
  await flushTasks();
  assert.equal(pendingPresentCart.checkout.attributes.has("aria-disabled"), false);
  assert.match(pendingPresentCart.note.value, /【eYeFANS 客製設計資料】/);
  assert.equal(
    JSON.parse(pendingPresentCart.localStorage.getItem("eyefansCustomCartDesignsV3"))[0].status,
    "pending",
    "cart-page reconciliation must not upgrade an ambiguous POST into receipt-verified active"
  );
  pendingPresentCart.checkout.click();
  await flushTasks();
  await flushTasks();
  assert.equal(pendingPresentCart.checkout.clickCount, 2, "repeat checkout sync should safely continue");
  assert.equal(pendingPresentCart.checkout.attributes.has("aria-disabled"), false);
  assert.equal(
    JSON.parse(pendingPresentCart.localStorage.getItem("eyefansCustomCartDesignsV3"))[0].status,
    "pending"
  );

  const staleActive = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { recordsJson: JSON.stringify(savedRecords) }
  );
  staleActive.listeners.message({
    origin: "https://nina82815.github.io",
    source: staleActive.frameWindow,
    data: requestInContext(staleActive.context, "request-stale-active-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(staleActive.replies.at(-1).message.ok, true);
  assert.equal(staleActive.requests.filter(request => request.options.method === "POST").length, 1);
  const staleReplacement = JSON.parse(
    staleActive.localStorage.getItem("eyefansCustomCartDesignsV3")
  );
  assert.equal(staleReplacement.length, 1);
  assert.equal(staleReplacement[0].requestId, "request-stale-active-0001");
  assert.notEqual(staleReplacement[0].designId, savedRecords[0].designId);

  const preflightFailure = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { preflightStatus: 503 }
  );
  preflightFailure.listeners.message({
    origin: "https://nina82815.github.io",
    source: preflightFailure.frameWindow,
    data: requestInContext(preflightFailure.context, "request-preflight-fail-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(preflightFailure.replies.at(-1).message.ok, false);
  assert.match(preflightFailure.replies.at(-1).message.message, /尚未送出商品/);
  assert.equal(preflightFailure.requests.filter(request => request.options.method === "POST").length, 0);
  assert.equal(preflightFailure.localStorage.getItem("eyefansCustomCartDesignsV3"), null);

  const unavailableVariant = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    {
      productVariantOverrides: {
        M: { available: false, inventory_policy: "deny", inventory_quantity: 0 }
      }
    }
  );
  unavailableVariant.listeners.message({
    origin: "https://nina82815.github.io",
    source: unavailableVariant.frameWindow,
    data: requestInContext(unavailableVariant.context, "request-unavailable-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(unavailableVariant.replies.at(-1).message.ok, false);
  assert.match(unavailableVariant.replies.at(-1).message.message, /沒有可用庫存/);
  assert.equal(unavailableVariant.requests.filter(request => request.options.method === "POST").length, 0);
  assert.equal(unavailableVariant.localStorage.getItem("eyefansCustomCartDesignsV3"), null);

  const inventoryAtCapacity = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    {
      initialCartQuantities: { 87452778: 1 },
      productVariantOverrides: {
        M: { available: true, inventory_policy: "deny", inventory_quantity: 1 }
      }
    }
  );
  inventoryAtCapacity.listeners.message({
    origin: "https://nina82815.github.io",
    source: inventoryAtCapacity.frameWindow,
    data: requestInContext(inventoryAtCapacity.context, "request-inventory-cap-0001", uvSelection({ name: "NEW" }))
  });
  await flushTasks();
  await flushTasks();
  assert.equal(inventoryAtCapacity.replies.at(-1).message.ok, false);
  assert.match(inventoryAtCapacity.replies.at(-1).message.message, /沒有可用庫存/);
  assert.equal(inventoryAtCapacity.requests.filter(request => request.options.method === "POST").length, 0);
  assert.equal(inventoryAtCapacity.localStorage.getItem("eyefansCustomCartDesignsV3"), null);

  const productMismatchCases = [
    { productVariantOverrides: { M: { id: 99999999 } } },
    { productPayloadOverrides: { handle: "wrong-product-handle" } }
  ];
  for (const [index, behavior] of productMismatchCases.entries()) {
    const environment = createProductEnvironment(
      "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
      "uv",
      behavior
    );
    environment.listeners.message({
      origin: "https://nina82815.github.io",
      source: environment.frameWindow,
      data: requestInContext(environment.context, `request-product-mismatch-${index}-0001`, uvSelection())
    });
    await flushTasks();
    await flushTasks();
    assert.equal(environment.replies.at(-1).message.ok, false);
    assert.match(environment.replies.at(-1).message.message, /商品款式設定與模擬器不一致/);
    assert.equal(environment.requests.filter(request => request.options.method === "POST").length, 0);
    assert.equal(environment.localStorage.getItem("eyefansCustomCartDesignsV3"), null);
  }

  const rateLimited = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { postStatus: 429, postBody: "Too Many Requests" }
  );
  rateLimited.listeners.message({
    origin: "https://nina82815.github.io",
    source: rateLimited.frameWindow,
    data: requestInContext(rateLimited.context, "request-rate-limit-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(rateLimited.replies.at(-1).message.ok, false);
  assert.match(rateLimited.replies.at(-1).message.message, /操作速度過快/);
  assert.deepEqual(JSON.parse(rateLimited.localStorage.getItem("eyefansCustomCartDesignsV3")), []);

  const ambiguousReceiptCases = [
    { label: "empty", behavior: { postBody: "" } },
    {
      label: "non-json",
      behavior: { postBody: "added, but not JSON", postContentType: "text/plain" }
    },
    { label: "redirect", behavior: { postRedirected: true } },
    {
      label: "mismatch",
      behavior: { postReceiptOverrides: { variant_id_int: 99999999 } }
    }
  ];
  for (const [index, testCase] of ambiguousReceiptCases.entries()) {
    const environment = createProductEnvironment(
      "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
      "uv",
      testCase.behavior
    );
    environment.listeners.message({
      origin: "https://nina82815.github.io",
      source: environment.frameWindow,
      data: requestInContext(environment.context, `request-ambiguous-${index}-0001`, uvSelection())
    });
    await flushTasks();
    await flushTasks();
    assert.equal(environment.replies.at(-1).message.ok, true, `${testCase.label} receipt needs +1 proof`);
    assert.equal(environment.requests.filter(request => request.options.method === "POST").length, 1);
    assert.equal(environment.requests.filter(request => request.options.method === "GET").length, 3);
    const records = JSON.parse(environment.localStorage.getItem("eyefansCustomCartDesignsV3"));
    assert.equal(records[0].status, "active");
    assert.equal(records[0].receipt.verifiedByCartDelta, true);
  }

  const interruptedSuccess = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { throwAfterIncrement: true }
  );
  interruptedSuccess.listeners.message({
    origin: "https://nina82815.github.io",
    source: interruptedSuccess.frameWindow,
    data: requestInContext(interruptedSuccess.context, "request-interrupted-success-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(interruptedSuccess.replies.at(-1).message.ok, true);
  assert.equal(
    JSON.parse(interruptedSuccess.localStorage.getItem("eyefansCustomCartDesignsV3"))[0].status,
    "active"
  );
  interruptedSuccess.listeners.message({
    origin: "https://nina82815.github.io",
    source: interruptedSuccess.frameWindow,
    data: requestInContext(interruptedSuccess.context, "request-interrupted-retry-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(
    interruptedSuccess.requests.filter(request => request.options.method === "POST").length,
    1,
    "a network-interrupted POST proven by cart delta must not be repeated"
  );

  const strictReceiptWithoutDelta = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { skipCartIncrement: true }
  );
  strictReceiptWithoutDelta.listeners.message({
    origin: "https://nina82815.github.io",
    source: strictReceiptWithoutDelta.frameWindow,
    data: requestInContext(strictReceiptWithoutDelta.context, "request-no-delta-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(strictReceiptWithoutDelta.replies.at(-1).message.ok, false);
  assert.match(strictReceiptWithoutDelta.replies.at(-1).message.message, /無法確認購物車數量/);
  assert.equal(
    JSON.parse(strictReceiptWithoutDelta.localStorage.getItem("eyefansCustomCartDesignsV3"))[0].status,
    "pending"
  );
  strictReceiptWithoutDelta.listeners.message({
    origin: "https://nina82815.github.io",
    source: strictReceiptWithoutDelta.frameWindow,
    data: requestInContext(strictReceiptWithoutDelta.context, "request-no-delta-retry-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(
    strictReceiptWithoutDelta.requests.filter(request => request.options.method === "POST").length,
    1,
    "a no-delta pending design must never be POSTed again automatically"
  );

  const ambiguousWithoutDelta = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { postBody: "", skipCartIncrement: true }
  );
  ambiguousWithoutDelta.listeners.message({
    origin: "https://nina82815.github.io",
    source: ambiguousWithoutDelta.frameWindow,
    data: requestInContext(ambiguousWithoutDelta.context, "request-ambiguous-no-delta-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(ambiguousWithoutDelta.replies.at(-1).message.ok, false);
  assert.equal(
    JSON.parse(ambiguousWithoutDelta.localStorage.getItem("eyefansCustomCartDesignsV3"))[0].status,
    "pending"
  );
  ambiguousWithoutDelta.listeners.message({
    origin: "https://nina82815.github.io",
    source: ambiguousWithoutDelta.frameWindow,
    data: requestInContext(ambiguousWithoutDelta.context, "request-ambiguous-no-delta-retry-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(ambiguousWithoutDelta.requests.filter(request => request.options.method === "POST").length, 1);

  const postflightFailure = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { postflightStatus: 503 }
  );
  postflightFailure.listeners.message({
    origin: "https://nina82815.github.io",
    source: postflightFailure.frameWindow,
    data: requestInContext(postflightFailure.context, "request-postflight-fail-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(postflightFailure.replies.at(-1).message.ok, false);
  assert.match(postflightFailure.replies.at(-1).message.message, /無法確認購物車數量/);
  assert.equal(postflightFailure.requests.filter(request => request.options.method === "POST").length, 1);
  assert.equal(
    JSON.parse(postflightFailure.localStorage.getItem("eyefansCustomCartDesignsV3"))[0].status,
    "pending"
  );

  console.log("live cart test loader tests passed: gates + add + idempotency + note guard + failure safety");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
