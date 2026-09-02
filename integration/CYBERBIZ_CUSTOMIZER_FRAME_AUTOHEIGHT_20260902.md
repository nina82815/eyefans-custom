# CYBERBIZ 模擬器自動高度（2026-09-02）

## 目的

- 三種入口各自顯示適合的頂部小字：
  - 自由配色：`自由配色・即時預覽`
  - 姓名雷雕：`自由配色・英文雷雕預覽`
  - UV 彩印：`自由配色・UV 彩印預覽`
- 讓新版模擬器依實際內容高度展開，移除 iframe 內層捲軸。
- 商店頁本身仍正常上下捲動；長內容不會被裁切。
- 舊版 `/legacy/` 保持原狀。

## 未發布主題安裝碼

放在現有正式購物車 loader 的 `</script>` 後、頁尾 `</body>` 前：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-customizer-frame-autoheight-20260902.js"
  integrity="sha384-8FH+9sroyapgoZjAtRbYgxvcS8T9To1qOPPWKSarLwjXmbz91pLJJvDM6rloWr+Y"
  crossorigin="anonymous"
></script>
```

- SHA-256：`c57162812b8627a21bc1095cb5d70276e8d6751b8f6ce03ecba943d8e97d9234`
- SRI：`sha384-8FH+9sroyapgoZjAtRbYgxvcS8T9To1qOPPWKSarLwjXmbz91pLJJvDM6rloWr+Y`

不要只設定 `scrolling="no"`、`height:auto` 或 `overflow:hidden`；跨網域 iframe 不會
因此取得內容高度，單獨使用會裁切選項。helper 會驗證來源、iframe 身分、模式和高度
範圍後才套用 inline height；未握手時保留原本捲軸作為 fallback。

## 驗收

1. 在未發布主題強制重新整理三個入口。
2. 確認頂部小字分別符合自由配色／英文雷雕／UV 彩印。
3. 確認模擬器右側不再出現獨立捲軸，改由整個商品頁捲動。
4. UV 模式依序切換「圖案＋名字／只要圖案／只要名字／不加印刷」，確認 iframe 能變長也能縮短。
5. 以桌機與手機寬度確認最下方「確認設計並加入購物車」完整可見。
6. 再確認三種模式各加入一件商品，購物車內容與 EF 客製備註不受影響。

若需回滾，只移除上述 auto-height `<script>`；模擬器會恢復原本固定高度與內層捲動，
不影響購物車 loader。
