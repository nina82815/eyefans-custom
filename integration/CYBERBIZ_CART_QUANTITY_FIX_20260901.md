# CYBERBIZ 購物車件數與加入後驗證修正（2026-09-01）

本版檔案為 `cyberbiz-cart-production-loader-20260901.js`。發布程式檔不代表
CYBERBIZ 主題已更新，也不代表真實購物車已完成驗收。既有 20260831 檔案與 SRI 保持不變。

## 未發布測試主題引用碼

確認公開檔案與 SRI 一致後，在未發布主題的 `theme.liquid` 以這整段取代 20260831
loader；不要並排載入新舊版本。儲存不等於發布主題。

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader-20260901.js"
  integrity="sha384-xZlyx3l6zmEO8oIcto+qyjzuaUc2HAkz9U/568H4Oslb/7zCX5pyDzwgqG6I0tR2"
  crossorigin="anonymous"
></script>
```

## 已觀察到的問題

- 第二筆設計只送出一次加入請求，購物車最後顯示同一商品數量 2。
- Loader 當下回報「無法確認購物車數量」，因此依安全規則保留未確認紀錄且不寫入訂單備註。
- 使用者重新開機後，該購物車已是空車；瀏覽器內的舊未確認設計仍可能存在。
- 尚未取得當次真實 `/cart.json` 完整內容，因此修正版同時處理兩個符合現象的可能原因：
  `item_count` 代表商品行數，以及加入後第一次唯讀查詢仍是舊數量。

## 修正內容

1. `/cart.json` 分開驗證商品行數與總件數：
   - `items[].quantity` 的合計是實際總件數。
   - `total_quantity` 存在時必須等於上述合計。
   - `item_count` 可是行數或件數，但必須與 `items` 其中一種一致。
   - 空車例外只有在 `items`、件數與所有存在的計數器都為 0 時成立。
2. `/cart/add` 永遠只送出一次。加入後若仍看到舊數量，只做有限次、唯讀的
   `/cart.json` 重讀；只有指定款式精確增加 1 才能宣告成功。
3. 若數量減少、一次增加超過 1、資料結構矛盾、逾時或購物車身分無法確認，仍保留
   `pending` 並阻擋製作資料誤配；不會自動重送加入請求。
4. 全車已嚴格驗證為空時，可用「不同的新設計」開始下一次測試。成功取得新購物車
   token 後，舊未確認紀錄不會被刪除或升級，只會被排除於這個新 token；其他購物車
   的紀錄維持不動。
5. 相同 `requestId` 永遠不會重送。若舊 pending 已超過安全等待時間、全車被嚴格驗證
   為空，而且客人明確送出新的 request，則可重新加入相同設計；舊紀錄仍只做 token
   隔離，不會被竄改成成功。

## 本機測試界線

自動測試使用假的商品、購物車及網路回應，不會操作真實 CYBERBIZ 購物車。新增回歸包含：

- 同一商品一行、數量 2、`item_count: 1`、`total_quantity: 2`。
- 多商品行、行數與總件數不同。
- `total_quantity` 或 `item_count` 與 `items` 矛盾時，POST 前拒絕。
- 加入後讀到舊數量兩次，再讀到精確 `+1`，全程只有一次 POST。
- 暫時讀取失敗後可由下一次唯讀查詢恢復；格式矛盾則立即 fail-closed。
- 持續舊數量與超量時 fail-closed，且相同設計不得再次 POST。
- 重開機後空車、舊 active／pending 紀錄與新 TEST6 設計的隔離、備註與結帳對應。

本機測試通過不代表真實平台欄位語意與延遲已完成驗收。發布新檔、驗證線上 SRI、替換
未發布主題與執行下一次單次真實加入，都必須分開進行；主題替換及真實測試仍需另外確認。
