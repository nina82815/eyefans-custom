"use strict";

process.env.EYEFANS_NOTE_SYNC_LOADER =
  "cyberbiz-cart-production-loader-20260904-all-combined-v4.js";
process.env.EYEFANS_NOTE_SYNC_DEVELOPMENT_QUERY =
  "eyefans_all_combined_development=1";
process.env.EYEFANS_NOTE_SYNC_STORAGE_KEY =
  "eyefansCustomCartDesignsAllCombinedDevV1";
process.env.EYEFANS_NOTE_SYNC_MIGRATION_PROFILE = "uv-reused-id";
process.env.EYEFANS_NOTE_SYNC_RETIRED_VARIANT_ID = "87452748";
process.env.EYEFANS_NOTE_SYNC_TARGETS_JSON = JSON.stringify({
  polarized: {
    handle: "cls-cus-mix-sun-rd",
    productId: "71536660",
    variantId: "87870158",
    lens: "偏光鏡片"
  },
  gray: {
    handle: "cls-cus-mix-sun-rd",
    productId: "71536660",
    variantId: "87452740",
    lens: "三號灰片"
  },
  "blue-tea": {
    handle: "cls-cus-mix-sun-rd",
    productId: "71536660",
    variantId: "87870153",
    lens: "抗藍光鏡片"
  }
});

require("./cyberbiz-cart-note-sync-v2.test.js");
