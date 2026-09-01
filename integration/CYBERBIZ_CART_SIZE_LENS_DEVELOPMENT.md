# CYBERBIZ 尺寸 × 鏡片購物車開發版

> **未發布 production candidate／尚未安裝。** 九個 target products 與 36 個 variants
> 已固定且 live catalog 全部 ready，三個 PL 商品也都已設定 `+NT$300`。目前已無 catalog
> 或價格 blocker，但仍須先完成未發布主題的全套驗收，才可安裝至已發布主題；不得與
> `cyberbiz-cart-production-loader-20260901.js` 並排載入。

真實刪除 QA 已淘汰 v1 polarized candidate；不得覆寫或繼續安裝該既有 URL。修正版為
`cyberbiz-cart-production-loader-20260901-polarized-v2.js`，固定 SRI、替換片段與驗收
順序見 `CYBERBIZ_CART_POLARIZED_CANDIDATE_V2_20260901.md`。development loader 現在是
一個小型隔離入口：以明確 query 載入同一份 v2 core，但使用 development flag 與
`eyefansCustomCartDesignsSizeLensDevV1`，不讀寫 production records。

## 實際商品結構

前台只顯示三個 SUN／灰片商品作為客製入口：

- `cls-cus-mix-sun-rd`：框腳配色入口。
- `cls-cus-mix-laser-sun-rd`：框腳配色＋雷雕入口。
- `cls-cus-mix-uv-sun-rd`：框腳配色＋UV 彩印入口。

每個方案在 CYBERBIZ 後台其實有三個獨立商品：SUN／灰片、BL／抗藍光、PL／偏光。
每個實際商品只有 XS、S、M、L 四個 variants。因此整體是：

```text
3 個可見 SUN 入口
  → 每個入口依 lensId 選 SUN／BL／PL 其中一個 target product
  → 再依 size 選該 target product 的唯一 variant
  = 9 個 target products、36 個 variants
```

鏡片 key 與 target 類型固定為：

- `gray` → `三號灰片` → SUN 商品
- `blue-tea` → `抗藍光鏡片` → BL 商品
- `polarized` → `偏光鏡片` → PL 商品

Loader 只會 POST `id=<variantId>&quantity=1`，不傳價格，也不在瀏覽器計算價格。
偏光 `+NT$300` 必須直接設定在三個 PL 商品共 12 個 variants 的 CYBERBIZ 售價中。

## 九組固定 mapping 與目前狀態

九個 target products 的 handle、product ID 與四個尺寸 variant IDs 均已固定。下表的
狀態是目前正式網域商品 JSON 快照；mapping 已齊全不等於可以發布：

| 方案 | 鏡片 target | target handle | product ID | XS | S | M | L | JSON 狀態／價格 |
|---|---|---|---:|---:|---:|---:|---:|---|
| color | SUN／灰片 | `cls-cus-mix-sun-rd` | 71536660 | 87452738 | 87452739 | 87452740 | 87452741 | ready；available；deny；qty 1；NT$88,888 |
| color | BL／抗藍光 | `cls-cus-mix-bl-rd` | 71536666 | 87452750 | 87452751 | 87452752 | 87452753 | ready；available；deny；qty 1；NT$88,888 |
| color | PL／偏光 | `cls-cus-mix-pl-rd` | 71536665 | 87452746 | 87452747 | 87452748 | 87452749 | ready；available；deny；qty 1；NT$89,188；已 +300 |
| engraving | SUN／灰片 | `cls-cus-mix-laser-sun-rd` | 71536670 | 87452764 | 87452765 | 87452766 | 87452767 | ready；available；deny；qty 1；NT$88,888 |
| engraving | BL／抗藍光 | `cls-cus-mix-laser-bl-rd` | 71536672 | 87452772 | 87452773 | 87452774 | 87452775 | ready；available；deny；qty 1；NT$88,888 |
| engraving | PL／偏光 | `cls-cus-mix-laser-pl-rd` | 71536671 | 87452768 | 87452769 | 87452770 | 87452771 | ready；available；deny；qty 1；NT$89,188；已 +300 |
| uv | SUN／灰片 | `cls-cus-mix-uv-sun-rd` | 71536673 | 87452776 | 87452777 | 87452778 | 87452779 | ready；既有正式 mapping；NT$88,888 |
| uv | BL／抗藍光 | `cls-cus-mix-uv-bl-rd` | 71536675 | 87452784 | 87452785 | 87452786 | 87452787 | ready；available；continue；qty 0；NT$88,888 |
| uv | PL／偏光 | `cls-cus-mix-uv-pl-rd` | 71536674 | 87452780 | 87452781 | 87452782 | 87452783 | ready；available；deny；qty 1；NT$89,188 |

