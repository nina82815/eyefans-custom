# CYBERBIZ 真實購物車測試（僅限未發布主題）

這個階段會真的呼叫 CYBERBIZ `/cart/add`，但只在指定商品網址帶有
`eyefans_cart_live_test=1` 時啟用。一般商品網址不會顯示按鈕，也不會更動購物車。

> 此檔案是驗證用的暫行方案。CYBERBIZ 標準加入購物車只保存款式 ID 與數量，
> 所以測試版會先把完整製作規格保存在同一台瀏覽器，進入結帳頁時自動寫入
> `order[note]`。正式上線前仍應向 CYBERBIZ 確認原生「商品自訂欄位」功能。

## 測試前準備

1. 僅在「未發布主題」加入 loader。
2. 測試商品欲測的尺寸必須有至少 1 件測試庫存，否則 CYBERBIZ 會拒絕加入。
3. 先清除購物車中的三個客製測試商品，避免商品數量與設計筆數不一致。
4. 保留目前的 no-write loader，但同一個測試網址不要同時加入
   `eyefans_cart_test=1` 與 `eyefans_cart_live_test=1`；真實測試 loader 遇到兩者並存會拒絕啟用。
5. 測試期間只開一個客製商品分頁，且不要同時使用商品頁原本的加入購物車按鈕。

2026-08-26 檢查時，三個客製商品的 12 個尺寸款式庫存皆為 0；開始測試前，請只把
本次要驗證的一個尺寸暫時設為至少 1 件。

## 未發布主題引用方式

部署後，請以當次版本提供的 `integrity` 值加入：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-live-test-loader.js"
  integrity="sha384-dGp8UnXtM6KqYDg2WZe3ZFqiq1GtOIbLNBnPON4w7h0Cy6Lw2jzFScp2aQJVPWaQ"
  crossorigin="anonymous"
></script>
```

## 測試網址

UV 彩印：

```text
https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_live_test=1#desc_section_1
```

若未發布主題預覽網址已有 `?preview...`，請改用：

```text
&eyefans_cart_live_test=1
```

網址參數必須放在 `#desc_section_1` 前面。

## 驗收項目

1. 模擬器按鈕顯示「確認設計並加入購物車」。
2. 送出後顯示一組 `EF-...` 設計編號。
3. 購物車商品數量增加 1。
4. 進入購物車後，在「備註」上方看到完整製作資料。
5. `備註` 欄包含尺寸、鏡框、鏡腳、鏡片，以及該模式需要的文字、字體、顏色、圖案與排列。
6. 手動把客製商品數量加減，頁面必須顯示資料不一致並暫停結帳。
7. 移除 `eyefans_cart_live_test=1` 後，商品頁不顯示模擬器購物車按鈕。

完成上列測試仍不代表可直接正式上線；最後還要確認客製資料確實出現在 CYBERBIZ
後台訂單、訂單匯出與製作單。這個測試版依賴同一瀏覽器的 `localStorage` 與訂單備註，
不能直接當作正式製作資料來源；正式版仍需 CYBERBIZ 原生逐品項自訂欄位，或由後端
保存並驗證設計編號。
