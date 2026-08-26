"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loaderPath = path.join(__dirname, "..", "integration", "cyberbiz-cart-production-loader.js");
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
  const documentListeners = {};
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
    ? { eyefansCustomCartDesignsProdV1: behavior.recordsJson }
    : {});
  const sessionStorage = memoryStorage();
  const frameWindow = {
    postMessage(message, targetOrigin) {
      replies.push({ message, targetOrigin });
    }
  };
  const frame = {
    src: behavior.frameSrc || `https://nina82815.github.io/eyefans-custom/?mode=${mode}&locked=1`,
    contentWindow: frameWindow
  };
  const nativeControls = (behavior.nativePurchaseLabels || []).map(label => {
    const control = genericElement("button");
    control.textContent = label;
    control.disabled = false;
    control.closest = selector => (selector.includes("button") ? control : null);
    return control;
  });
  const unrelatedControls = (behavior.unrelatedPurchaseLabels || []).map(label => {
    const control = genericElement("button");
    control.textContent = label;
    control.disabled = false;
    return control;
  });
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
    setTimeout(callback, delay) {
      return delay === 20000 ? 0 : setTimeout(callback, delay);
    },
    clearTimeout(handle) {
      if (handle) clearTimeout(handle);
    },
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
    currentScript: behavior.loaderSrc ? { src: behavior.loaderSrc } : null,
    querySelectorAll(selector) {
      if (selector === ".eyefans-custom-wrap iframe") return [frame];
      if (selector.includes("#product_info .product_button")) return nativeControls;
      throw new Error(`unexpected product selector: ${selector}`);
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
    clearTimeout
  });
  vm.runInContext(source, context, { filename: loaderPath });
  return {
    context,
    frame,
    frameWindow,
    documentListeners,
    nativeControls,
    unrelatedControls,
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
  legacyRecordsJson,
  quantity,
  cartToken = "cart-token-123",
  variantId = "87452778",
  pageScriptBody = null,
  runtimeLineItems = null,
  storageThrows = false,
  mobileLayout = false
}) {
  const listeners = {};
  let fetchCount = 0;
  const pageLineItems = quantity > 0
    ? [{ variant_id: variantId, quantity: 1 }]
    : [];
  const storageSeed = {};
  if (recordsJson !== undefined) storageSeed.eyefansCustomCartDesignsProdV1 = recordsJson;
  if (legacyRecordsJson !== undefined) storageSeed.eyefansCustomCartDesignsV3 = legacyRecordsJson;
  const localStorage = memoryStorage(storageSeed);
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
  function MockTextAreaElement() {}
  Object.defineProperty(MockTextAreaElement.prototype, "value", {
    configurable: true,
    get() {
      return this.nativeValue || "";
    },
    set(value) {
      this.nativeValue = String(value);
      this.nativeSetterCalls = (this.nativeSetterCalls || 0) + 1;
    }
  });
  Object.setPrototypeOf(note, MockTextAreaElement.prototype);
  note.value = "客人原有備註";
  // Model the own value tracker installed by React. A direct assignment would
  // update this tracker before the input event and React would ignore it.
  const nativeValue = Object.getOwnPropertyDescriptor(MockTextAreaElement.prototype, "value");
  note.reactTrackedValue = note.value;
  Object.defineProperty(note, "value", {
    configurable: true,
    get() {
      return nativeValue.get.call(this);
    },
    set(value) {
      nativeValue.set.call(this, value);
      this.reactTrackedValue = String(value);
    }
  });
  note.dispatched = [];
  note.dispatchEvent = event => note.dispatched.push({
    type: event.type,
    value: note.value,
    trackedBeforeEvent: note.reactTrackedValue
  });
  noteParent.append(note);
  const checkout = genericElement("button", "checkout-button");
  checkout.clickCount = 0;
  const floatingCheckout = genericElement("button");
  floatingCheckout.clickCount = 0;
  const quantityInput = genericElement("input");
  quantityInput.value = String(quantity);
  const row = genericElement(mobileLayout ? "div" : "tr");
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
      if (selector === "#checkout-button, .floating-checkout-button button") return checkout;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "tr.line-item, div.line-item") return pageLineItems.length ? [row] : [];
      if (selector === "#checkout-button, .floating-checkout-button button") {
        return [checkout, floatingCheckout];
      }
      return [];
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    }
  };
  const jqueryHandlers = [];
  function jQuery(target) {
    assert.equal(target, document);
    return {
      on(events, handler) {
        String(events).split(/\s+/).filter(Boolean).forEach(eventName => {
          jqueryHandlers.push({ eventName: eventName.split(".")[0], handler });
        });
      }
    };
  }
  const window = {
    location: new URL(`https://www.eyefans.com.tw/carts/${cartToken}`),
    localStorage,
    sessionStorage,
    HTMLTextAreaElement: MockTextAreaElement,
    jQuery,
    setTimeout(callback, delay) {
      return setTimeout(callback, delay === 350 ? 0 : delay);
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
          return selector === "#checkout-button, .floating-checkout-button button" ? checkout : null;
        }
      },
      preventDefault() {
        checkout.syntheticPrevented = true;
      },
      stopImmediatePropagation() {}
    });
  };
  floatingCheckout.click = () => {
    floatingCheckout.clickCount += 1;
    listeners.click?.({
      target: {
        closest(selector) {
          return selector === "#checkout-button, .floating-checkout-button button"
            ? floatingCheckout
            : null;
        }
      },
      preventDefault() {
        floatingCheckout.syntheticPrevented = true;
      },
      stopImmediatePropagation() {}
    });
  };
  return {
    context,
    checkout,
    floatingCheckout,
    document,
    listeners,
    localStorage,
    note,
    noteParent,
    window,
    triggerJQuery(eventName, ...args) {
      const event = {
        type: eventName,
        defaultPrevented: false,
        immediatePropagationStopped: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopImmediatePropagation() {
          this.immediatePropagationStopped = true;
        }
      };
      jqueryHandlers
        .filter(item => item.eventName === eventName)
        .forEach(item => item.handler(event, ...args));
      return event;
    },
    fetchCount() {
      return fetchCount;
    }
  };
}