color、engraving 與 UV 的 SUN／BL／PL 九個商品及四個尺寸皆已從正式網域 JSON 驗證
為可售。color 與 engraving 的 variants 皆為 `available:true`、
`inventory_policy:deny`、`inventory_quantity:1`；各方案 SUN／BL 售價為 NT$88,888，
PL 為 NT$89,188，已正確加價 NT$300。UV 三個商品維持 ready，UV PL 也維持
NT$89,188。至此已無 live catalog 或價格 blocker。

Loader 仍會在每次加入前讀取最新庫存；任何尺寸之後若變為 unavailable，或在
`inventory_policy:deny` 下數量變為 0，都必須 fail closed，不得繞過，且不得寫入
storage 或呼叫 `/cart/add`。

Loader 每次加入前都會以同源 `/products/{handle}` JSON 核對固定的 product ID、尺寸、
variant ID 與即時可售狀態。任何 mapping 不符或庫存不可售都會 fail closed；它不會
退回 SUN，也不會猜測相似 handle，避免把抗藍光或偏光設計誤加成灰片商品。Checkout
啟動時仍使用靜態 `ALL_CUSTOM_VARIANT_IDS` 識別全部 36 個 variants。

## 上線前不可省略的驗證

1. 上線前重新取得九個商品的 JSON，逐一核對 handle、product ID、四個尺寸 IDs、庫存與
   價格仍與 ready 快照一致。
2. 確認每個 target 商品只有四個尺寸 variants，且 `option1` 精確為 XS／S／M／L。
3. 用假的可售 CYBERBIZ 回應跑 36 組 matrix；每組只能預檢正確 target handle 並 POST 一次。
   另以缺貨 fixture 確認 unavailable／deny／qty 0 時必須零 POST。
4. 再次確認三個 PL 商品的每個偏光尺寸皆可售，且購物車價格為同方案基準價
   `+NT$300`；三個 PL 的 live catalog 目前皆已符合。
5. 在未發布主題中，三個入口各測灰片、抗藍光與偏光。
6. 同一入口、同尺寸先加灰片再加偏光，購物車必須是兩個不同商品 variants，兩筆製作
   備註不可互相認領。
7. 重新整理後備註仍完整；刪除數量 2 的完整 target row 後，等待 React／AJAX 最終
   狀態，對應兩筆 note／records 必須自動清理，且同步期間 checkout 必須 fail closed。
8. 使用 v2 未發布候選檔與固定 SRI 完成未發布主題全套驗收；通過後才能另行安排
   已發布主題替換，既有 20260901 loader 永遠保持不變。

本機測試：

```text
node tests/cyberbiz-cart-size-lens-development-loader.test.js
node tests/cyberbiz-cart-note-sync-v2.test.js
```

測試使用九個實際 catalog mappings，並在記憶體中建立可售 fixture 驗證完整 36 組
matrix；另以不可售 fixture 驗證 fail-closed 與零 POST。所有網路回應都是本機假的，
不會連線或修改真實 CYBERBIZ。第二個 targeted test 另涵蓋 delayed delete、靜態
`window.lineItems` mismatch、最終 note／records pruning、checkout safety 與不猜同
variant 的設計 identity。
