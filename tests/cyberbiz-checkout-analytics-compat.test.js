"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "../integration/cyberbiz-checkout-analytics-compat-20260911.js"), "utf8");

test("inline source cannot trigger CYBERBIZ head-tag rewriting", () => {
  assert.doesNotMatch(source, /<\/?(?:head|script|body)\b/i);
});

function boot(pathname = "/carts/test-cart", extra = {}, hostname = "www.eyefans.com.tw") {
  const window = { location: { hostname, pathname }, ...extra };
  window.window = window;
  const context = vm.createContext(window);
  vm.runInContext(source, context);
  return { window, context };
}

test("ordinary cart without custom data safely queues scroll-step analytics", () => {
  const { window, context } = boot();
  vm.runInContext('gtag("event", "checkout_progress", { checkout_step: 2 })', context);
  assert.equal(window.dataLayer.length, 1);
  assert.deepEqual(Array.from(window.dataLayer[0]).slice(0, 2), ["event", "checkout_progress"]);
  assert.equal(window.dataLayer[0][2].checkout_step, 2);
  assert.equal(window.__eyefansCartProductionLoaderActive, undefined);
  assert.equal(window.__eyefansCartAllCombinedDevelopmentLoaderActive, undefined);
});

test("mobile CVS return initializes analytics before CYBERBIZ rewrites its URL", () => {
  const token = "0123456789abcdef0123456789abcdef";
  const { window, context } = boot(`/carts/${token}/redirect_cvs`);
  assert.equal(typeof window.gtag, "function", "head bootstrap must run on the initial return URL");
  const queue = window.dataLayer;
  // Checkout setup later replaces the callback path with the normal cart URL.
  window.location.pathname = `/carts/${token}`;
  vm.runInContext('gtag("event", "checkout_progress", { checkout_step: 3 })', context);
  assert.equal(window.dataLayer, queue);
  assert.equal(queue.length, 1);
  assert.equal(queue[0][2].checkout_step, 3);
  assert.equal(window.__eyefansCartProductionLoaderActive, undefined);
});

test("the same scroll call throws when the compatibility bootstrap is absent", () => {
  const context = vm.createContext({});
  assert.throws(() => vm.runInContext('gtag("event", "checkout_progress")', context), /gtag is not defined/);
});

test("existing analytics implementation and its queue are left unchanged", () => {
  const gtag = () => {};
  const dataLayer = [{ event: "existing" }];
  const { window } = boot(undefined, { gtag, dataLayer });
  assert.equal(window.gtag, gtag);
  assert.equal(window.dataLayer, dataLayer);
  assert.equal(dataLayer.length, 1);
});

test("pending events survive and multiple installations remain idempotent", () => {
  const dataLayer = [{ event: "existing" }];
  const { window, context } = boot(undefined, { dataLayer });
  const initial = window.gtag;
  vm.runInContext(source, context);
  assert.equal(window.gtag, initial);
  assert.equal(window.dataLayer, dataLayer);
  window.gtag("event", "checkout_progress");
  assert.equal(dataLayer.length, 2);
  assert.equal(dataLayer[0].event, "existing");
});

test("a later loaded implementation can replace the queue normally", () => {
  const { window } = boot();
  const loaded = () => "loaded";
  window.gtag = loaded;
  assert.equal(window.gtag(), "loaded");
});

test("only exact storefront checkout paths are enabled", () => {
  for (const hostname of ["www.eyefans.com.tw", "eyefans.cyberbiz.co"]) {
    for (const pathname of ["/cart", "/cart/", "/carts/abc-123_456", "/carts/abc/", "/carts/abc/redirect_cvs", "/carts/abc/redirect_cvs/"]) {
      assert.equal(typeof boot(pathname, {}, hostname).window.gtag, "function");
    }
  }
  for (const pathname of ["/", "/products/cpc-nai", "/pages/custom", "/admin", "/admin/carts/abc", "/carts/abc/orders", "/carts/", "/cart/redirect_cvs", "/carts/abc/redirect_cvs/extra", "/carts/abc/redirect_cvs_extra"]) {
    assert.equal(boot(pathname).window.gtag, undefined, pathname);
  }
  assert.equal(boot("/carts/abc", {}, "other.example").window.gtag, undefined);
});

test("custom-only storage, cart data and DOM are never accessed", () => {
  const window = { location: { hostname: "www.eyefans.com.tw", pathname: "/carts/custom-test" } };
  window.window = window;
  for (const key of ["localStorage", "sessionStorage", "document", "application", "lineItems", "fetch", "jQuery"]) {
    Object.defineProperty(window, key, { get() { throw new Error(`unexpected ${key}`); } });
  }
  const context = vm.createContext(window);
  vm.runInContext(source, context);
  assert.equal(typeof window.gtag, "function");
});
