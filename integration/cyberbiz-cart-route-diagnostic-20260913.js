/* Read-only, explicit-query cart-route diagnostic. No POST, storage or telemetry. */
(function eyefansCartRouteDiagnostic() {
  "use strict";
  const origin = "https://www.eyefans.com.tw";
  const handles = ["cls-cus-mix-sun-rd", "cls-cus-mix-laser-sun-rd", "cls-cus-mix-uv-sun-rd"];
  const page = new URL(window.location.href);
  if (page.origin !== origin || page.searchParams.get("eyefans_cart_diagnostic") !== "1"
    || !handles.some(handle => page.pathname === `/products/${handle}`)) return;

  function safePath(url) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== origin) return "[非官網網址，已隱藏]";
      // Omit queries, fragments and cart identifiers; only show route structure.
      return parsed.pathname.split("/").map((part, index, parts) => {
        if (parts[index - 1] === "carts" || /@|%40/i.test(part)) return "[已隱藏]";
        if (handles.includes(part)) return part;
        return part.length > 48 || /\d{6}/.test(part) ? "[已隱藏]" : part;
      }).join("/").slice(0, 180);
    } catch (error) { return "[無有效回傳網址]"; }
  }

  function mount() {
    if (document.getElementById("eyefans-cart-route-diagnostic")) return;
    const panel = document.createElement("section");
    panel.id = "eyefans-cart-route-diagnostic";
    panel.style.cssText = "position:relative;z-index:1000;margin:12px;padding:18px;background:#fff7cf;color:#163f36;border:2px solid #163f36;border-radius:12px;font:16px/1.6 sans-serif;overflow-wrap:anywhere;";
    const title = document.createElement("strong");
    title.textContent = "購物車連線檢查 D1（僅此測試連結顯示）";
    const info = document.createElement("p");
    info.textContent = "不需操作模擬器。不加入商品、不下單、不清除資料。請按下方按鈕，再將結果截圖回傳。";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "檢查購物車連線";
    button.style.cssText = "padding:12px 18px;background:#163f36;color:white;border:0;border-radius:8px;font:inherit;";
    const output = document.createElement("pre");
    output.setAttribute("aria-live", "polite");
    output.style.cssText = "white-space:pre-wrap;font:14px/1.6 monospace;";
    panel.append(title, info, button, output);
    document.body.prepend(panel);
    button.addEventListener("click", async () => {
      button.disabled = true;
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 12000);
      const lines = ["診斷版本：D1", `LINE 識別：${/Line\//i.test(window.navigator.userAgent) ? "是" : "否"}`];
      let phase = "購物車資料";
      output.textContent = "檢查中，最多約 12 秒…";
      try {
        const data = await window.fetch(`${origin}/cart.json`, {
          method: "GET", credentials: "same-origin", headers: { Accept: "application/json" },
          cache: "no-store", redirect: "error", signal: controller.signal
        });
        lines.push(`資料 HTTP：${data.status}`);
        if (data.ok && /^application\/json(?:\s*;|$)/i.test(data.headers.get("content-type") || "")) {
          const payload = await data.json();
          lines.push(`商品列數：${Array.isArray(payload.items) ? payload.items.length : "無效"}`);
          lines.push(`item_count：${Number.isInteger(Number(payload.item_count)) ? Number(payload.item_count) : "無效"}`);
        }
        phase = "購物車路徑";
        const response = await window.fetch(`${origin}/cart`, {
          method: "GET", mode: "same-origin", credentials: "same-origin", headers: { Accept: "text/html" },
          cache: "no-store", redirect: "follow", signal: controller.signal
        });
        lines.push(`路徑 HTTP：${response.status}`);
        lines.push(`最終路徑：${safePath(response.url)}`);
        lines.push(`重新導向標記：${String(response.redirected)}`);
        lines.push(`回應類型：${String(response.type)}`);
        response.body?.cancel?.().catch?.(() => {});
      } catch (error) {
        lines.push(`${phase}：${controller.signal.aborted ? "逾時" : "讀取失敗"}`);
      } finally {
        window.clearTimeout(timer);
        lines.push("本次未加入商品或送出訂單。");
        output.textContent = lines.join("\n");
        button.disabled = false;
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
