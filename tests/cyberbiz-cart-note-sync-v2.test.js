"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loaderPath = path.join(
  __dirname,
  "..",
  "integration",
  "cyberbiz-cart-production-loader-20260901-polarized-v2.js"
);
const source = fs.readFileSync(loaderPath, "utf8");
const STORAGE_KEY = "eyefansCustomCartDesignsSizeLensDevV1";
const PRODUCTION_STORAGE_KEY = "eyefansCustomCartDesignsProdV1";
const CART_TOKEN = "delayed-delete-cart";

const TARGETS = Object.freeze({
  polarized: Object.freeze({
    handle: "cls-cus-mix-pl-rd",
    productId: "71536665",
    variantId: "87452748",
    lens: "偏光鏡片"
  }),
  gray: Object.freeze({
    handle: "cls-cus-mix-sun-rd",
    productId: "71536660",
    variantId: "87452740",
    lens: "三號灰片"
  }),
  "blue-tea": Object.freeze({
    handle: "cls-cus-mix-bl-rd",
    productId: "71536666",
    variantId: "87452752",
    lens: "抗藍光鏡片"
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
    }
  };
}

function genericElement(tagName, id = "") {
  return {
    tagName: String(tagName).toUpperCase(),
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
      for (const child of children) {
        child.parentElement = this;
        this.children.push(child);
      }
    },
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    insertBefore(child) {
      child.parentElement = this;
      this.children.unshift(child);
      return child;
    },
    replaceChildren(...children) {
      this.children = [];
      this.append(...children);
    },
    remove() {
      if (!this.parentElement) return;
      this.parentElement.children = this.parentElement.children.filter(child => child !== this);
      this.parentElement = null;
    },
    scrollIntoView() {}
  };
}

function colorSelection(lensId, frame) {
  return {
    customizationMode: "color",
    size: "M",
    frame,
    temple: "櫻花粉",
    lensId,
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
  };
}

