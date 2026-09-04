# CYBERBIZ UV 單商品 × 尺寸 × 鏡片候選版 v3（2026-09-04）

此候選版配合 CYBERBIZ 商品 `71536673` 改為一個 UV 彩印入口，並以
`尺寸 × 鏡片` 建立 12 個款式。既有 v2 與歷史 loader URL 全部保持不變。

## 檔案

- 核心：`cyberbiz-cart-production-loader-20260904-uv-combined-v3.js`
- 限定測試入口：`cyberbiz-cart-uv-combined-live-test-loader-20260904-v1.js`

核心雜湊：

- SHA-256：`b0afb8f5c1272c20866efd719dab1594ea4ba305ff1b09e3f785a03bc83b6a42`
- SRI：`sha384-6AKlbXT4bNgOyrQiWHPG5zpsHnS957HgKCj8Bp3cDsrQsqLUthkqP+o9jJ00iId1`

限定測試入口雜湊：

- SHA-256：`4d08f5110f5884540794e21c3972b1b408bb542161650ae30153a31ccbc9eb13`
- SRI：`sha384-Gf/APm/3aS3vP0b8L58VXRDwDGOIBGoMAt5vK/VP+mUl53Vy8OUt+j9EXzh7Niuz`

任何內容再修改後，都必須重新計算核心 SRI、更新測試入口，再重新計算測試入口
SRI。不得以新內容覆寫已發布且受 SRI 保護的既有 URL。

## 2026-09-04 商品快照

- Product ID：`71536673`
- Handle：`cls-cus-mix-uv-sun-rd`
- Options：`尺寸`、`鏡片`
- Option 1：`XS`、`S`、`M`、`L`
- Option 2：`灰片`、`抗藍光`、`偏光`

| 鏡片 | XS | S | M | L |
|---|---:|---:|---:|---:|
| 灰片 | 87452778 | 87817315 | 87817316 | 87852179 |
| 抗藍光 | 87852180 | 87852181 | 87852182 | 87852183 |
| 偏光 | 87852184 | 87852185 | 87852186 | 87852188 |

商品售價快照：灰片與抗藍光 NT$1,090；偏光 NT$1,390。程式不送出或計算
價格，成交價仍只由 CYBERBIZ 款式與行銷活動決定。

## 安全規則

- UV 三個鏡片 target 共用同一商品 handle 與 Product ID。
- 送出前必須取得該商品 JSON，並精確驗證：
  - `options === ["尺寸", "鏡片"]`
  - `option1 === 所選尺寸`
  - `option2 === 所選鏡片的後台值`
  - `option3 === null`
  - Variant ID 與 Product ID 完全相符
  - 商品與款式皆可售，且庫存政策允許新增一件
- 模擬器顯示的 `三號灰片／抗藍光鏡片／偏光鏡片` 不直接拿來比對後台；
  固定映射到 `灰片／抗藍光／偏光`。
- 舊 UV variants 只留在 checkout 防守清單，不得再新增。遇到舊購物車時保持
  fail closed，要求移除後重新從模擬器加入，不猜測舊尺寸。
- Variant `87452778` 已由舊 UV 灰片 M 改為新 UV 灰片 XS。其舊 M 設計紀錄
  無法通過新版 target 驗證，也不得靜默轉成 XS。

## 庫存提醒

抓取快照時，灰片 XS 為 `continue`；其餘 11 款為 `deny` 且庫存各 2 件。
因此其餘款式完成兩次實際加入／成交後可能變成不可售。正式開賣前應依營運規則
統一確認要採有限庫存或允許缺貨繼續販售。

## 限定測試安裝

新檔案公開並從遠端重新核對雜湊後，在測試／目前使用的主題中，以以下程式碼
**取代目前公開頁載入的舊限定測試入口** `cyberbiz-cart-live-test-loader.js`。
2026-09-04 唯讀檢查公開商品頁時，只找到這個舊限定測試入口，未找到一般網址會
啟用的 production loader：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-uv-combined-live-test-loader-20260904-v1.js"
  integrity="sha384-Gf/APm/3aS3vP0b8L58VXRDwDGOIBGoMAt5vK/VP+mUl53Vy8OUt+j9EXzh7Niuz"
  crossorigin="anonymous"
></script>
```

一般商品網址保持完全不啟用。只有以下網址會載入新版測試核心：

```text
https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd?eyefans_uv_combined_live_test=1#desc_section_1
```

加入成功後，限定測試入口只會在同一瀏覽器具有新版隔離測試紀錄時，於購物車／
結帳頁繼續載入核心並同步備註。

若另有未公開主題已安裝一般網址會啟用的 production loader，請保留該檔，並把
本限定測試入口放在它的前面。一般網址時限定入口保持 inert；只有明確測試網址與
其隔離測試結帳流程才會預留 mutex，使後方 production loader 不重複監聽或 POST。
不可同時安裝兩個不同的限定測試入口。

若測試結帳頁無法載入新版核心（例如 404、SRI 不符或網路錯誤），限定入口會停用
結帳按鈕並攔截 checkout 事件；請重新整理或先停止測試，不得在未同步客製備註時
繼續送單。

## 測試前置

1. 使用空購物車與新的無痕視窗，避免舊 UV variant `87452778` 的尺寸語意衝突。
2. 確認 12 個 UV 款式仍為 `available: true`。
3. 只保留一個限定測試入口；若另有正式 production loader，測試入口必須排在它前面。
4. 先驗證限定測試網址；不得先把核心直接安裝為一般顧客正式入口。

## 必測回歸

1. UV 的 XS／S／M／L 分別加入灰片、抗藍光、偏光，共 12 組。
2. 每次加入後，購物車款式必須同時顯示正確尺寸與鏡片。
3. 灰片與抗藍光正常價為 NT$1,090；偏光為 NT$1,390。
4. 同尺寸的三種鏡片必須形成三個不同 Variant ID 與三筆獨立設計紀錄。
5. 重新整理購物車後，設計編號與備註仍完整。
6. 刪除其中一列後，只能刪除該列對應的設計紀錄與備註。
7. 商品規格順序、鏡片文字、Variant ID 或庫存任一不符時，必須零 POST、零新增
   紀錄並顯示錯誤。
8. 不帶測試參數開啟一般商品頁，不得啟用新版測試橋接。

完成限定測試與訂單後台備註驗證後，才可另行決定是否把正式主題的 loader 替換為
核心 URL。限定測試完成不等於正式發布授權。
