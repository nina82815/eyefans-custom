"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loaderPath = path.join(__dirname, "..", "integration", "cyberbiz-cart-live-test-loader.js");
const source = fs.readFileSync(loaderPath, "utf8");

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
  const cartQuantities = new Map();
  let getRequestCount = 0;
  const localStorage = memoryStorage();
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
  const window = {
    location: new URL(href),
    localStorage,
    sessionStorage,
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    setTimeout(callback, delay) {
      if (behavior.immediateTimeout && delay === 12000) {
        Promise.resolve().then(callback);
        return 999999;
      }
      return setTimeout(callback, delay);
    },
    clearTimeout,
    async fetch(url, options) {
      requests.push({ url, options });
      if (options.method === "GET") {
        getRequestCount += 1;
        if (behavior.hangFirstGet && getRequestCount === 1) {
          return new Promise((resolve, reject) => {
            options.signal.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            }, { once: true });
          });
        }
        const lineItems = Array.from(cartQuantities, ([variant_id, quantity]) => ({ variant_id, quantity }));
        return {
          ok: true,
          status: 200,
          async text() {
            return `window.lineItems = ${JSON.stringify(lineItems)};`;
          }
        };
      }
      const variantId = new URLSearchParams(options.body).get("id");
      if (variantId && !behavior.skipCartIncrement && !behavior.postStatus) {
        cartQuantities.set(variantId, (cartQuantities.get(variantId) || 0) + 1);
      }
      if (behavior.throwAfterIncrement) throw new Error("connection interrupted");
      const status = behavior.postStatus || 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        async text() {
          return behavior.postBody ?? JSON.stringify({ success: true });
        }
      };
    }
  };
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
  return { context, frame, frameWindow, listeners, localStorage, sessionStorage, requests, replies };
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
  serverQuantity = quantity,
  serverBody = null,
  serverOk = true,
  deferFetch = false,
  storageThrows = false
}) {
  const listeners = {};
  const fetchReleases = [];
  const localStorage = memoryStorage({ eyefansCustomCartDesignsV1: recordsJson });
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
      textContent: 'window.lineItems = [{"variant_id":"87452778","quantity":1}];\nwindow.customer = null;'
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
      if (selector === "tr.line-item") return [row];
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
      if (deferFetch && delay === 350) return 888888;
      return setTimeout(callback, delay);
    },
    clearTimeout,
    setInterval,
    clearInterval,
    async fetch(url, options) {
      assert.equal(url, "https://www.eyefans.com.tw/cart");
      assert.equal(options.method, "GET");
      if (deferFetch) await new Promise(resolve => fetchReleases.push(resolve));
      return {
        ok: serverOk,
        status: serverOk ? 200 : 503,
        async text() {
          if (serverBody !== null) return serverBody;
          const items = serverQuantity > 0
            ? [{ variant_id: "87452778", quantity: serverQuantity }]
            : [];
          return `window.lineItems = ${JSON.stringify(items)};`;
        }
      };
    }
  };
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
    pendingFetches() {
      return fetchReleases.length;
    },
    releaseFetch() {
      const release = fetchReleases.shift();
      assert.ok(release, "expected a pending cart fetch");
      release();
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
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1"
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
  assert.equal(livePostRequests[0].url, "https://www.eyefans.com.tw/cart/add");
  assert.equal(livePostRequests[0].options.body, "id=87452778&quantity=1");
  assert.equal(live.replies.at(-1).message.ok, true);
  assert.match(live.replies.at(-1).message.designId, /^EF-/);

  const savedRecords = JSON.parse(live.localStorage.getItem("eyefansCustomCartDesignsV1"));
  assert.equal(savedRecords.length, 1);
  assert.equal(savedRecords[0].status, "active");
  assert.equal(savedRecords[0].selection.name, "PEIYU");

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
  assert.match(live.replies.at(-1).message.message, /此設計已加入購物車/);

  const preflightTimeout = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { hangFirstGet: true, immediateTimeout: true }
  );
  preflightTimeout.listeners.message({
    origin: "https://nina82815.github.io",
    source: preflightTimeout.frameWindow,
    data: requestInContext(preflightTimeout.context, "request-preflight-timeout-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(
    preflightTimeout.requests.filter(request => request.options.method === "POST").length,
    0,
    "a timed-out preflight must never start the cart POST"
  );
  assert.equal(preflightTimeout.replies.at(-1).message.ok, false);
  assert.match(preflightTimeout.replies.at(-1).message.message, /購物車連線逾時/);

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

  const staleDomCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 0,
    serverQuantity: 1
  });
  await flushTasks();
  await flushTasks();
  assert.equal(staleDomCart.checkout.attributes.has("aria-disabled"), false);
  assert.match(staleDomCart.note.value, /【eYeFANS 客製設計資料】/);
  assert.equal(JSON.parse(staleDomCart.localStorage.getItem("eyefansCustomCartDesignsV1")).length, 1);

  const unreadableCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 1,
    serverBody: "<html><body>cart markup changed</body></html>"
  });
  await flushTasks();
  await flushTasks();
  assert.equal(unreadableCart.checkout.attributes.get("aria-disabled"), "true");
  assert.match(
    unreadableCart.document.getElementById("eyefans-cart-design-summary").children[1].textContent,
    /無法向 CYBERBIZ 確認最新購物車/
  );

  const pendingRecord = structuredClone(savedRecords[0]);
  pendingRecord.status = "pending";
  pendingRecord.createdAt = Date.now();
  const pendingEmptyCart = createCartEnvironment({
    recordsJson: JSON.stringify([pendingRecord]),
    quantity: 0,
    serverQuantity: 0
  });
  await flushTasks();
  await flushTasks();
  assert.equal(pendingEmptyCart.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(JSON.parse(pendingEmptyCart.localStorage.getItem("eyefansCustomCartDesignsV1")).length, 1);
  assert.match(
    pendingEmptyCart.document.getElementById("eyefans-cart-design-summary").children[1].textContent,
    /仍在確認是否加入購物車/
  );

  const mutationRaceCart = createCartEnvironment({
    recordsJson: JSON.stringify(savedRecords),
    quantity: 1,
    deferFetch: true
  });
  assert.equal(mutationRaceCart.pendingFetches(), 1);
  mutationRaceCart.releaseFetch();
  await flushTasks();
  await flushTasks();
  assert.equal(mutationRaceCart.checkout.attributes.has("aria-disabled"), false);

  let mutationCheckoutPrevented = false;
  mutationRaceCart.listeners.click({
    target: {
      closest(selector) {
        return selector === "#checkout-button" ? mutationRaceCart.checkout : null;
      }
    },
    preventDefault() {
      mutationCheckoutPrevented = true;
    },
    stopImmediatePropagation() {}
  });
  assert.equal(mutationRaceCart.pendingFetches(), 1);
  mutationRaceCart.listeners.change({
    target: {
      matches(selector) {
        return selector === '[data-testid="quantity-input"]';
      }
    }
  });
  mutationRaceCart.releaseFetch();
  await flushTasks();
  await flushTasks();
  assert.equal(mutationCheckoutPrevented, true);
  assert.equal(mutationRaceCart.checkout.clickCount, 0, "cart mutation must cancel an in-flight checkout");
  assert.equal(mutationRaceCart.checkout.attributes.get("aria-disabled"), "true");

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
  assert.deepEqual(JSON.parse(rateLimited.localStorage.getItem("eyefansCustomCartDesignsV1")), []);

  const malformedSuccess = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { postBody: "added, but not JSON" }
  );
  malformedSuccess.listeners.message({
    origin: "https://nina82815.github.io",
    source: malformedSuccess.frameWindow,
    data: requestInContext(malformedSuccess.context, "request-malformed-success-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(malformedSuccess.replies.at(-1).message.ok, true);
  assert.equal(
    JSON.parse(malformedSuccess.localStorage.getItem("eyefansCustomCartDesignsV1"))[0].status,
    "active"
  );

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
    JSON.parse(interruptedSuccess.localStorage.getItem("eyefansCustomCartDesignsV1"))[0].status,
    "active"
  );

  const unverified = createProductEnvironment(
    "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1",
    "uv",
    { skipCartIncrement: true }
  );
  unverified.listeners.message({
    origin: "https://nina82815.github.io",
    source: unverified.frameWindow,
    data: requestInContext(unverified.context, "request-verify-fail-0001", uvSelection())
  });
  await flushTasks();
  await flushTasks();
  assert.equal(unverified.replies.at(-1).message.ok, false);
  assert.match(unverified.replies.at(-1).message.message, /無法確認購物車數量/);
  const pendingRecords = JSON.parse(unverified.localStorage.getItem("eyefansCustomCartDesignsV1"));
  assert.equal(pendingRecords.length, 1);
  assert.equal(pendingRecords[0].status, "pending");

  console.log("live cart test loader tests passed: gates + add + idempotency + note guard + failure safety");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
