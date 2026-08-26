# CYBERBIZ 客製模擬器正式購物車（Production v1）

正式 loader 會在下列三個一般商品網址自動啟用，不需要測試參數：

- 自由配色：`/products/cls-cus-mix-sun-rd`
- 框腳配色＋雷雕：`/products/cls-cus-mix-laser-sun-rd`
- 框腳配色＋UV 彩印：`/products/cls-cus-mix-uv-sun-rd`

它會鎖住這三頁原本的「加入購物車／立即購買」，只允許客人由模擬器送出。結帳頁若有
客製款式、卻找不到相同數量的 EF 設計資料，會暫停結帳，避免收到沒有製作明細的訂單。

## 上線前必查

1. 確認三個商品的正式售價、發布狀態與名稱，不再是測試價格或測試商品。
2. 確認 XS、S、M、L 共 12 個款式的庫存與以下 ID 仍相同：

| 方案 | 商品 ID | XS | S | M | L |
| --- | --- | --- | --- | --- | --- |
| 自由配色 | 71536660 | 87452738 | 87452739 | 87452740 | 87452741 |
| 雷雕 | 71536670 | 87452764 | 87452765 | 87452766 | 87452767 |
| UV 彩印 | 71536673 | 87452776 | 87452777 | 87452778 | 87452779 |

3. 清空測試購物車；測試 V3 資料不會被正式版讀取。
4. 備份已發布與未發布主題的 `theme.liquid`。
5. 每個主題只能保留一支會寫入購物車的 loader。請「取代」
   `cyberbiz-cart-live-test-loader.js`，不要把兩支並排加入。

## 正式引用碼

請放在 `theme.liquid` 的 `</body>` 前：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader.js?v=prod-v1-20260826"
  integrity="sha384-aX+eJhnar+/dkFGFuzj+xGWTPeuc6IK7zi1XI4tQG+M1q3G9OJUuc7OtFIErKxHI"
  crossorigin="anonymous"
></script>
```

## 建議切換順序（不中斷公開店面）

### 1. 已發布主題先使用「只處理既有購物車」模式

先在已發布主題用下列引用碼取代 live-test loader。它不會在公開商品頁接受新設計，
但可讓未發布主題測試產生的正式資料安全進入結帳：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader.js?v=prod-v1-20260826&amp;drain=1"
  integrity="sha384-aX+eJhnar+/dkFGFuzj+xGWTPeuc6IK7zi1XI4tQG+M1q3G9OJUuc7OtFIErKxHI"
  crossorigin="anonymous"
></script>
```

### 2. 未發布主題改用正式引用碼並驗收

在未發布主題以「正式引用碼」取代 live-test loader，另開店面預覽新分頁。使用三個一般
商品網址測試，不要加 `eyefans_cart_live_test=1`。

逐項確認：

1. 商品頁原本的兩個購買按鈕顯示「請使用下方模擬器加入購物車」，且不可直接購買。
2. 模擬器會顯示「確認設計並加入購物車」。
3. 三個方案各測一筆，尺寸與商品款式正確，且每次只增加 1 件。
4. 模擬器回傳 `EF-...` 編號。
5. 購物車數量正確，結帳備註顯示完整 EF 製作明細。
6. 一般非客製商品的加入購物車與結帳完全不受影響。
7. 刪除客製資料或直接調高客製商品數量時，結帳會被暫停並要求回模擬器重加。

### 3. 正式公開

未發布主題驗收完成後，把已發布主題的 `drain=1` 引用碼換成「正式引用碼」。再用無痕
視窗各測一次三個一般商品網址與一個一般商品，確認後才算完成上線。未發布主題也保留
相同正式引用碼，避免下次發布主題時倒退。

## 緊急停止與回滾

若正式上線後要暫停接受新客製設計，不要立刻換回測試 loader。請先把已發布主題的網址
加上 `&amp;drain=1`。這會停止商品頁新加入，但仍保護已在購物車中的正式 EF 設計，讓既有
客人可以完成結帳。確認已沒有待結帳客製購物車後，才移除 production loader。

## Production v1 的資料邊界

此版本把 EF 與完整製作資料保存在客人同一個瀏覽器，再同步到 CYBERBIZ 訂單備註。
換裝置、清除瀏覽器資料或封鎖儲存時，系統會選擇暫停客製結帳，不會猜測製作內容。
訂單備註可供目前製作流程使用，但它不是不可竄改的伺服器資料庫；下一階段仍建議由
CYBERBIZ 原生逐品項欄位或自有後端，將每個 EF 編號綁定完整設計與訂單。