function fingerprintFor(handle, selection) {
  const value = `${handle}|${JSON.stringify(selection)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

function activeRecord({ requestId, designId, lensId, frame, before, after }) {
  const handle = "cls-cus-mix-sun-rd";
  const target = TARGETS[lensId];
  const selection = colorSelection(lensId, frame);
  const createdAt = Date.now() - 1000;
  return {
    designId,
    requestId,
    fingerprint: fingerprintFor(handle, selection),
    handle,
    mode: "color",
    targetHandle: target.handle,
    targetProductId: target.productId,
    variantId: target.variantId,
    selection,
    status: "active",
    cartToken: CART_TOKEN,
    createdAt,
    receipt: {
      variantId: target.variantId,
      cartItemId: `${target.variantId}_normal_`,
      quantity: 1,
      cartQuantityBefore: before,
      cartQuantityAfter: after,
      verifiedByCartDelta: true,
      verifiedAt: createdAt + 100
    }
  };
}

function cartItem(variantId, quantity) {
  return {
    variant_id_int: Number(variantId),
    variant_id: `${variantId}_normal_`,
    cart_item_id: `${variantId}_normal_`,
    quantity
  };
}

function createEnvironment(records, {
  productionRuntime = false,
  itemCountMode = "lines",
  omitTotalQuantity = false,
  malformedItemCount = false,
  missingQuantityVariantId = null,
  includeHiddenMobileDuplicates = false
} = {}) {
  const listeners = {};
  const jqueryHandlers = [];
  const observerCallbacks = [];
  const timers = [];
  const elements = new Map();
  const head = genericElement("head");
  const body = genericElement("body");
  const noteParent = genericElement("div");
  const note = genericElement("textarea");
  const checkout = genericElement("button", "checkout-button");
  checkout.clickCount = 0;
  let currentCheckout = checkout;

  function MockTextAreaElement() {}
  Object.defineProperty(MockTextAreaElement.prototype, "value", {
    configurable: true,
    get() {
      return this.nativeValue || "";
    },
    set(value) {
      this.nativeValue = String(value);
    }
  });
  Object.setPrototypeOf(note, MockTextAreaElement.prototype);
  note.value = "客人原有備註";
  note.dispatchEvent = () => {};
  noteParent.append(note);

  const initialItems = [
    cartItem(TARGETS.polarized.variantId, 1),
    cartItem(TARGETS.gray.variantId, 1),
    cartItem(TARGETS["blue-tea"].variantId, 2)
  ];
  let authoritativeItems = structuredClone(initialItems);
  let domItems = structuredClone(initialItems);

  function cartRows() {
    const visibleRows = domItems.map(item => {
      const input = genericElement("input");
      input.value = String(item.quantity);
      input.matches = selector => selector === '[data-testid="quantity-input"]';
      const row = genericElement("tr");
      row.matches = selector => String(selector).includes("tr.line-item");
      row.querySelector = selector => (
        selector === '[data-testid="quantity-input"]'
          && String(item.variant_id_int) !== String(missingQuantityVariantId)
          ? input
          : null
      );
      return row;
    });
    if (!includeHiddenMobileDuplicates) return visibleRows;
    const hiddenRows = visibleRows.map(() => {
      const row = genericElement("tr");
      row.hidden = true;
      row.matches = selector => String(selector).includes("tr.line-item");
      row.querySelector = () => null;
      return row;
    });
    return [...hiddenRows, ...visibleRows];
  }

  const originalHeadAppend = head.appendChild.bind(head);
  head.appendChild = child => {
    if (child.id) elements.set(child.id, child);
    return originalHeadAppend(child);
  };
  const originalNoteInsert = noteParent.insertBefore.bind(noteParent);
  noteParent.insertBefore = child => {
    if (child.id) elements.set(child.id, child);
    return originalNoteInsert(child);
  };
  elements.set(checkout.id, checkout);

  const document = {
    readyState: "complete",
    documentElement: genericElement("html"),
    head,
    body,
    scripts: [],
    currentScript: {
      src: `https://example.invalid/cyberbiz-cart-production-loader-20260901-polarized-v2.js${productionRuntime ? "" : "?eyefans_size_lens_development=1"}`
    },
    createElement: tagName => genericElement(tagName),
    getElementById: id => elements.get(id) || null,
    querySelector(selector) {
      if (selector === 'textarea[name="order[note]"]') return note;
      if (selector === "#checkout-button, .floating-checkout-button button") return currentCheckout;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "tr.line-item, div.line-item") return cartRows();
      if (selector === "#checkout-button, .floating-checkout-button button") return [currentCheckout];
      return [];
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    }
  };

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

  let nextTimerId = 1;
  const window = {
    location: new URL(`https://www.eyefans.com.tw/carts/${CART_TOKEN}`),
    // Deliberately never updated: this reproduces Checkout v3's boot-time
    // window.lineItems remaining stale after a React/AJAX row deletion.
    lineItems: structuredClone(initialItems).map(item => ({
      variant_id: String(item.variant_id_int),
      quantity: item.quantity
    })),
    localStorage: memoryStorage({
      [productionRuntime ? PRODUCTION_STORAGE_KEY : STORAGE_KEY]: JSON.stringify(records)
    }),
    HTMLTextAreaElement: MockTextAreaElement,
    jQuery,
    setTimeout(callback, delay) {
      const timer = { id: nextTimerId++, callback, delay: Number(delay), active: true };
      timers.push(timer);
      return timer.id;
    },
    clearTimeout(timerId) {
      const timer = timers.find(candidate => candidate.id === timerId);
      if (timer) timer.active = false;
    },
    async fetch(url, options) {
      assert.equal(options.method, "GET");
      assert.equal(new URL(url).pathname, "/cart.json");
      const items = structuredClone(authoritativeItems);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const itemCount = malformedItemCount
        ? 999
        : itemCountMode === "units" ? totalQuantity : items.length;
      const payload = { items, item_count: itemCount };
      if (!omitTotalQuantity) payload.total_quantity = totalQuantity;
      return {
        ok: true,
        redirected: false,
        headers: { get: name => String(name).toLowerCase() === "content-type" ? "application/json" : null },
        async text() {
          return JSON.stringify(payload);
        }
      };
    }
  };
  window.self = window;
  window.top = window;

  class MockMutationObserver {
    constructor(callback) {
      observerCallbacks.push(callback);
    }
    observe() {}
    disconnect() {}
  }

  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortController,
    window,
    document,
    MutationObserver: MockMutationObserver,
    Event: class Event {
      constructor(type) {
        this.type = type;
      }
    },
    console
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
      preventDefault() {},
      stopImmediatePropagation() {}
    });
  };

  return {
    checkout,
    context,
    document,
    listeners,
    note,
    observerCallbacks,
    timers,
    window,
    deleteBlueRows() {
      authoritativeItems = authoritativeItems.filter(item => (
        String(item.variant_id_int) !== TARGETS["blue-tea"].variantId
      ));
      domItems = domItems.filter(item => (
        String(item.variant_id_int) !== TARGETS["blue-tea"].variantId
      ));
    },
    setBlueQuantity(quantity) {
      authoritativeItems = authoritativeItems.map(item => (
        String(item.variant_id_int) === TARGETS["blue-tea"].variantId
          ? { ...item, quantity }
          : item
      ));
      domItems = domItems.map(item => (
        String(item.variant_id_int) === TARGETS["blue-tea"].variantId
          ? { ...item, quantity }
          : item
      ));
    },
    runTimer(delay) {
      const timer = timers.find(candidate => candidate.active && candidate.delay === delay);
      assert.ok(timer, `expected an active ${delay} ms timer; pending: ${timers.filter(item => item.active).map(item => item.delay)}`);
      timer.active = false;
      timer.callback();
    },
    pendingDelays() {
      return timers.filter(timer => timer.active).map(timer => timer.delay);
    },
    replaceCheckout({ throwOnClick = false } = {}) {
      const replacement = genericElement("button", "checkout-button");
      replacement.clickCount = 0;
      replacement.click = () => {
        replacement.clickCount += 1;
        if (throwOnClick) throw new Error("replacement click failed");
        listeners.click?.({
          target: {
            closest(selector) {
              return selector === "#checkout-button, .floating-checkout-button button"
                ? replacement
                : null;
            }
          },
          preventDefault() {},
          stopImmediatePropagation() {}
        });
      };
      currentCheckout = replacement;
      return replacement;
    },
    triggerDeleteClick({ disabled = false } = {}) {
      listeners.click({
        target: {
          closest(selector) {
            if (selector === "#checkout-button, .floating-checkout-button button") return null;
            return selector === ".delete-button, .quantity-group button"
              ? { disabled, getAttribute: () => disabled ? "true" : null }
              : null;
          }
        },
        preventDefault() {},
        stopImmediatePropagation() {}
      });
    },
    triggerCheckoutClick() {
      let prevented = false;
      const clickedButton = currentCheckout;
      listeners.click({
        target: {
          closest(selector) {
            return selector === "#checkout-button, .floating-checkout-button button" ? clickedButton : null;
          }
        },
        preventDefault() {
          prevented = true;
        },
        stopImmediatePropagation() {}
      });
      return prevented;
    },
    triggerJQuery(eventName, payload = {}) {
      const event = {
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
        .forEach(item => item.handler(event, payload));
      return event;
    }
  };
}

