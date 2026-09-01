# CYBERBIZ 尺寸 × 鏡片未發布候選版 v2（2026-09-01）

候選檔案：`cyberbiz-cart-production-loader-20260901-polarized-v2.js`。

此檔是 v1 polarized candidate 的**新 URL 替換版**。它保留九個商品、36 個 variants
與偏光 `+NT$300` 分流，並修正真實 QA 發現的購物車刪除同步競態。舊的
`cyberbiz-cart-production-loader-20260901.js` 與
`cyberbiz-cart-production-loader-20260901-polarized.js` 都保持 byte-identical；不得以
v2 內容覆寫任一既有 URL。

## v2 同步安全規則

- `/cart.json` 是 variant identity 的唯一即時來源；不以 DOM row 順序猜商品。
- React DOM 必須連續兩次呈現相同 row／quantity 狀態，且 row count 與總數量必須和
  `/cart.json` 一致，才可更新備註與開放結帳。
- 刪除與數量操作會立即 fail closed，並以 `0／150／350／750／1500 ms` bounded retry
  等待 AJAX 最終狀態；新操作會使舊同步 generation 失效。
- 使用者在同步期間點結帳，不能取消「購物車必須已改變」的條件；最終 checkout payload
  也會在尚未驗證時被攔下。
- 刪除整個 variant row 後，才可依 `/cart.json` 的精確 variant ID 同步清除該 row 的
  note 與 records。若同 variant 從數量 2 改成 1，系統無法知道保留哪個設計，必須保持
  blocked，不得猜其中一筆。
- MutationObserver 只監看 cart row／quantity／delete controls；備註與狀態面板的自身
  DOM 寫入不會重新啟動同步，且所有 retries 都有固定上限。
- DOM 穩定檢查會排除明確隱藏的 desktop／mobile duplicate rows，並允許贈品或不可調整
  商品列沒有 quantity input；variant identity 與缺少的數量仍只採信 `/cart.json`。
- `/cart.json` 的 `item_count` 可為行數或總件數，`total_quantity` 可省略；任何不一致、
  malformed JSON 或讀取失敗都保持 fail closed，且不清除 records。
- action intent 在初始 authoritative baseline 尚未建立時不得降級成功；late observer／
  lifecycle 通知則只重新驗證目前精確狀態，避免同一次更新被誤當成第二次待完成操作。
- 非同步驗證結束後只重取並操作仍 connected／enabled 的結帳按鈕；所有一次性 bypass
  都在 `finally` 清除，React 換節點或 theme handler 拋錯也不會放行下一次未驗證操作。

## 未發布主題替換碼

公開 v2 檔案並重新核對 SRI 後，在未發布主題 `theme.liquid` 將 v1 polarized 的
`<script>` 整段替換為：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-cart-production-loader-20260901-polarized-v2.js"
  integrity="sha384-W/OS+aihXUMeAXmMoTfl1y0b6dXSdStyc+LTyNjZsAHt6RXhJsbAaiT1cCb6Q7ks"
  crossorigin="anonymous"
></script>
```

- SHA-256：`00689233056c418e6e421d4923ec2ab20abb739cdb59afe31e5290e02b5b248f`
- SRI：`sha384-W/OS+aihXUMeAXmMoTfl1y0b6dXSdStyc+LTyNjZsAHt6RXhJsbAaiT1cCb6Q7ks`

新舊 loaders 不可並排。儲存未發布主題不等於發布主題；完成下列真實 QA 前不得發布。

## 必測回歸

1. 空購物車開始，在自由配色入口各加偏光、灰片、抗藍光；價格與三筆備註正確。
2. 同一抗藍光 variant 加入兩個不同設計，購物車數量為 2、備註有兩筆 EF 編號。
3. 重新整理後資料仍完整。
4. 刪除整個數量 2 的抗藍光商品列；同步期間結帳按鈕必須 blocked。
5. 最終購物車只剩偏光與灰片，note 及 local records 也只能剩這兩筆；重新整理後仍相同。
6. 對雷雕與 UV 各抽驗三種鏡片，尤其偏光價格與 target product。
7. 最終 checkout serialized payload 只包含當下購物車的已驗證設計資料。

本機 targeted regression：

```text
node tests/cyberbiz-cart-note-sync-v2.test.js
```

測試涵蓋超過舊 350 ms 邊界的延遲刪除、靜態 `window.lineItems` mismatch 復原、整列
records／note pruning、pending checkout fail-closed、同 variant 數量減少不猜 identity，
initial-baseline race、late duplicate lifecycle、fresh checkout node／throw cleanup、gift-like
missing quantity input、hidden responsive duplicates、`item_count` 兩種語意、optional
`total_quantity`、malformed cart JSON，以及 observer 不因自身面板寫入形成循環。
