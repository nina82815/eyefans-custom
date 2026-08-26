# CYBERBIZ 購物車限定測試設定

這個階段只測試「模擬器 → 商品頁」的資料聯動。這支 test-only loader 與正式購物車程式完全隔離，送出後只會模擬成功回應，**不會真的更動購物車或建立訂單**。

## 1. 在主題加入一行 loader

請在 `theme.liquid` 現有的 eYeFANS 模擬器 script **後面**加入：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-test-loader.js"
  integrity="sha384-ALWr1cX3cKXKcKPOZntoQxXNHpKyG2hCn6sUTqa6X7E21Rk4IodwQkUVVLOG27aB"
  crossorigin="anonymous"
></script>
```

一般商品網址不會受到影響。Loader 只有在以下條件全部成立時才會啟用：

- CYBERBIZ 父頁網址有 `eyefans_cart_test=1`
- 網址是 `https://www.eyefans.com.tw`
- 是自由配色、雷雕或 UV 彩印其中一個指定商品頁
- 頁面內存在 `.eyefans-custom-wrap iframe`
- iframe 是官方 GitHub Pages 模擬器，且 `mode` 與商品一致、`locked=1`

條件通過後，loader 會先註冊限定測試訊息接收器，再替 iframe 加上 `cart=1`。整個測試只載入上面這一支外部 script；`integrity` 會鎖定目前已驗證版本，若遠端內容日後被更改，瀏覽器會拒絕執行。

## 2. 用限定網址測試

例如 UV 彩印：

```text
https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_cart_test=1#desc_section_1
```

另外兩個商品也可在原商品網址後加上相同參數：

```text
?eyefans_cart_test=1
```

測試時應看到「確認設計並加入購物車」按鈕。按下後，成功訊息必須包含「沒有實際加入購物車」。

## 3. 安全驗收

請同時確認：

1. 移除 `eyefans_cart_test=1` 後，按鈕不會出現。
2. 瀏覽器 Network 面板中沒有任何新增購物車的請求。
3. 購物車商品數量完全沒有變動。

這個限定測試 loader 不可直接改造成正式購物車程式；正式串接會以另一份經過驗證的程式處理。
