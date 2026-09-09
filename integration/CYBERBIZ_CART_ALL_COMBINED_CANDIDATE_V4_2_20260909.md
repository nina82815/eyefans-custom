# CYBERBIZ 手機「開始客製設計」測試候選版 v4.2（2026-09-09）

此版處理手機商品頁底部仍顯示 CYBERBIZ 原生「加入購物車／立即購買」的問題。
既有 v4、v4.1 與其測試入口保持 byte-identical；本版先以 v3 限定測試入口驗證，
不得直接安裝為一般 production loader。

## 行為

- 手機底部的原生「加入購物車」改為單一「開始客製設計」。
- 點擊只會攔截原生事件並平滑捲動到 `.eyefans-custom-wrap iframe`。
- 手機「立即購買」與 mobile buy-together 控制會隱藏並停用。
- 桌機原生購買控制仍維持停用，必須從模擬器完成設計。
- Variant、`/cart/add` payload、價格、製作資料與訂單備註格式不變。
- 9/14 周年慶價格預覽的雙參數安全邊界延續 v4.1。

## 檔案與固定雜湊

核心：`cyberbiz-cart-production-loader-20260909-all-combined-v4-2.js`

- SHA-256：`444fe2f906bc8792fe1adbf10770f9942b65193d53a121e62c35f3ed27e68d1d`
- SRI：`sha384-jQT3U4OUx+Ai9G9A/aYpe+ORTAVsE0UDA0GDAmqSVxHDh0ZZHqndoaKc7EmK4Wf8`

限定測試入口：`cyberbiz-cart-all-combined-live-test-loader-20260909-v3.js`

- SHA-256：`2839c8b1ae64a884a212740512bd7addc504d49f55b0b7607f0f7c9dcdab74ac`
- SRI：`sha384-Dpx5zLT7+n3lWKtZ11YzAGMmvggkFff0krpc1K+1DvQEH40zxGYaXkUvXV16NTlD`

若修改任一檔案，必須重新計算核心雜湊、更新入口內的核心 SRI，再重新計算入口雜湊。

## 測試安裝

在 CYBERBIZ 主題中，以以下 v3 入口取代目前的 v1 或 v2 測試入口。新舊入口不可並存：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-all-combined-live-test-loader-20260909-v3.js"
  integrity="sha384-Dpx5zLT7+n3lWKtZ11YzAGMmvggkFff0krpc1K+1DvQEH40zxGYaXkUvXV16NTlD"
  crossorigin="anonymous"
></script>
```

手機測試網址：

```text
https://www.eyefans.com.tw/products/cls-cus-mix-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-laser-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
```

周年慶預覽可再加上精確參數 `eyefans_anniversary_preview=1`。

## 人工驗收

1. 使用手機無痕視窗打開其中一個測試網址。
2. 底部應只有「開始客製設計」，不得出現可用的「立即購買」。
3. 點擊後應移到模擬器，不得開啟 CYBERBIZ 規格購買視窗或增加購物車數量。
4. 在模擬器完成設計後，才可按「確認設計並加入購物車」。
5. 購物車商品款式、數量與客製製作資料需一致。
6. 再確認沒有測試參數的一般網址維持既有測試前狀態。

## 回滾

若手機驗收失敗，移除 v3 入口並換回目前的 v1：

`cyberbiz-cart-all-combined-live-test-loader-20260904-v1.js`

回滾後清除手機瀏覽器快取，重新開啟商品頁確認。
