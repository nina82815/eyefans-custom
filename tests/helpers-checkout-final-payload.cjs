"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loaderFilename = process.env.EYEFANS_NOTE_SYNC_LOADER
  || "cyberbiz-cart-production-loader-20260901-polarized-v2.js";
const developmentQuery = process.env.EYEFANS_NOTE_SYNC_DEVELOPMENT_QUERY
  || "eyefans_size_lens_development=1";
const loaderPath = path.join(
  __dirname,
  "..",
  "integration",
  loaderFilename
);
const source = fs.readFileSync(loaderPath, "utf8");
const STORAGE_KEY = process.env.EYEFANS_NOTE_SYNC_STORAGE_KEY
  || "eyefansCustomCartDesignsSizeLensDevV1";
const PRODUCTION_STORAGE_KEY = "eyefansCustomCartDesignsProdV1";
const CART_TOKEN = "delayed-delete-cart";
const migrationProfile = process.env.EYEFANS_NOTE_SYNC_MIGRATION_PROFILE
  || (loaderFilename.includes("uv-combined-v3") ? "uv-reused-id" : "");
const retiredMigrationVariantId = process.env.EYEFANS_NOTE_SYNC_RETIRED_VARIANT_ID
  || "87452776";
const cartVariantIdFormat = process.env.EYEFANS_NOTE_SYNC_VARIANT_ID_FORMAT || "integer";

const DEFAULT_TARGETS = {
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
};
const TARGETS = Object.freeze(
  process.env.EYEFANS_NOTE_SYNC_TARGETS_JSON
    ? JSON.parse(process.env.EYEFANS_NOTE_SYNC_TARGETS_JSON)
    : DEFAULT_TARGETS
);

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
    style: {},
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
  const item = {
    cart_item_id: `${variantId}_normal_`,
    quantity
  };
  if (cartVariantIdFormat === "numeric-string") item.variant_id = String(variantId);
  else if (cartVariantIdFormat === "cart-key") item.variant_id = `${variantId}_normal_`;
  else {
    item.variant_id_int = Number(variantId);
    item.variant_id = `${variantId}_normal_`;
  }
  return item;
}

function cartItemVariantId(item) {
  const rawVariantId = item.variant_id_int ?? item.variant_id;
  const match = String(rawVariantId ?? "").match(/^(\d+)(?:_normal_)?$/);
  return match ? match[1] : "";
}

function createEnvironment(records, {
  returnSuffix = "",
  productionRuntime = false,
  itemCountMode = "lines",
  omitTotalQuantity = false,
  malformedItemCount = false,
  missingQuantityVariantId = null,
  includeHiddenMobileDuplicates = false,
  previewGift = false,
  earnedGiftDomOnly = false,
  unknownExtraRow = false,
  extraItems = [],
  initialItemsOverride = null,
  liveEarnedGift = false
} = {}) {
  const listeners = {};
  const jqueryHandlers = [];
  const prefilters = [];
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

  const initialItems = initialItemsOverride || [
      cartItem(TARGETS.polarized.variantId, 1),
      cartItem(TARGETS.gray.variantId, 1),
      cartItem(TARGETS["blue-tea"].variantId, 2),
      ...extraItems
    ];
  let authoritativeItems = structuredClone(initialItems);
  let domItems = structuredClone(initialItems);

  function cartRows() {
    const visibleRows = domItems.map(item => {
      const input = genericElement("input");
      input.value = String(item.quantity);
      input.matches = selector => selector === '[data-testid="quantity-input"]';
      const row = genericElement("tr");
      row.matches = selector => !String(selector).includes(".extra") && String(selector).includes("tr.line-item");
      row.querySelector = selector => (
        selector === '[data-testid="quantity-input"]'
          && cartItemVariantId(item) !== String(missingQuantityVariantId)
          ? input
          : null
      );
      return row;
    });
    if (earnedGiftDomOnly) {
      const row = genericElement("tr");
      row.matches = selector => selector === "tr.line-item.extra.gift, div.line-item.extra.gift";
      row.querySelector = () => null;
      visibleRows.push(row);
    }
    if (previewGift || unknownExtraRow) {
      const row = genericElement("tr");
      row.matches = selector => selector === "tr.line-item.extra.next-gift, div.line-item.extra.next-gift"
        ? previewGift : !String(selector).includes(".extra") && String(selector).includes("tr.line-item");
      row.querySelector = () => null;
      visibleRows.push(row);
    }
    if (!includeHiddenMobileDuplicates) return visibleRows;
    const hiddenRows = visibleRows.map(() => {
      const row = genericElement("tr");
      row.hidden = true;
      row.matches = selector => !String(selector).includes("next-gift") && String(selector).includes("tr.line-item");
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
      src: `https://example.invalid/${loaderFilename}${productionRuntime ? "" : `?${developmentQuery}`}`
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

  jQuery.ajaxPrefilter = callback => prefilters.push(callback);
  let nextTimerId = 1;
  const window = {
    location: new URL(`https://www.eyefans.com.tw/carts/${CART_TOKEN}${returnSuffix}`),
    // Deliberately never updated: this reproduces Checkout v3's boot-time
    // window.lineItems remaining stale after a React/AJAX row deletion.
    lineItems: structuredClone(initialItems).map(item => ({
      variant_id: cartItemVariantId(item),
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
      if (liveEarnedGift) payload.items.push({ variant_id: '88700465_gift_', variant_id_int: 88700465, quantity: 1, type: 'gift' });
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
        cartItemVariantId(item) !== TARGETS["blue-tea"].variantId
      ));
      domItems = domItems.filter(item => (
        cartItemVariantId(item) !== TARGETS["blue-tea"].variantId
      ));
    },
    hideDomRows() {
      domItems = [];
    },
    restoreDomRows() {
      domItems = structuredClone(authoritativeItems);
    },
    setBlueQuantity(quantity) {
      authoritativeItems = authoritativeItems.map(item => (
        cartItemVariantId(item) === TARGETS["blue-tea"].variantId
          ? { ...item, quantity }
          : item
      ));
      domItems = domItems.map(item => (
        cartItemVariantId(item) === TARGETS["blue-tea"].variantId
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
    attemptPost(data, url = "/carts/" + CART_TOKEN + "/", method = "POST") {
      const options = {data, url, type: method, contentType:"application/x-www-form-urlencoded"};
      let aborted = false;
      prefilters.forEach(filter => filter(options, {}, {abort() {aborted=true;}}));
      return {aborted, options, registered: prefilters.length};
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


module.exports = {createEnvironment, activeRecord, colorSelection, fingerprintFor, cartItem, flushMicrotasks};
