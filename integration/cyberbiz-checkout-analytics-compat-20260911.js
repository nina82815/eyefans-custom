/* eYeFANS checkout analytics compatibility — 2026-09-11.
 * Install inline at the start of the document head, before checkout code.
 * Covers ordinary/custom carts and mobile CVS returns without custom guards.
 * No requests, analytics configuration, consent changes or checkout mutations.
 */
(function eyefansCheckoutAnalyticsCompatibility() {
  "use strict";
  if (
    !["www.eyefans.com.tw", "eyefans.cyberbiz.co"].includes(window.location.hostname)
    || !/^\/(?:cart|carts\/[A-Za-z0-9_-]+(?:\/redirect_cvs)?)\/?$/.test(window.location.pathname)
    || typeof window.gtag === "function"
  ) return;

  // CVS return paths are normalized later by CYBERBIZ; initialize before that.
  // Standard Google tag queue: preserve queued events and any loaded gtag.
  // CYBERBIZ's scroll-step analytics must not throw if gtag.js loads late
  // or is unavailable. This does not load it or bypass a tracking blocker.
  window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
})();
