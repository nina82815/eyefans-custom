# CYBERBIZ 真實購物車測試（僅限未發布主題）

這個階段會真的呼叫 CYBERBIZ `/cart/add`，但只在指定商品網址帶有
`eyefans_cart_live_test=1` 時啟用。一般商品網址不會顯示按鈕，也不會更動購物車。

> 此檔案是驗證用的暫行方案。CYBERBIZ 標準加入購物車只保存款式 ID 與數量，
> 所以測試版會先把完整製作規格保存在同一台瀏覽器，進入結帳頁時自動寫入
> `order[note]`。正式上線前仍應向 CYBERBIZ 確認原生「商品自訂欄位」功能。

## 測試前準備

1. 商品頁測試仍在「未發布主題」加入 loader。CYBERBIZ 若在進入 `/carts/...` 後改用目前
   已發布主題，還要把同一個 loader 暫時加入「已發布主題」的 `theme.liquid`、`</body>`
   前面，否則結帳頁不會執行 EF 資料同步。結帳端有本次測試資料才會啟動；沒有
   `eyefansCustomCartDesignsV3` 測試資料的公開結帳會完全略過。
2. 測試商品欲測的尺寸必須有至少 1 件測試庫存，否則 CYBERBIZ 會拒絕加入。
3. 先清除購物車中的三個客製測試商品，避免商品數量與設計筆數不一致。
4. 保留目前的 no-write loader，但同一個測試網址不要同時加入
   `eyefans_cart_test=1` 與 `eyefans_cart_live_test=1`；真實測試 loader 遇到兩者並存會拒絕啟用。
5. 測試期間只開一個客製商品分頁，且不要同時使用商品頁原本的加入購物車按鈕。
6. 必須把未發布主題的「店面預覽」另開成最上層的新分頁。若商品頁仍包在
   CYBERBIZ 後台的預覽框內，loader 會在送出前停止並提示另開新分頁，不會呼叫購物車。

庫存請以 CYBERBIZ 後台當下顯示為準；開始測試前，只把本次要驗證的一個尺寸暫時設為
至少 1 件即可。

每次送出時，loader 會同步預檢目前商品 JSON 的商品 ID、尺寸款式 ID、可售狀態與庫存，
並讀取同網域 `/cart.json` 的款式數量；兩項都通過後只送出一次 `/cart/add`，再讀取一次
`/cart.json`。只有指定款式確實比送出前增加 1 件，才會顯示成功並保存製作資料。商品、
庫存或購物車預檢無法通過時完全不送出；無法確認的 POST 結果會保留為待確認，避免自動
重複加入。

## 未發布主題引用方式

部署後，請以當次版本提供的 `integrity` 值加入：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-live-test-loader.js"
  integrity="sha384-93DoDhGIm3jZC3723gA0VEG1wEC9ZjlMxTeSM/BaNlGofa9o3rx6R6Jtt4oQ2HPX"
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
2. 送出後，只有購物車款式數量確認增加 1 時才顯示一組 `EF-...` 設計編號。
3. 購物車商品數量增加 1。
4. 進入購物車後，在「備註」上方看到完整製作資料。
5. `備註` 欄包含尺寸、鏡框、鏡腳、鏡片，以及該模式需要的文字、字體、顏色、圖案與排列。
6. 手動把客製商品數量加減，頁面必須顯示資料不一致並暫停結帳。
7. 移除 `eyefans_cart_live_test=1` 後，商品頁不顯示模擬器購物車按鈕。
8. 把欲測尺寸庫存改為 0 後，送出應顯示「此尺寸目前沒有可用庫存」，且購物車不得增加。

若商品頁來自未發布主題、但結帳頁原始碼載入的是另一個已發布主題資產，代表 CYBERBIZ
沒有把預覽主題延續到結帳頁。這時只修改未發布主題無法驗收 EF 編號；必須依第 1 點讓
實際渲染結帳頁的主題也載入此測試 loader。完成測試後，再決定是否正式發布整套主題。

若畫面顯示「目前商品頁開在後台預覽框中」，請複製實際店面預覽網址到新分頁，再把
`eyefans_cart_live_test=1` 放在 `#desc_section_1` 之前；不要在後台內嵌預覽框直接測試。

完成上列測試仍不代表可直接正式上線；最後還要確認客製資料確實出現在 CYBERBIZ
後台訂單、訂單匯出與製作單。這個測試版依賴同一瀏覽器的 `localStorage` 與訂單備註，
不能直接當作正式製作資料來源；正式版仍需 CYBERBIZ 原生逐品項自訂欄位，或由後端
保存並驗證設計編號。
