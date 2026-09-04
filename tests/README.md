# 購物車橋接測試頁

`cart-host.html` 模擬 CYBERBIZ 商品頁父視窗。它會載入：

```text
../index.html?mode=uv&locked=1&cart=1
```

測試頁只使用 `postMessage`，不會呼叫 `/cart/add` 或其他購物車 API。

根目錄網頁預設也會顯示購物車區塊，但獨立預覽時按鈕停用。只有 `cart=1`、
`locked=1` 且具有可信父頁 referrer 的 iframe 才能送出。請使用本測試頁驗收可按的
流程，不要把獨立預覽的停用按鈕誤認為串接故障。`cart=0` 會隱藏區塊。

## 啟動

請從專案根目錄啟動任一靜態 HTTP server，再開啟：

```text
http://127.0.0.1:4173/tests/cart-host.html
```

不要直接以 `file://` 開啟；測試器會嚴格比對 iframe 的 origin。

## 驗收步驟

1. 等待「模擬器已載入」，確認右側能看到 `eyefans-customizer-change` payload。
2. 在模擬器選擇尺寸、顏色與客製內容。
3. 按「確認設計並加入購物車」。
4. 保持「模擬加入成功」時，確認按鈕收到成功訊息與 mock 款式 ID。
5. 改為「模擬 CYBERBIZ 錯誤」，再次送出並確認錯誤狀態可恢復重試。
6. 確認瀏覽器 Network 面板沒有 `/cart/add` 請求。

## 訊息契約

iframe 送出：

```js
{
  type: "eyefans-customizer-submit",
  schemaVersion: 1,
  requestId: "...",
  selection: { /* 與 change payload 共用的選擇資料 */ }
}
```

父頁回傳：

```js
{
  type: "eyefans-customizer-cart-result",
  schemaVersion: 1,
  requestId: "...",
  ok: true,
  message: "...",
  cartUrl: "..." // 成功時可選
}
```

`integration/cyberbiz-cart-bridge.js` 是獨立的正式環境草稿，不會由本專案自動載入。

`integration/cyberbiz-cart-test-loader.js` 是完全不寫入購物車的第一階段測試；只有
`integration/cyberbiz-cart-live-test-loader.js` 會在限定網址參數下呼叫真實
`/cart/add`。商品頁測試先放在未發布主題；若 CYBERBIZ 結帳頁實際改用已發布主題，
同一支 loader 也必須載入該主題才能驗收 EF 備註同步。公開結帳端只有本機存在非空
測試資料時才會啟動。設定方式請見
`integration/CYBERBIZ_CART_LIVE_TEST_SETUP.md`。

已發布修正版使用獨立的 `integration/cyberbiz-cart-production-loader-20260830.js`；程式檔發布不代表主題已安裝或購物車已完成驗收。
舊 `integration/cyberbiz-cart-production-loader.js` 保持原內容與 SRI，避免影響既有主題。
新版不讀取 V3
測試資料，並會在一般商品網址啟用、關閉原商品購買入口，以及在缺少 EF 製作資料時
暫停客製結帳。正式切換順序與回滾方式請見
`integration/CYBERBIZ_CART_PRODUCTION_SETUP.md`。

空購物車轉回首頁的修正版為 `integration/cyberbiz-cart-production-loader-20260831.js`；發布不代表主題已安裝或完成實際驗收。
2026-09-01 的獨立後繼檔為 `integration/cyberbiz-cart-production-loader-20260901.js`，補上購物車行數／件數兼容、
加入後有限唯讀重讀，以及重開機空車後隔離舊 pending。發布程式檔不代表主題已替換；runtime 測試目前指向此版；
setup 合約仍核對已發布的 20260830／20260831 引用碼，並鎖定兩個舊 loader 的 SRI。
新版的範圍、替換碼與待驗收項目見 `integration/CYBERBIZ_CART_EMPTY_CART_FIX_20260831.md`。
20260901 候選的安全界線與回歸項目見 `integration/CYBERBIZ_CART_QUANTITY_FIX_20260901.md`。

