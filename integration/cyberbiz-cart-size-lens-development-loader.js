/*
 * eYeFANS SIZE × LENS DEVELOPMENT ENTRY.
 *
 * UNPUBLISHED DEVELOPMENT ONLY / DO NOT INSTALL ON A PUBLISHED THEME.
 *
 * The implementation is the exact v2 candidate core, loaded with an explicit
 * development query so it uses the isolated development flag and storage key.
 */
(function eyefansCyberbizCartSizeLensDevelopmentEntry() {
  "use strict";

  const WRAPPER_FLAG = "__eyefansCartSizeLensDevelopmentEntryActive";
  if (window[WRAPPER_FLAG]) return;
  window[WRAPPER_FLAG] = true;

  let entryUrl;
  try {
    entryUrl = new URL(document.currentScript?.src || "", window.location.href);
  } catch (error) {
    return;
  }
  const coreUrl = new URL(
    "cyberbiz-cart-production-loader-20260901-polarized-v2.js",
    entryUrl
  );
  coreUrl.searchParams.set("eyefans_size_lens_development", "1");

  const script = document.createElement("script");
  script.src = coreUrl.href;
  script.integrity = "sha384-W/OS+aihXUMeAXmMoTfl1y0b6dXSdStyc+LTyNjZsAHt6RXhJsbAaiT1cCb6Q7ks";
  script.crossOrigin = "anonymous";
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
})();
