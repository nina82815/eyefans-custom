/*
 * eYeFANS customizer iframe auto-height — 2026-09-02.
 *
 * This helper is intentionally separate from the cart loader. It only runs on
 * the three new customizer entry products, accepts height messages from the
 * exact trusted customizer iframe, and removes the nested iframe scrollbar.
 * If the trusted handshake never completes, the theme's original fixed-height
 * iframe remains scrollable as a safe fallback instead of clipping content.
 */
(function eyefansCustomizerFrameAutoHeight() {
  "use strict";

  const CUSTOMIZER_ORIGIN = "https://nina82815.github.io";
  const CUSTOMIZER_PATHS = new Set(["/eyefans-custom/", "/eyefans-custom/index.html"]);
  const FRAME_SELECTOR = ".eyefans-custom-wrap iframe";
  const RESIZE_MESSAGE_TYPE = "eyefans-customizer-resize";
  const RESIZE_REQUEST_TYPE = "eyefans-customizer-resize-request";
  const SCHEMA_VERSION = 1;
  const MIN_HEIGHT = 520;
  const MAX_HEIGHT = 10000;
  const FIND_TIMEOUT_MS = 20000;
  const MODE_BY_HANDLE = Object.freeze({
    "cls-cus-mix-sun-rd": "color",
    "cls-cus-mix-laser-sun-rd": "engraving",
    "cls-cus-mix-uv-sun-rd": "uv"
  });

  const pathMatch = window.location.pathname.match(/^\/products\/([^/?#]+)/);
  const handle = pathMatch?.[1]?.toLowerCase() || "";
  const mode = MODE_BY_HANDLE[handle];
  if (!mode) return;

  const pageUrl = new URL(window.location.href);
  let activeFrame = null;

  function trustedFrame(sourceWindow = null) {
    const frames = Array.from(document.querySelectorAll(FRAME_SELECTOR));
    return frames.find(frame => {
      if (sourceWindow && frame.contentWindow !== sourceWindow) return false;
      try {
        const frameUrl = new URL(frame.src, pageUrl.href);
        const lock = frameUrl.searchParams.get("locked") || frameUrl.searchParams.get("lock");
        return frameUrl.origin === CUSTOMIZER_ORIGIN
          && CUSTOMIZER_PATHS.has(frameUrl.pathname)
          && frameUrl.searchParams.get("mode") === mode
          && (lock === "1" || lock?.toLowerCase() === "true");
      } catch (error) {
        return false;
      }
    }) || null;
  }

  function requestCurrentHeight(frame) {
    try {
      frame?.contentWindow?.postMessage({
        type: RESIZE_REQUEST_TYPE,
        schemaVersion: SCHEMA_VERSION
      }, CUSTOMIZER_ORIGIN);
    } catch (error) {
      // The child also announces its height on load and resize.
    }
  }

  function bindFrame() {
    const frame = trustedFrame();
    if (!frame) return false;

    if (activeFrame !== frame) {
      activeFrame = frame;
      frame.addEventListener("load", () => requestCurrentHeight(frame));
    }
    requestCurrentHeight(frame);
    return true;
  }

  function handleResize(event) {
    const message = event.data;
    if (
      event.origin !== CUSTOMIZER_ORIGIN
      || message?.type !== RESIZE_MESSAGE_TYPE
      || message?.schemaVersion !== SCHEMA_VERSION
      || typeof message.height !== "number"
      || !Number.isFinite(message.height)
    ) return;

    const frame = trustedFrame(event.source);
    if (!frame) return;

    const height = Math.ceil(message.height) + 2;
    if (height < MIN_HEIGHT || height > MAX_HEIGHT) return;

    activeFrame = frame;
    frame.style.setProperty("height", `${height}px`, "important");
    frame.style.setProperty("max-height", "none", "important");
    frame.dataset.eyefansAutoHeight = "true";
  }

  window.addEventListener("message", handleResize);

  function start() {
    if (bindFrame()) return;
    if (typeof MutationObserver !== "function" || !document.documentElement) return;

    const observer = new MutationObserver(() => {
      if (!bindFrame()) return;
      observer.disconnect();
      window.clearTimeout(stopTimer);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const stopTimer = window.setTimeout(() => observer.disconnect(), FIND_TIMEOUT_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