尺寸 × 鏡片的隔離測試入口為
`integration/cyberbiz-cart-size-lens-development-loader.js`；它用 development query 與固定
SRI 載入同一份 v2 core，但隔離 production storage。原本的
`integration/cyberbiz-cart-production-loader-20260901-polarized.js` 已因真實刪除 QA
發現靜態 `window.lineItems` 競態而停止驗收，檔案與 URL 保持 byte-identical。修正版的新
未發布 production candidate 為
`integration/cyberbiz-cart-production-loader-20260901-polarized-v2.js`。
三個可見 SUN 商品是入口，
每個入口會依鏡片選擇 SUN／BL／PL 三個獨立 target products，再依尺寸加入該商品的
variant。九個 target products 與 36 個 variants 的實際 mapping 均已固定，live catalog
也已全部 ready：color 與 engraving 的 SUN／BL 均為 available／deny／qty 1／
NT$88,888，兩個 PL 均為 available／deny／qty 1／NT$89,188（已 +300）；UV 三商品維持
ready。這是 2026-09-01 的歷史快照；UV 商品於 2026-09-04 合併後，此 v2 已不再相容，
不得安裝至任何主題。範圍、九組舊 mapping 與當時的 catalog 狀態見
`integration/CYBERBIZ_CART_SIZE_LENS_DEVELOPMENT.md`。對應測試驗證三入口 → 九商品 →
36 variants 的精確 mapping；完整 36 組使用假的可售回應，並另外以不可售 fixture 驗證
fail-closed 與零 POST。v2 targeted regression 另驗證超過 350 ms 的延遲刪除、React DOM
與靜態 lineItems mismatch、整列 note／records pruning、checkout safety，以及同 variant
數量減少時不猜設計 identity；也涵蓋 hidden responsive duplicates、無 quantity input 的
不可調商品列、item_count 行數／件數語意、optional total_quantity 與 malformed cart
JSON fail-closed。測試不會連線到 CYBERBIZ：

```text
node tests/cyberbiz-cart-size-lens-development-loader.test.js
node tests/cyberbiz-cart-polarized-production-candidate.test.js
node tests/cyberbiz-cart-note-sync-v2.test.js
node tests/customizer-mode-copy.test.js
```

2026-09-04 起，UV 已改為單一商品 `71536673`，規格為「尺寸 × 鏡片」共 12 款；
因此上述 v2 的 UV 三商品 mapping 只保留作歷史驗證，不得再安裝。新的未發布核心為
`integration/cyberbiz-cart-production-loader-20260904-uv-combined-v3.js`，限定測試入口為
`integration/cyberbiz-cart-uv-combined-live-test-loader-20260904-v1.js`。限定入口只有在三個
客製入口網址帶 `eyefans_uv_combined_live_test=1`，或同一瀏覽器進入購物車且已有隔離
測試紀錄時才載入核心；一般顧客網址保持靜默。完整 mapping、SRI、安裝與回歸步驟見
`integration/CYBERBIZ_CART_UV_COMBINED_CANDIDATE_V3_20260904.md`。

以下測試不連線到 CYBERBIZ；它們驗證 36 組精確 mapping、同一 UV 商品的
`尺寸＋鏡片` tuple、網址閘門、SRI、舊檔不可變、缺貨／錯規格零 POST、舊 UV 購物車
fail-closed，以及 v3 保留 v2 的刪除與備註同步安全性：

```text
node tests/cyberbiz-cart-uv-combined-candidate.test.js
node tests/cyberbiz-cart-uv-combined-v3.test.js
node tests/cyberbiz-cart-note-sync-v3.test.js
```

## 自動檢查正式橋接草稿

以下測試以假的 `fetch` 執行正式 bridge，不會連線到 CYBERBIZ；它會驗證三個商品、四種尺寸共 12 組款式 ID，以及缺少 `cart=1` 時必須拒絕請求：

```text
node tests/cyberbiz-cart-bridge.test.js
```

真實購物車限定 loader 的自動測試仍使用假的網路回應，不會連線到 CYBERBIZ；它會
驗證網址與最上層分頁閘門、三種客製模式、商品款式與庫存預檢、`/cart.json` 前後
數量差、單次 POST、重複送出保護、訂單備註產生，以及購物車數量不一致時暫停結帳：

```text
node tests/cyberbiz-cart-live-test-loader.test.js
```

候選 loader 的自動測試使用假的 CYBERBIZ 回應，不會修改真實購物車。它會驗證三方案
乘四尺寸的 12 個款式、正式／測試網址互斥、原商品購買入口鎖定、正式與 V3 資料隔離、
一般購物車保持靜默、客製商品缺少 EF 時 fail-closed，以及 click、form submit 與
CYBERBIZ checkout event 的結帳阻擋：

```text
node tests/cyberbiz-cart-production-loader.test.js
node tests/customizer-cart-ui.contract.test.js
node tests/anniversary-pricing.test.js
node tests/cyberbiz-production-setup.contract.test.js
```

回歸另涵蓋同源 `/cart` 前後身分確認、刪最後一件後同尺寸重新加入、舊 bound／unbound
混淆、部分刪除時不得任選設計、跨購物車資料保留、零基線限定清理與持久排除、身分驗證
失敗後不重複 POST、手填備註保留，以及一般商品與空備註不被誤擋。這些是記憶體模擬，
不代表已確認真實 CYBERBIZ 的轉址契約或完成正式訂單驗收。

右側 45° 實拍素材合約會確認 22 種在售框色均有正確透明 PNG、四張額外照片只被標記為
抗藍光鏡片參考、前框與鏡腳使用互補遮罩，以及抗藍光效果不會用整張參考照片覆蓋客人
選擇的框色：

```text
node tests/right-photo-assets.contract.test.js
```
