# CYBERBIZ 空購物車首頁轉址修正（2026-08-31）

本版檔案為 `cyberbiz-cart-production-loader-20260831.js`，已通過本機模擬測試。
發布程式檔不代表 CYBERBIZ 主題已更新，也不代表真實購物車已完成驗收。
確認新檔已可讀取且 SRI 一致後，先只在未發布測試主題替換。不要只改日期卻沿用舊 SRI。

## 已觀察到的問題

- 官網不帶登入資料的唯讀 `/cart.json` 回應是 HTTP 200、`items: []`、`item_count: 0`。
- 同樣的空車情境下，`GET /cart` 回 HTTP 302，轉到 `https://www.eyefans.com.tw/`，最終 HTTP 200。
- 20260830 版只接受已確認空車的 `/cart`，不接受首頁，因而在 POST 前報購物車讀取失敗。
- 使用者確認操作順序是刪除原商品、回模擬器加入、出現紅字；本機模擬已重現相同錯誤。
  這些證據不等於已讀取使用者當次的完整 Network 紀錄，也不代表有商品時的轉址已驗證。

## 修正界線

新增例外只在加入前、`/cart.json` 已驗證整台購物車 `item_count === 0` 時生效。
此時允許 `/cart` 被重新導向相同來源的裸首頁 `/`，且必須 `redirected === true`、
沒有 query 或 hash。首頁不被視為購物車身分，也不會產生或猜測 token。

下列保護保持不變：

- 任一商品仍有數量時，不得以首頁當作有效購物車身分。
- 加入後必須確認指定款式增加 1 件，並取得同源 `/carts/:token`。
- 加入前已有 token 時，加入後必須仍是相同 token。
- 登入頁、其他路徑、帶未知參數的首頁、跨來源或失敗回應不會套用這個例外。
- POST 後若無法確認身分，保留未確認紀錄、阻擋重複加入，不宣告成功。
- 舊設計清理、跨購物車保留、手填備註保留及無法對應時阻擋結帳的規則不變。

已發布的 `cyberbiz-cart-production-loader.js` 與 `cyberbiz-cart-production-loader-20260830.js`
均保持原始內容與 SRI。`CYBERBIZ_CART_PRODUCTION_SETUP.md` 繼續記錄已發布的 20260830 版，
不是本版的安裝碼。

## 未發布測試主題引用碼

在未發布主題的 `theme.liquid`，以這整段取代目前的購物車 loader；不要並排載入新舊版本，
其他主題程式保持不動。儲存不等於發布主題，不要在尚未驗收前公開主題。

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader-20260831.js"
  integrity="sha384-chm9Bq3ogSrUepLXtLDiiu3bNt8Vl+2jzyWZX5xXiVDGtYrOIuDD/VvysX5S7O75"
  crossorigin="anonymous"
></script>
```

## 本機驗證與後續驗收

`tests/cyberbiz-cart-production-loader.test.js` 改為測試 20260831 版；既有設計對應回歸照常執行，
並新增空車首頁轉址的成功與拒絕情境。`tests/cyberbiz-production-setup.contract.test.js`
持續核對兩份引用文件與兩個舊 loader 的固定 SRI。

所有購物車自動測試都使用模擬回應，不呼叫真實加入、刪除或結帳 API。
本機通過只能確認已知空車檢查修正，不能代表 CYBERBIZ 的有商品／加入後轉址已完成驗收。

使用替換碼前，先驗證新檔可讀取且 SRI 一致。
發布程式檔不等於授權代改主題或操作真實購物車；主題替換及真實測試仍需另外確認。
確認商品頁與購物車頁載入相同版本後，才做單次受控加入測試；不需清除瀏覽器資料、
手動填補 EF 備註或提交訂單。若購物車改用其他主題而版本不一致，先停止測試並確認處理方式。
