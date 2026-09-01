# CYBERBIZ 尺寸 × 鏡片未發布候選版（2026-09-01）

> **此 v1 候選版已停止驗收，不得再安裝。** 真實購物車測試發現：React／AJAX
> 刪除一個數量為 2 的商品列時，頁面列已刪除，但啟動時的 `window.lineItems` 仍可能
> 維持舊資料，造成訂單備註未清除。既有檔案與 SRI 為了可稽核與安全回復而保持
> byte-identical；修正版請使用
> `CYBERBIZ_CART_POLARIZED_CANDIDATE_V2_20260901.md`，不可覆寫此 URL。

候選檔案為 `cyberbiz-cart-production-loader-20260901-polarized.js`。九個商品、36 個
variants 與三個偏光商品 `+NT$300` 均已由正式商品 JSON 核對；這仍只是**未發布
production candidate**，尚未上傳、尚未安裝，也尚未完成真實購物車驗收。

## 未發布主題候選引用碼

候選檔公開且重新核對 SRI 後，才可在未發布主題的 `theme.liquid` 用以下整段**取代**
20260901 loader。不可並排載入新舊兩版；儲存未發布主題也不等於發布主題。

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader-20260901-polarized.js"
  integrity="sha384-rPz/izM7fEIWspbrR5dQ1raWC1tk4Eyw3t47nhAjRYE72CKTt/zhGTa2Hg0IU5gr"
  crossorigin="anonymous"
></script>
```

- SHA-256：`ade85d93875ae7192a77c197f4cafd0a4b8787e1082943a6666aebefdd69a579`
- SRI：`sha384-rPz/izM7fEIWspbrR5dQ1raWC1tk4Eyw3t47nhAjRYE72CKTt/zhGTa2Hg0IU5gr`

候選檔沿用正式 loader flag 與 `eyefansCustomCartDesignsProdV1` storage key，因此它是替換版，
不是可與舊版共存的附加腳本。開始驗收前應確認購物車為空，並使用乾淨的測試瀏覽器
工作階段，避免先前版本的瀏覽器紀錄干擾結果。

## 安裝前驗收

1. 確認公開候選檔的 SHA-384 與上方 SRI 完全一致。
2. 在三個 SUN 入口分別測試灰片、抗藍光、偏光，並抽驗 XS／S／M／L。
3. 核對購物車加入的是對應 SUN／BL／PL 商品及精確尺寸；偏光為 NT$89,188，其他鏡片
   為 NT$88,888。
4. 同尺寸先加灰片再加偏光，必須形成不同商品項目，兩筆設計備註均完整且不互相認領。
5. 模擬缺貨或商品 JSON 不一致時，必須零 `/cart/add` 並顯示安全錯誤。
6. 核對重新整理、數量 2、刪除商品、空車重開與結帳備註；全套通過前不可發布主題。

若候選驗收失敗，在未發布主題恢復原本
`cyberbiz-cart-production-loader-20260901.js` 引用碼即可；舊檔與既有 SRI 不得修改。
