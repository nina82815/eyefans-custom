# 購物車橋接測試頁

`cart-host.html` 模擬 CYBERBIZ 商品頁父視窗。它會載入：

```text
../index.html?mode=uv&locked=1&cart=1
```

測試頁只使用 `postMessage`，不會呼叫 `/cart/add` 或其他購物車 API。

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
`/cart/add`。後者只能放在未發布主題，設定方式請見
`integration/CYBERBIZ_CART_LIVE_TEST_SETUP.md`。

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
