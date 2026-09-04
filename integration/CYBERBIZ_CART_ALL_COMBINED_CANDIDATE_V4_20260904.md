# CYBERBIZ 三方案單商品 × 尺寸 × 鏡片候選版 v4（2026-09-04）

此候選版配合自由配色、雷雕與 UV 彩印三個 CYBERBIZ 商品皆改為單一商品入口，
每個商品以「尺寸 × 鏡片」建立 12 個款式。既有 v2、UV v3 與歷史 loader URL
全部保持不變。

## 狀態與檔案

此版本尚未公開發布，也不得直接裝到已發布主題。

- 核心：`cyberbiz-cart-production-loader-20260904-all-combined-v4.js`
- 限定測試入口：`cyberbiz-cart-all-combined-live-test-loader-20260904-v1.js`

核心雜湊：

- SHA-256：`81d5dd02611b931c1610bd5c72050da5231b9ea853c26eddadee339b7310c3fa`
- SRI：`sha384-qYynbWR+bEHbDUIRXgxTXzYq/YGK19+woKNifGrPEu3lenCbQqLPQ+yohKHp2+jv`

限定測試入口雜湊：

- SHA-256：`2a4db3a8ceb8ba18f478b9252b4a329a6fb7ee59110d5a4d8634fcfe1e0a5fa1`
- SRI：`sha384-03JQQDYL8TjCi2OaNAaqz+h49tVgy45063NL6X09cFuBB5wz7aDKUdkS/DUIT/bg`

任何內容修改後，都必須重新計算核心 SRI、更新限定測試入口，再重新計算入口
SRI。不得覆寫已發布且受 SRI 保護的既有 URL。

## 2026-09-04 正式商品快照

三個商品的選項名稱皆為 `尺寸`、`鏡片`，每組尺寸與鏡片只有一個款式。

### 自由配色

- Product ID：`71536660`
- Handle：`cls-cus-mix-sun-rd`
- 後台鏡片值：`灰片`、`抗藍光`、`偏光`

| 鏡片 | XS | S | M | L | 售價／定價 |
|---|---:|---:|---:|---:|---:|
| 灰片 | 87452738 | 87452739 | 87452740 | 87452741 | 890／890 |
| 抗藍光 | 87870151 | 87870152 | 87870153 | 87870154 | 890／890 |
| 偏光 | 87870155 | 87870157 | 87870158 | 87870159 | 1,190／1,190 |

SKU 格式：`CLS-CUS-MIX-RD-{XS|S|M|L}-{GR|BL|PL}`。

### 雷雕

- Product ID：`71536670`
- Handle：`cls-cus-mix-laser-sun-rd`
- 後台鏡片值：`灰片`、`抗藍光鏡片`、`偏光鏡片`

| 鏡片 | XS | S | M | L | 售價／定價 |
|---|---:|---:|---:|---:|---:|
| 灰片 | 87452764 | 87452765 | 87452766 | 87452767 | 990／990 |
| 抗藍光鏡片 | 87856080 | 87856081 | 87856082 | 87856083 | 990／990 |
| 偏光鏡片 | 87856084 | 87856085 | 87856086 | 87856087 | 1,290／1,290 |

SKU 格式：`CLS-CUS-MIX-LS-RD-{XS|S|M|L}-{GR|BL|PL}`。

### UV 彩印

- Product ID：`71536673`
- Handle：`cls-cus-mix-uv-sun-rd`
- 後台鏡片值：`灰片`、`抗藍光`、`偏光`

| 鏡片 | XS | S | M | L | 售價／定價 |
|---|---:|---:|---:|---:|---:|
| 灰片 | 87452778 | 87817315 | 87817316 | 87852179 | 1,090／1,090 |
| 抗藍光 | 87852180 | 87852181 | 87852182 | 87852183 | 1,090／1,090 |
| 偏光 | 87852184 | 87852185 | 87852186 | 87852188 | 1,390／1,390 |

SKU 格式：`CLS-CUS-MIX-UV-RD-{XS|S|M|L}-{GR|BL|PL}`。

抓取快照時，36 款皆可售且庫存為 2。唯一不一致是 UV 的 XS／灰片
`87452778` 使用 `inventory_policy=continue`，其餘 35 款為 `deny`；若不是刻意允許
缺貨續賣，正式上線前應在後台改為 `deny`。

## 安全規則

- 三種方案各自只允許一個商品 handle 與 Product ID。
- 每次加入前都重新取得正式商品 JSON，並精確驗證：
  - `options === ["尺寸", "鏡片"]`
  - `option1 === 所選尺寸`
  - `option2 === 該方案的精確後台鏡片值`
  - `option3 === null`
  - Variant ID、Product ID、可售狀態與庫存均相符
- 程式不傳送或計算價格；實際成交價只由 CYBERBIZ 款式與行銷活動決定。
- 27 個舊藍光、偏光與 UV 款式只保留在結帳防守清單，絕不再新增。舊購物車
  遇到這些款式時會保持 fail closed，要求移除後從模擬器重新加入。
- 正式資料沿用 `eyefansCustomCartDesignsProdV1`；本測試版使用獨立資料鍵，避免污染
  目前 UV v3 或正式紀錄。

## 限定測試安裝（檔案公開後才可進行）

先清空購物車與舊 UV v3 的測試資料，再以 v4 限定入口**取代**目前的 v3 限定入口。
兩個限定入口不可並存。若主題另有 production loader，v4 限定入口必須放在它上方。

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-all-combined-live-test-loader-20260904-v1.js"
  integrity="sha384-03JQQDYL8TjCi2OaNAaqz+h49tVgy45063NL6X09cFuBB5wz7aDKUdkS/DUIT/bg"
  crossorigin="anonymous"
></script>
```

一般商品網址保持完全不啟用；只有下列網址載入 v4 測試核心：

```text
https://www.eyefans.com.tw/products/cls-cus-mix-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-laser-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_all_combined_live_test=1#desc_section_1
```

限定入口會在同一瀏覽器有未完成測試紀錄時，於購物車與結帳頁繼續載入核心並同步
訂單備註。若核心因 404、SRI 不符或網路問題載入失敗，結帳按鈕會被停用。

## 必測回歸

1. 三種方案各測 XS／S／M／L × 灰片／抗藍光／偏光，共 36 組；請分批測試，
   每批完成後先清空測試購物車，不要把 36 筆同時留在一張購物車。
2. 購物車的尺寸、鏡片、單價與對應 Variant ID 必須全部正確。
3. 同尺寸三種鏡片必須產生三個不同款式與三筆獨立設計紀錄。
4. 重新整理購物車後，設計編號與完整製作資料仍存在。
5. 刪除任一列，只能刪除該列對應的設計紀錄與備註。
6. 規格軸、鏡片文字、Variant ID 或庫存任一不符時，必須零 POST、零紀錄。
7. 不帶測試參數的一般商品頁不得啟用 v4。
8. 完成購物車測試後，再以一張測試訂單核對 CYBERBIZ 後台訂單備註。

完成限定測試不等於正式發布授權；正式主題切換仍需另行確認。