async function flushMicrotasks(turns = 20) {
  for (let index = 0; index < turns; index += 1) await Promise.resolve();
}

(async () => {
  const records = [
    activeRecord({
      requestId: "request-polar-0001", designId: "EF-TEST-POLAR1",
      lensId: "polarized", frame: "櫻花粉", before: 0, after: 1
    }),
    activeRecord({
      requestId: "request-gray-0001", designId: "EF-TEST-GRAY01",
      lensId: "gray", frame: "天藍", before: 0, after: 1
    }),
    activeRecord({
      requestId: "request-blue-0001", designId: "EF-TEST-BLUE01",
      lensId: "blue-tea", frame: "奶茶", before: 0, after: 1
    }),
    activeRecord({
      requestId: "request-blue-0002", designId: "EF-TEST-BLUE02",
      lensId: "blue-tea", frame: "青釉綠", before: 1, after: 2
    })
  ];
  const environment = createEnvironment(records);

  // Initial boot requires two stable samples and authoritative /cart.json.
  await flushMicrotasks();
  environment.runTimer(150);
  await flushMicrotasks();
  assert.equal(environment.checkout.attributes.has("aria-disabled"), false);
  assert.match(environment.note.value, /EF-TEST-BLUE01/);
  assert.match(environment.note.value, /EF-TEST-BLUE02/);

  environment.triggerDeleteClick();
  await flushMicrotasks();
  assert.equal(environment.checkout.attributes.get("aria-disabled"), "true",
    "checkout must fail closed from the delete click until the exact new cart is verified");
  assert.equal(environment.triggerCheckoutClick(), true,
    "a checkout click during the delayed AJAX mutation must be intercepted");
  await flushMicrotasks();
  assert.equal(environment.checkout.clickCount, 0,
    "pending cart identity must never be retried into checkout");
  const blockedPayload = vm.runInContext("({})", environment.context);
  const blockedEvent = environment.triggerJQuery("checkout_cart:checkout", blockedPayload);
  assert.equal(blockedEvent.defaultPrevented, true);
  assert.equal(blockedPayload["order[note]"], undefined);

  // The first retry sees the old cart at 150 ms. The second sees the same old
  // cart after another 350 ms; neither may restore checkout or prune records.
  environment.runTimer(150);
  await flushMicrotasks();
  environment.runTimer(350);
  await flushMicrotasks();
  assert.equal(environment.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(JSON.parse(environment.window.localStorage.getItem(STORAGE_KEY)).length, 4);
  assert.match(environment.note.value, /EF-TEST-BLUE02/);
  assert.ok(environment.pendingDelays().includes(750),
    "a bounded retry later than the old 350 ms debounce must remain scheduled");

  // React and /cart.json finally update after the old 350 ms boundary. Keep
  // window.lineItems stale on purpose, then notify the cart-only observer.
  environment.deleteBlueRows();
  const removedRow = genericElement("tr");
  removedRow.matches = selector => String(selector).includes("tr.line-item");
  environment.observerCallbacks.at(-1)([{
    type: "childList",
    target: genericElement("tbody"),
    addedNodes: [],
    removedNodes: [removedRow]
  }]);
  await flushMicrotasks();
  environment.runTimer(150);
  await flushMicrotasks();

  assert.equal(environment.window.lineItems.length, 3,
    "fixture must preserve the stale boot-time lineItems mismatch");
  assert.equal(environment.checkout.attributes.has("aria-disabled"), false,
    "stable DOM plus exact /cart.json identity should recover without a reload");
  assert.doesNotMatch(environment.note.value, /EF-TEST-BLUE01|EF-TEST-BLUE02/);
  assert.match(environment.note.value, /EF-TEST-POLAR1/);
  assert.match(environment.note.value, /EF-TEST-GRAY01/);
  const retained = JSON.parse(environment.window.localStorage.getItem(STORAGE_KEY));
  assert.deepEqual(retained.map(record => record.designId), ["EF-TEST-POLAR1", "EF-TEST-GRAY01"],
    "deleting the entire variant row must prune exactly that variant's two records");

  const verifiedPayload = vm.runInContext("({})", environment.context);
  const verifiedEvent = environment.triggerJQuery("checkout_cart:checkout", verifiedPayload);
  assert.equal(verifiedEvent.defaultPrevented, false);
  assert.equal(verifiedPayload["order[note]"], environment.note.value);
  assert.doesNotMatch(verifiedPayload["order[note]"], /EF-TEST-BLUE01|EF-TEST-BLUE02/);

  // Reconciliation's own panel/note DOM writes must not restart the observer.
  const pendingBeforeSelfMutation = environment.pendingDelays().length;
  environment.observerCallbacks.at(-1)([{
    type: "childList",
    target: genericElement("div"),
    addedNodes: [environment.document.getElementById("eyefans-cart-design-summary")],
    removedNodes: []
  }]);
  await flushMicrotasks();
  assert.equal(environment.pendingDelays().length, pendingBeforeSelfMutation,
    "non-cart panel writes must not create an observer sync loop");

  const pendingBeforeDisabledClick = environment.pendingDelays().length;
  environment.triggerDeleteClick({ disabled: true });
  await flushMicrotasks();
  assert.equal(environment.pendingDelays().length, pendingBeforeDisabledClick,
    "a disabled quantity/delete action must not create a never-resolving mutation intent");
  assert.equal(environment.checkout.attributes.has("aria-disabled"), false);

  // Checkout v3 can emit a lifecycle notification after the observer-driven
  // sync already succeeded. It is a post-update notification, not a second
  // action intent, so re-verifying the same exact cart must remain possible.
  environment.triggerJQuery("checkout_cart:added");
  await flushMicrotasks();
  assert.equal(environment.checkout.attributes.get("aria-disabled"), "true");
  environment.runTimer(150);
  await flushMicrotasks();
  assert.equal(environment.checkout.attributes.has("aria-disabled"), false,
    "a late duplicate lifecycle signal must not permanently require another cart change");
  assert.equal(JSON.parse(environment.window.localStorage.getItem(STORAGE_KEY)).length, 2);

  // A quantity decrease from two designs to one line unit is inherently
  // ambiguous: CYBERBIZ gives no per-design identity. The loader must verify
  // the new quantity but keep checkout blocked instead of guessing which EF
  // record survived.
  const ambiguousQuantity = createEnvironment(records);
  await flushMicrotasks();
  ambiguousQuantity.runTimer(150);
  await flushMicrotasks();
  ambiguousQuantity.setBlueQuantity(1);
  const changedInput = genericElement("input");
  changedInput.matches = selector => String(selector).includes('[data-testid="quantity-input"]');
  ambiguousQuantity.observerCallbacks.at(-1)([{
    type: "attributes",
    target: changedInput,
    addedNodes: [],
    removedNodes: []
  }]);
  await flushMicrotasks();
  ambiguousQuantity.runTimer(150);
  await flushMicrotasks();
  assert.equal(ambiguousQuantity.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(JSON.parse(ambiguousQuantity.window.localStorage.getItem(STORAGE_KEY)).length, 4,
    "ambiguous same-variant quantity changes must not choose a record to delete");
  assert.equal(ambiguousQuantity.note.value, "客人原有備註");
  const ambiguousPanel = ambiguousQuantity.document.getElementById("eyefans-cart-design-summary");
  assert.match(ambiguousPanel.children[1].textContent, /購物車 1 件／客製設計 2 筆/);
  const ambiguousPayload = vm.runInContext("({})", ambiguousQuantity.context);
  assert.equal(
    ambiguousQuantity.triggerJQuery("checkout_cart:checkout", ambiguousPayload).defaultPrevented,
    true
  );

  // The normal candidate URL must execute the same core against the production
  // storage key; the development query above is only a test-data isolation mode.
  const productionCandidate = createEnvironment(records, { productionRuntime: true });
  await flushMicrotasks();
  productionCandidate.runTimer(150);
  await flushMicrotasks();
  assert.equal(productionCandidate.window.__eyefansCartProductionLoaderActive, true);
  assert.equal(productionCandidate.window.__eyefansCartSizeLensDevelopmentLoaderActive, undefined);
  assert.equal(productionCandidate.checkout.attributes.has("aria-disabled"), false);
  assert.match(productionCandidate.note.value, /EF-TEST-BLUE02/);
  assert.equal(
    JSON.parse(productionCandidate.window.localStorage.getItem(PRODUCTION_STORAGE_KEY)).length,
    4
  );

  // React may replace the checkout node while the asynchronous verification
  // is running. Retry only the fresh connected button, never the stale node.
  const replacedCheckout = createEnvironment(records);
  await flushMicrotasks();
  replacedCheckout.runTimer(150);
  await flushMicrotasks();
  assert.equal(replacedCheckout.triggerCheckoutClick(), true);
  await flushMicrotasks();
  const freshButton = replacedCheckout.replaceCheckout();
  replacedCheckout.runTimer(150);
  await flushMicrotasks();
  assert.equal(replacedCheckout.checkout.clickCount, 0);
  assert.equal(freshButton.clickCount, 1);

  // A throwing theme handler must clear both one-shot bypasses in finally;
  // the next real click must still be intercepted and freshly verified.
  const throwingCheckout = createEnvironment(records);
  await flushMicrotasks();
  throwingCheckout.runTimer(150);
  await flushMicrotasks();
  assert.equal(throwingCheckout.triggerCheckoutClick(), true);
  await flushMicrotasks();
  const throwingButton = throwingCheckout.replaceCheckout({ throwOnClick: true });
  throwingCheckout.runTimer(150);
  await flushMicrotasks();
  assert.equal(throwingButton.clickCount, 1);
  assert.equal(throwingButton.attributes.get("aria-disabled"), "true");
  const recoveredButton = throwingCheckout.replaceCheckout();
  assert.equal(throwingCheckout.triggerCheckoutClick(), true,
    "a previous throw must not leave allowNextCheckout behind");
  await flushMicrotasks();
  throwingCheckout.runTimer(150);
  await flushMicrotasks();
  assert.equal(recoveredButton.clickCount, 1);

  // CYBERBIZ has exposed item_count as either line count or unit count, and
  // total_quantity is optional. Hidden responsive duplicates and gift-like
  // non-adjustable rows without a quantity input must not create false blocks.
  const compatibleCartShape = createEnvironment(records, {
    itemCountMode: "units",
    omitTotalQuantity: true,
    missingQuantityVariantId: TARGETS.polarized.variantId,
    includeHiddenMobileDuplicates: true
  });
  await flushMicrotasks();
  compatibleCartShape.runTimer(150);
  await flushMicrotasks();
  assert.equal(compatibleCartShape.checkout.attributes.has("aria-disabled"), false);
  assert.match(compatibleCartShape.note.value, /EF-TEST-POLAR1/);
  assert.match(compatibleCartShape.note.value, /EF-TEST-BLUE02/);

  const malformedCartShape = createEnvironment(records, { malformedItemCount: true });
  await flushMicrotasks();
  for (const delay of [150, 350, 750, 1500]) {
    malformedCartShape.runTimer(delay);
    await flushMicrotasks();
  }
  assert.equal(malformedCartShape.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(malformedCartShape.note.value, "客人原有備註");
  assert.equal(JSON.parse(malformedCartShape.window.localStorage.getItem(STORAGE_KEY)).length, 4,
    "malformed cart JSON must neither prune records nor open checkout");

  // If an action intent arrives before the initial authoritative baseline is
  // verified, there is no safe old/new comparison. Even an unchanged stable
  // cart must remain fail-closed instead of silently clearing the pending flag.
  const noBaseline = createEnvironment(records);
  await flushMicrotasks();
  noBaseline.triggerDeleteClick();
  await flushMicrotasks();
  for (const delay of [150, 350, 750, 1500]) {
    noBaseline.runTimer(delay);
    await flushMicrotasks();
  }
  assert.equal(noBaseline.checkout.attributes.get("aria-disabled"), "true");
  assert.equal(JSON.parse(noBaseline.window.localStorage.getItem(STORAGE_KEY)).length, 4);
  assert.equal(noBaseline.note.value, "客人原有備註");
  const noBaselinePayload = vm.runInContext("({})", noBaseline.context);
  assert.equal(
    noBaseline.triggerJQuery("checkout_cart:checkout", noBaselinePayload).defaultPrevented,
    true
  );

  console.log("cyberbiz cart note-sync v2 delayed deletion tests passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
