/*
 * eYeFANS UV combined-product live-test entry — 2026-09-04 v1.
 *
 * UNPUBLISHED TEST CANDIDATE.
 *
 * Replace the legacy query-only live-test loader with this entry. If a theme
 * also has a normal production cart loader, this entry must appear first so
 * its mutex can keep the production loader inert only on an explicit test run.
 *
 * Product pages load the v3 core only with
 * `?eyefans_uv_combined_live_test=1`. Checkout pages continue loading it only
 * while this browser has non-empty isolated test records.
 */
(function eyefansCyberbizCartUvCombinedLiveTestEntryV1() {
  "use strict";

  const STOREFRONT_ORIGIN = "https://www.eyefans.com.tw";
  const TEST_QUERY_KEY = "eyefans_uv_combined_live_test";
  const TEST_QUERY_VALUE = "1";
  const TEST_STORAGE_KEY = "eyefansCustomCartDesignsUvCombinedDevV1";
  const WRAPPER_FLAG = "__eyefansCartUvCombinedLiveTestEntryV1Active";
  const CONFLICTING_LOADER_FLAGS = Object.freeze([
    "__eyefansCartTestLoaderActive",
    "__eyefansCartLiveTestLoaderActive",
    "__eyefansCartSizeLensDevelopmentEntryActive",
    "__eyefansCartSizeLensDevelopmentLoaderActive",
    "__eyefansCartProductionLoaderActive"
  ]);
  const ALLOWED_PRODUCT_HANDLES = new Set([
    "cls-cus-mix-sun-rd",
    "cls-cus-mix-laser-sun-rd",
    "cls-cus-mix-uv-sun-rd"
  ]);

  let pageUrl;
  try {
    pageUrl = new URL(window.location.href);
  } catch (error) {
    return;
  }
  if (
    pageUrl.origin !== STOREFRONT_ORIGIN
    || window[WRAPPER_FLAG]
    || CONFLICTING_LOADER_FLAGS.some(flag => window[flag])
  ) return;

  const productMatch = pageUrl.pathname.match(/(?:^|\/)products\/([^/?#]+)\/?$/i);
  const productHandle = productMatch ? productMatch[1].toLowerCase() : "";
  const explicitProductTest = ALLOWED_PRODUCT_HANDLES.has(productHandle)
    && pageUrl.searchParams.get(TEST_QUERY_KEY) === TEST_QUERY_VALUE;
  const cartTokenMatch = pageUrl.pathname.match(/(?:^|\/)carts\/([A-Za-z0-9_-]+)\/?$/i);
  const checkoutContinuation = Boolean(cartTokenMatch && hasCheckoutTestState());

  if (!explicitProductTest && !checkoutContinuation) return;
  window[WRAPPER_FLAG] = true;
  // Reserve every historic loader mutex before appending the core. This makes
  // an accidental later script tag inert; if an older loader already ran, the
  // conflict check above keeps this candidate inert instead of double-POSTing.
  for (const flag of CONFLICTING_LOADER_FLAGS) window[flag] = true;

  let entryUrl;
  try {
    entryUrl = new URL(document.currentScript?.src || "", window.location.href);
  } catch (error) {
    return;
  }
  const coreUrl = new URL(
    "cyberbiz-cart-production-loader-20260904-uv-combined-v3.js",
    entryUrl
  );
  coreUrl.searchParams.set("eyefans_uv_combined_development", "1");

  const script = document.createElement("script");
  script.src = coreUrl.href;
  script.integrity = "sha384-6AKlbXT4bNgOyrQiWHPG5zpsHnS957HgKCj8Bp3cDsrQsqLUthkqP+o9jJ00iId1";
  script.crossOrigin = "anonymous";
  script.async = false;
  script.onerror = () => {
    if (checkoutContinuation) guardCheckoutAfterCoreLoadFailure();
  };
  (document.head || document.documentElement).appendChild(script);

  function guardCheckoutAfterCoreLoadFailure() {
    const buttonSelector = "#checkout-button, .floating-checkout-button button";
    const failureMessage = "客製資料安全檢查載入失敗，請重新整理後再結帳。";
    window.__eyefansCartUvCombinedCoreLoadFailed = true;

    function disableCheckoutButtons() {
      const buttons = document.querySelectorAll?.(buttonSelector) || [];
      for (const button of Array.from(buttons)) {
        button.disabled = true;
        button.setAttribute?.("aria-disabled", "true");
        button.setAttribute?.("data-eyefans-blocked", "1");
        button.setAttribute?.("title", failureMessage);
      }
    }

    function stopCheckout(event) {
      const target = event?.target;
      const checkoutButton = target?.closest?.(buttonSelector);
      const form = target?.matches?.("form") ? target : target?.closest?.("form");
      const formAction = form?.getAttribute?.("action") || "";
      const checkoutForm = Boolean(
        form?.querySelector?.(buttonSelector)
        || /(?:checkout|orders?)/i.test(formAction)
      );
      if (!checkoutButton && !checkoutForm) return;
      event?.preventDefault?.();
      event?.stopImmediatePropagation?.();
      disableCheckoutButtons();
    }

    disableCheckoutButtons();
    document.addEventListener?.("DOMContentLoaded", disableCheckoutButtons, { once: true });
    document.addEventListener?.("click", stopCheckout, true);
    document.addEventListener?.("submit", stopCheckout, true);

    if (typeof window.jQuery === "function") {
      window.jQuery(document).on(
        "checkout_cart:checkout.eyefansUvCombinedCoreLoadFailure",
        event => {
          event?.preventDefault?.();
          event?.stopImmediatePropagation?.();
          disableCheckoutButtons();
          return false;
        }
      );
    }
  }

  function hasCheckoutTestState() {
    let raw;
    try {
      raw = window.localStorage.getItem(TEST_STORAGE_KEY);
    } catch (error) {
      return false;
    }
    return typeof raw === "string" && raw.trim() !== "" && raw.trim() !== "[]";
  }
})();