(async () => {
  assert.match(source, /eyefansCustomCartDesignsProdV1/);
  assert.doesNotMatch(source, /eyefansCustomCartDesignsV3/);
  assert.doesNotMatch(source, /liveTest\s*:\s*true/);
  assert.match(source, /#product_info \.product_button > button\.addToCart\[data-id=/);
  assert.doesNotMatch(source, /#related-products|nav\.tool-nav/);
  assert.doesNotMatch(source, /const labels = new Set\(\["加入購物車", "立即購買"\]\)/);

  const live = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
    "uv",
    { unavailableAfterAdd: true }
  );
  assert.equal(typeof live.listeners.message, "function", "normal allow-listed product URL must activate");
  assert.equal(new URL(live.frame.src).searchParams.get("cart"), "1");

  const liveTestGate = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1"
  );
  assert.equal(liveTestGate.listeners.message, undefined, "production loader must refuse live-test URLs");
  assert.equal(new URL(liveTestGate.frame.src).searchParams.has("cart"), false);

  const noWriteTestGate = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_test=1"
  );
  assert.equal(noWriteTestGate.listeners.message, undefined, "production loader must refuse no-write test URLs");

  const mutuallyExclusive = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_test=1&eyefans_cart_live_test=1"
  );
  assert.equal(mutuallyExclusive.listeners.message, undefined, "production loader must refuse every test gate");
  assert.equal(new URL(mutuallyExclusive.frame.src).searchParams.has("cart"), false);

  const drainProduct = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
    "uv",
    { loaderSrc: "https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader.js?drain=1" }
  );
  assert.equal(drainProduct.listeners.message, undefined, "drain mode must stop accepting new designs");

  const unsupportedProduct = createProductEnvironment(
    "https://www.eyefans.com.tw/products/not-an-eyefans-custom-product"
  );
  assert.equal(unsupportedProduct.listeners.message, undefined);

  const foreignOrigin = createProductEnvironment(
    "https://shop.example.com/products/cls-cus-mix-uv-sun-rd"
  );
  assert.equal(foreignOrigin.listeners.message, undefined);

  const nativePurchaseLock = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
    "uv",
    {
      nativePurchaseLabels: ["加入購物車", "立即購買"],
      unrelatedPurchaseLabels: ["導覽列立即購買", "相關商品加入購物車", "手機前往購物車"]
    }
  );
  assert.ok(nativePurchaseLock.nativeControls.every(control => control.disabled === true));
  assert.ok(nativePurchaseLock.nativeControls.every(control => (
    control.dataset.eyefansNativePurchase === "blocked"
    && control.textContent === "請使用下方模擬器加入購物車"
  )));
  assert.ok(nativePurchaseLock.unrelatedControls.every(control => (
    control.disabled === false && control.dataset.eyefansNativePurchase === undefined
  )), "navbar, related products, and mobile cart links must remain available");
  let nativeClickPrevented = false;
  nativePurchaseLock.documentListeners.click({
    target: nativePurchaseLock.nativeControls[0],
    preventDefault() {
      nativeClickPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  assert.equal(nativeClickPrevented, true, "native product purchase clicks must be blocked");
  let nativeSubmitPrevented = false;
  nativePurchaseLock.documentListeners.submit({
    target: {
      querySelector(selector) {
        return selector === "[data-eyefans-native-purchase='blocked']"
          ? nativePurchaseLock.nativeControls[0]
          : null;
      }
    },
    preventDefault() {
      nativeSubmitPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  assert.equal(nativeSubmitPrevented, true, "native product forms must be blocked");

  const invalidFrameCases = [
    "https://evil.example/eyefans-custom/?mode=uv&locked=1",
    "https://nina82815.github.io/other-app/?mode=uv&locked=1",
    "https://nina82815.github.io/eyefans-custom/?mode=color&locked=1",
    "https://nina82815.github.io/eyefans-custom/?mode=uv"
  ];
  invalidFrameCases.forEach(frameSrc => {
    const environment = createProductEnvironment(
      "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
      "uv",
      { frameSrc }
    );
    assert.equal(environment.listeners.message, undefined, `untrusted iframe must stay inactive: ${frameSrc}`);
    assert.equal(new URL(environment.frame.src).searchParams.has("cart"), false);
  });

  const ignoredPostCount = live.requests.length;
  const ignoredReplyCount = live.replies.length;
  live.listeners.message({
    origin: "https://nina82815.github.io",
    source: {},
    data: requestInContext(live.context, "request-wrong-source-0001", uvSelection())
  });
  live.listeners.message({
    origin: "https://evil.example",
    source: live.frameWindow,
    data: requestInContext(live.context, "request-wrong-origin-0001", uvSelection())
  });
  await flushTasks();
  assert.equal(live.requests.length, ignoredPostCount);
  assert.equal(live.replies.length, ignoredReplyCount);

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

  const savedRecords = JSON.parse(live.localStorage.getItem("eyefansCustomCartDesignsProdV1"));
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
    "https://www.eyefans.com.tw/zh-TW/products/cls-cus-mix-uv-sun-rd"
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
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
  assert.equal(embedded.localStorage.getItem("eyefansCustomCartDesignsProdV1"), null);

  const postTimeout = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    JSON.parse(postTimeout.localStorage.getItem("eyefansCustomCartDesignsProdV1"))[0].status,
    "pending"
  );

  const oldPendingRecord = JSON.parse(
    postTimeout.localStorage.getItem("eyefansCustomCartDesignsProdV1")
  )[0];
  oldPendingRecord.createdAt = Date.now() - (6 * 60 * 1000);
  const oldPendingRetry = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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

  const modeMatrix = [
    { handle: "cls-cus-mix-sun-rd", mode: "color", selection: colorSelection },
    { handle: "cls-cus-mix-laser-sun-rd", mode: "engraving", selection: engravingSelection },
    { handle: "cls-cus-mix-uv-sun-rd", mode: "uv", selection: uvSelection }
  ];
  let matrixIndex = 0;
  for (const testCase of modeMatrix) {
    for (const [size, expectedVariant] of Object.entries(TEST_PRODUCTS[testCase.handle].variants)) {
      matrixIndex += 1;
      const environment = createProductEnvironment(
        `https://www.eyefans.com.tw/products/${testCase.handle}`,
        testCase.mode
      );
      environment.listeners.message({
        origin: "https://nina82815.github.io",
        source: environment.frameWindow,
        data: requestInContext(
          environment.context,
          `request-matrix-${String(matrixIndex).padStart(2, "0")}-0001`,
          testCase.selection({ size })
        )
      });
      await flushTasks();
      await flushTasks();
      const postRequests = environment.requests.filter(request => request.options.method === "POST");
      assert.equal(postRequests.length, 1, `${testCase.mode}/${size} should call the cart once`);
      assert.equal(postRequests[0].options.body, `id=${expectedVariant}&quantity=1`);
      assert.equal(environment.replies.at(-1).message.ok, true);
    }
  }

  const limitRecords = Array.from({ length: 20 }, (_unused, index) => ({
    ...structuredClone(savedRecords[0]),
    designId: `EF-LIMIT-${String(index + 1).padStart(6, "0")}`,
    requestId: `request-limit-seed-${String(index + 1).padStart(2, "0")}`
  }));
  const designLimit = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
    "uv",
    { recordsJson: JSON.stringify(limitRecords) }
  );
  designLimit.listeners.message({
    origin: "https://nina82815.github.io",
    source: designLimit.frameWindow,
    data: requestInContext(designLimit.context, "request-limit-new-0001", uvSelection({ name: "NEW" }))
  });
  await flushTasks();
  await flushTasks();
  assert.equal(designLimit.requests.filter(request => request.options.method === "POST").length, 0);
  assert.match(designLimit.replies.at(-1).message.message, /數量已達上限/);

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
  assert.deepEqual(matchingCart.note.dispatched.map(event => event.type), ["input", "change"]);
  assert.equal(
    matchingCart.note.dispatched[0].trackedBeforeEvent,
    "客人原有備註",
    "native setter must bypass React's controlled-input value tracker before input"
  );
  assert.match(matchingCart.note.dispatched[0].value, /【eYeFANS 客製設計資料】/);
  assert.equal(matchingCart.checkout.attributes.has("aria-disabled"), false);
  assert.equal(matchingCart.floatingCheckout.attributes.has("aria-disabled"), false);
  assert.equal(matchingCart.fetchCount(), 0, "cart page must use its current page state without GET /cart");

  const mobileMatchingCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 1,
    mobileLayout: true
  });
  await flushTasks();
  await flushTasks();
  assert.equal(mobileMatchingCart.checkout.attributes.has("aria-disabled"), false);
  assert.equal(mobileMatchingCart.floatingCheckout.attributes.has("aria-disabled"), false);
  assert.match(mobileMatchingCart.note.value, /【eYeFANS 客製設計資料】/);

  const checkoutPayload = vm.runInContext("({})", matchingCart.context);
  const verifiedCheckoutEvent = matchingCart.triggerJQuery("checkout_cart:checkout", checkoutPayload);
  assert.equal(verifiedCheckoutEvent.defaultPrevented, false);
  assert.match(
    checkoutPayload['order[note]'],
    /【eYeFANS 客製設計資料】/,
    "verified note must be copied into CYBERBIZ's final serialized checkout payload"
  );

  matchingCart.note.value = "React 更新後暫時取代內容";
  matchingCart.triggerJQuery("checkout_cart:added");
  await new Promise(resolve => setTimeout(resolve, 5));
  await flushTasks();
  await flushTasks();
  assert.match(matchingCart.note.value, /【eYeFANS 客製設計資料】/);
  assert.equal(matchingCart.checkout.attributes.has("aria-disabled"), false);

  const missingRecordsCheckout = createCartEnvironment({
    recordsJson: "[]",
    quantity: 1
  });
  await flushTasks();
  await flushTasks();
  assert.equal(typeof missingRecordsCheckout.listeners.click, "function");
  assert.equal(missingRecordsCheckout.checkout.attributes.get("aria-disabled"), "true");
  assert.match(
    missingRecordsCheckout.document.getElementById("eyefans-cart-design-summary").children[1].textContent,
    /客製商品數量與設計資料不一致/
  );

  const ordinaryCheckout = createCartEnvironment({
    recordsJson: "[]",
    quantity: 1,
    variantId: "99999999"
  });
  await flushTasks();
  assert.equal(ordinaryCheckout.listeners.click, undefined, "ordinary checkout must stay completely inert");
  assert.equal(ordinaryCheckout.document.getElementById("eyefans-cart-design-summary"), null);
  assert.equal(ordinaryCheckout.checkout.attributes.has("aria-disabled"), false);

  const legacyOnlyCustomCheckout = createCartEnvironment({
    legacyRecordsJson: JSON.stringify(savedRecords),
    quantity: 1
  });
  await flushTasks();
  await flushTasks();
  assert.equal(legacyOnlyCustomCheckout.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(legacyOnlyCustomCheckout.localStorage.getItem("eyefansCustomCartDesignsProdV1"), "[]");
  assert.equal(
    legacyOnlyCustomCheckout.localStorage.getItem("eyefansCustomCartDesignsV3"),
    JSON.stringify(savedRecords),
    "production loader must not read or mutate staging V3 records"
  );

  const foreignCartRecord = structuredClone(savedRecords[0]);
  foreignCartRecord.cartToken = "cart-token-a";
  const emptySecondCart = createCartEnvironment({
    recordsJson: JSON.stringify([foreignCartRecord]),
    quantity: 0,
    cartToken: "cart-token-b"
  });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(
    JSON.parse(emptySecondCart.localStorage.getItem("eyefansCustomCartDesignsProdV1")),
    [foreignCartRecord],
    "reconciling an empty second cart must preserve another cart token's design records"
  );

  const unboundCartRecord = structuredClone(savedRecords[0]);
  unboundCartRecord.cartToken = null;
  const emptyCartBeforeFirstBinding = createCartEnvironment({
    recordsJson: JSON.stringify([unboundCartRecord]),
    quantity: 0,
    cartToken: "cart-token-b"
  });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(
    JSON.parse(emptyCartBeforeFirstBinding.localStorage.getItem("eyefansCustomCartDesignsProdV1")),
    [unboundCartRecord],
    "an empty cart must preserve an active design that has not received its first cart token"
  );

  const differentVariantCart = createCartEnvironment({
    recordsJson: JSON.stringify([unboundCartRecord]),
    quantity: 1,
    cartToken: "cart-token-b",
    variantId: "87452777"
  });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(
    JSON.parse(differentVariantCart.localStorage.getItem("eyefansCustomCartDesignsProdV1")),
    [unboundCartRecord],
    "a different custom variant must not claim or discard an unbound design"
  );
  assert.equal(differentVariantCart.checkout.attributes.get("aria-disabled"), "true");

  matchingCart.note.value = "客人修改後的備註";
  let checkoutPrevented = false;
  matchingCart.listeners.click({
    target: {
      closest(selector) {
        return selector === "#checkout-button, .floating-checkout-button button"
          ? matchingCart.checkout
          : null;
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

  let floatingCheckoutPrevented = false;
  matchingCart.listeners.click({
    target: {
      closest(selector) {
        return selector === "#checkout-button, .floating-checkout-button button"
          ? matchingCart.floatingCheckout
          : null;
      }
    },
    preventDefault() {
      floatingCheckoutPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  assert.equal(floatingCheckoutPrevented, true);
  assert.equal(matchingCart.floatingCheckout.clickCount, 1, "verified floating checkout must retry once");

  let matchingSubmitPrevented = false;
  let matchingRequestSubmitCount = 0;
  const matchingForm = {
    querySelector(selector) {
      return selector === "#checkout-button, .floating-checkout-button button"
        ? matchingCart.checkout
        : null;
    },
    contains(element) {
      return element === matchingCart.checkout;
    },
    requestSubmit() {
      matchingRequestSubmitCount += 1;
      matchingCart.listeners.submit({
        target: matchingForm,
        preventDefault() {
          throw new Error("verified retry submit must be allowed");
        },
        stopImmediatePropagation() {}
      });
    }
  };
  matchingCart.listeners.submit({
    target: matchingForm,
    preventDefault() {
      matchingSubmitPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  assert.equal(matchingSubmitPrevented, true, "direct form submit must reconcile before checkout");
  assert.equal(matchingRequestSubmitCount, 1, "verified form submit must retry exactly once");

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
  const blockedPayload = vm.runInContext("({})", mismatchCart.context);
  const blockedCheckoutEvent = mismatchCart.triggerJQuery("checkout_cart:checkout", blockedPayload);
  assert.equal(blockedCheckoutEvent.defaultPrevented, true);
  assert.equal(blockedCheckoutEvent.immediatePropagationStopped, true);
  assert.equal(blockedPayload['order[note]'], undefined);
  let blockedFloatingPrevented = false;
  mismatchCart.listeners.click({
    target: {
      closest(selector) {
        return selector === "#checkout-button, .floating-checkout-button button"
          ? mismatchCart.floatingCheckout
          : null;
      }
    },
    preventDefault() {
      blockedFloatingPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  assert.equal(blockedFloatingPrevented, true);
  assert.equal(mismatchCart.floatingCheckout.clickCount, 0, "mismatched EF data must block floating checkout");
  let mismatchSubmitPrevented = false;
  let mismatchRequestSubmitCount = 0;
  const mismatchForm = {
    querySelector(selector) {
      return selector === "#checkout-button, .floating-checkout-button button"
        ? mismatchCart.checkout
        : null;
    },
    contains(element) {
      return element === mismatchCart.checkout;
    },
    requestSubmit() {
      mismatchRequestSubmitCount += 1;
    }
  };
  mismatchCart.listeners.submit({
    target: mismatchForm,
    preventDefault() {
      mismatchSubmitPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  assert.equal(mismatchSubmitPrevented, true);
  assert.equal(mismatchRequestSubmitCount, 0, "mismatched custom data must never resubmit checkout");

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
  delete pendingRecord.receipt;
  const pendingEmptyCart = createCartEnvironment({
    recordsJson: JSON.stringify([pendingRecord]),
    quantity: 0
  });
  await flushTasks();
  await flushTasks();
  assert.equal(pendingEmptyCart.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(JSON.parse(pendingEmptyCart.localStorage.getItem("eyefansCustomCartDesignsProdV1")).length, 1);
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
    JSON.parse(pendingPresentCart.localStorage.getItem("eyefansCustomCartDesignsProdV1"))[0].status,
    "pending",
    "cart-page reconciliation must not upgrade an ambiguous POST into receipt-verified active"
  );
  pendingPresentCart.checkout.click();
  await flushTasks();
  await flushTasks();
  assert.equal(pendingPresentCart.checkout.clickCount, 2, "repeat checkout sync should safely continue");
  assert.equal(pendingPresentCart.checkout.attributes.has("aria-disabled"), false);
  assert.equal(
    JSON.parse(pendingPresentCart.localStorage.getItem("eyefansCustomCartDesignsProdV1"))[0].status,
    "pending"
  );

  const staleActive = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    staleActive.localStorage.getItem("eyefansCustomCartDesignsProdV1")
  );
  assert.equal(staleReplacement.length, 1);
  assert.equal(staleReplacement[0].requestId, "request-stale-active-0001");
  assert.notEqual(staleReplacement[0].designId, savedRecords[0].designId);

  const preflightFailure = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
  assert.equal(preflightFailure.localStorage.getItem("eyefansCustomCartDesignsProdV1"), null);

  const unavailableVariant = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
  assert.equal(unavailableVariant.localStorage.getItem("eyefansCustomCartDesignsProdV1"), null);

  const inventoryAtCapacity = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
  assert.equal(inventoryAtCapacity.localStorage.getItem("eyefansCustomCartDesignsProdV1"), null);

  const productMismatchCases = [
    { productVariantOverrides: { M: { id: 99999999 } } },
    { productPayloadOverrides: { handle: "wrong-product-handle" } }
  ];
  for (const [index, behavior] of productMismatchCases.entries()) {
    const environment = createProductEnvironment(
      "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    assert.equal(environment.localStorage.getItem("eyefansCustomCartDesignsProdV1"), null);
  }

  const rateLimited = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
  assert.deepEqual(JSON.parse(rateLimited.localStorage.getItem("eyefansCustomCartDesignsProdV1")), []);

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
      "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    const records = JSON.parse(environment.localStorage.getItem("eyefansCustomCartDesignsProdV1"));
    assert.equal(records[0].status, "active");
    assert.equal(records[0].receipt.verifiedByCartDelta, true);
  }

  const interruptedSuccess = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    JSON.parse(interruptedSuccess.localStorage.getItem("eyefansCustomCartDesignsProdV1"))[0].status,
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
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    JSON.parse(strictReceiptWithoutDelta.localStorage.getItem("eyefansCustomCartDesignsProdV1"))[0].status,
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
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    JSON.parse(ambiguousWithoutDelta.localStorage.getItem("eyefansCustomCartDesignsProdV1"))[0].status,
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
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd",
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
    JSON.parse(postflightFailure.localStorage.getItem("eyefansCustomCartDesignsProdV1"))[0].status,
    "pending"
  );

  console.log("production cart loader tests passed: gates + native lock + add + note fail-closed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
