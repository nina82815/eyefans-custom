# CYBERBIZ 新舊模擬器分流

新版三個商品使用根目錄模擬器；既有 `customized-*` 商品使用 `/legacy/`，避免新版 UV 功能提前出現在舊商品。

在已發布主題原有的模擬器插入程式中，保留這兩個網址與兩組商品 handle：

```js
const IFRAME_URL = "https://nina82815.github.io/eyefans-custom/";
const LEGACY_IFRAME_URL = "https://nina82815.github.io/eyefans-custom/legacy/";

const MODE_BY_HANDLE = {
  "cls-cus-mix-sun-rd": "color",
  "cls-cus-mix-laser-sun-rd": "engraving",
  "cls-cus-mix-uv-sun-rd": "uv"
};

const ALLOWED_HANDLES = [
  "customized-xs",
  "customized-s",
  "customized-m",
  "customized-l",
  "customized-blg-xs",
  "customized-blg-s",
  "customized-blg-m",
  "customized-blg-l"
];
```

取得 `handle` 後，分流網址：

```js
const mode = MODE_BY_HANDLE[handle];
const isLegacyProduct = ALLOWED_HANDLES.includes(handle);

if (!mode && !isLegacyProduct) return;

const iframeUrl = new URL(
  isLegacyProduct ? LEGACY_IFRAME_URL : IFRAME_URL
);

if (mode) {
  iframeUrl.searchParams.set("mode", mode);
  iframeUrl.searchParams.set("locked", "1");
}
```

其餘建立 `.eyefans-custom-wrap`、插入 iframe 與尺寸設定的程式保持不變。正式購物車 loader 只接受新版根目錄及鎖定的商品模式，因此 `/legacy/` 不會顯示新版加入購物車按鈕。

## 新版三入口的 iframe 自動高度

根目錄模擬器會以可信 `postMessage` 回報內容高度。若要移除 iframe 內層捲軸，請在
未發布主題中、現有購物車 loader 後加入：

```html
<script
  defer
  src="https://nina82815.github.io/eyefans-custom/integration/cyberbiz-customizer-frame-autoheight-20260902.js"
  integrity="sha384-8FH+9sroyapgoZjAtRbYgxvcS8T9To1qOPPWKSarLwjXmbz91pLJJvDM6rloWr+Y"
  crossorigin="anonymous"
></script>
```

這支 helper 只接受三個新版入口、正確 mode／locked iframe、GitHub Pages exact origin
及該 iframe 的 `contentWindow`。完成可信握手後才會覆寫 iframe 的 `height` 與
`max-height`；若載入或握手失敗，原本可捲動的固定高度仍會保留，避免內容遭裁切。
舊版 `/legacy/` 不受影響。詳見
`CYBERBIZ_CUSTOMIZER_FRAME_AUTOHEIGHT_20260902.md`。
