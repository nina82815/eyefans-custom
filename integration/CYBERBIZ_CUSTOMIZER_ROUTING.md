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
