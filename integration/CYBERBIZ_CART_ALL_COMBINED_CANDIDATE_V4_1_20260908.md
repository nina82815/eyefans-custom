# CYBERBIZ 周年慶價格安全預覽候選版 v4.1（2026-09-08）

此版只為「現在預覽 9/14 周年慶價」新增隔離測試入口。既有 v4 核心與 v1
測試入口保持 byte-identical；一般商品網址、正式 9/14–9/20 日期排程、CYBERBIZ
成交價、`/cart/add` payload 與製作資料格式均不變。

## 狀態與檔案

此版本尚未安裝至正式主題，也不得把 v4.1 核心直接當成一般 production loader。

- 核心：`cyberbiz-cart-production-loader-20260908-all-combined-v4-1.js`
- 限定測試入口：`cyberbiz-cart-all-combined-live-test-loader-20260908-v2.js`
- 模擬器：`app.js?v=20260908a`

核心雜湊：

- SHA-256：`9b2cf8b81b5d5c9f0e188b8417bb569be1fd6ede2aaf083e68374fdb4a4408eb`
- SRI：`sha384-IbRQI33QiUSpoMg4CPulYLtBVBIBaTJDVXzW4X5g0xz+kred7xGrQVZnbklup5bP`

限定測試入口雜湊：

- SHA-256：`6ddcbb0807250a143020e4a3d0e9a1a148d5a2af94d7c9e864c7602f0d560fc9`
- SRI：`sha384-o8PtKgCnAm3/unrS9+uV46ZErpZudH3gnOsu7GbKysBRPCKJpNjmoiaR7Ers7yX1`

任何程式內容修改後，必須依序重新計算核心 SRI、更新入口內的核心 SRI，再重新
計算入口 SRI。不得覆寫既有 v4 URL。

## 預覽安全邊界

周年慶價只會在下列條件全部成立時轉發至模擬器 iframe：

1. 商品頁是三個 allow-listed 客製商品之一。
2. 父頁有精確參數 `eyefans_all_combined_live_test=1`。
3. 父頁同時有精確參數 `eyefans_anniversary_preview=1`。
4. v2 限定入口以 development capability 載入 v4.1 核心。
5. 模擬器是由 `https://www.eyefans.com.tw` 嵌入、已鎖定方案，且有精確
   `cart=1` 權限。

缺少任一條件、參數值不是精確的 `1`、直接開啟模擬器、外站嵌入或一般 production
runtime，皆不會啟用預覽。非預覽頁若 iframe 殘留預覽參數，v4.1 會主動移除。

預覽只改變模擬器畫面的價格標籤，並顯示「周年慶價預覽（僅供測試）」與購物車
金額聲明。它不修改系統時間、不傳送價格、不改變 Variant ID，也不把 preview／price
寫入製作紀錄。真正成交價仍完全由 CYBERBIZ 商品款式與行銷活動決定。

正式排程仍為台北時間：

- 開始：2026-09-14 00:00:00（UTC+8）
- 結束：2026-09-21 00:00:00（UTC+8，end-exclusive）

## 限定測試安裝

在未發布主題中，以 v2 入口取代 v1 入口。若主題另有 production loader，限定測試
入口必須放在其上方；新舊限定入口不可同時使用。

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-all-combined-live-test-loader-20260908-v2.js"
  integrity="sha384-o8PtKgCnAm3/unrS9+uV46ZErpZudH3gnOsu7GbKysBRPCKJpNjmoiaR7Ers7yX1"
  crossorigin="anonymous"
></script>
```

一般 v4.1 購物車測試（不強制周年慶畫面）：

```text
https://www.eyefans.com.tw/products/cls-cus-mix-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-laser-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
```

現在預覽周年慶價（必須同時帶兩個精確參數）：

```text
https://www.eyefans.com.tw/products/cls-cus-mix-sun-rd?eyefans_all_combined_live_test=1&eyefans_anniversary_preview=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-laser-sun-rd?eyefans_all_combined_live_test=1&eyefans_anniversary_preview=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_all_combined_live_test=1&eyefans_anniversary_preview=1#desc_section_1
```

畫面應同時看見周年慶價、紅色劃線原價與「僅供測試」提示；加入購物車後，仍應以
CYBERBIZ 當下實際設定的價格為準。預覽通過不代表後台活動價格已生效。

## 回滾

從未發布主題移除 v2 script，換回原本 v1 入口：

`cyberbiz-cart-all-combined-live-test-loader-20260904-v1.js`

舊 v4 核心與入口沒有被覆寫，因此回滾不需改動其內容或雜湊。測試完畢也應移除網址
中的兩個測試參數並清空測試購物車。

## 必測回歸

```text
node tests/anniversary-pricing.test.js
node tests/customizer-cart-ui.contract.test.js
node tests/cyberbiz-cart-all-combined-candidate.test.js
node tests/cyberbiz-cart-all-combined-v4.test.js
node tests/cyberbiz-cart-all-combined-v4-1.test.js
node tests/cyberbiz-cart-note-sync-v4.test.js
node tests/cyberbiz-cart-note-sync-v4-1.test.js
```

以上測試使用假的瀏覽器與假的 CYBERBIZ 回應，不會寫入真實購物車。仍需在未發布
主題以三個雙參數網址各驗一次可見價格、加入購物車與訂單備註。
