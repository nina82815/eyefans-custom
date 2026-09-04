"use strict";

process.env.EYEFANS_NOTE_SYNC_LOADER =
  "cyberbiz-cart-production-loader-20260904-uv-combined-v3.js";
process.env.EYEFANS_NOTE_SYNC_DEVELOPMENT_QUERY =
  "eyefans_uv_combined_development=1";
process.env.EYEFANS_NOTE_SYNC_STORAGE_KEY =
  "eyefansCustomCartDesignsUvCombinedDevV1";

require("./cyberbiz-cart-note-sync-v2.test.js");
