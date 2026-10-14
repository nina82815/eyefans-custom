// Presentation only: frame the live print layer, never the saved artwork.
(() => {
  const viewer = document.getElementById('viewer');
  const button = document.getElementById('preview-print-detail');
  const slider = document.getElementById('print-detail-slider');
  const range = document.getElementById('print-detail-range');
  const output = document.getElementById('print-detail-percent');
  let detailed = false, previousView = null, pending = 0;
  function fit() {
    pending = 0;
    viewer.dataset.printDetail = String(detailed);
    viewer.classList.toggle('is-print-detail', detailed);
    if (detailed) viewer.style.setProperty('--preview-scale', '1');
    if (detailed) {
      viewer.style.setProperty('--preview-x', '0px');
      viewer.style.setProperty('--preview-y', '0px');
    }
    const label = detailed ? '返回整副預覽' : '放大預覽印刷';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-pressed', String(detailed));
    slider.hidden = !detailed;
    if (!detailed) range.value = '100';
    const percent = Math.max(100, Math.min(200, Number(range.value) || 100));
    const percentLabel = `${percent}%`;
    if (output.textContent !== percentLabel) output.textContent = percentLabel;
    range.setAttribute('aria-valuetext', `特寫 ${percentLabel}`);
    if (!detailed) return;
    const content = [...viewer.querySelectorAll('.uv-print-content, #photo-engravetext')].find(node => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(node).display !== 'none';
    });
    if (!content) return; // Loading geometry/fonts will schedule another fit.
    const print = content.getBoundingClientRect();
    const view = content.closest('.view').getBoundingClientRect();
    const bounds = viewer.getBoundingClientRect();
    const height = Math.max(30, bounds.height - 64);
    const scale = Math.max(1, Math.min(12, bounds.width * .78 / print.width, height * .65 / print.height)) * percent / 100;
    const ox = view.left + view.width / 2, oy = view.top + view.height / 2;
    const x = bounds.left + bounds.width / 2 - ox - (print.left + print.width / 2 - ox) * scale;
    const y = bounds.top + 12 + height / 2 - oy - (print.top + print.height / 2 - oy) * scale;
    viewer.style.setProperty('--preview-scale', String(scale));
    viewer.style.setProperty('--preview-x', `${x}px`);
    viewer.style.setProperty('--preview-y', `${y}px`);
  }
  function schedule() { if (!pending) pending = requestAnimationFrame(fit); }
  range.addEventListener('input', schedule);
  function leave() {
    detailed = false;
    viewer.dataset.printDetail = 'false';
    document.querySelector('[data-zoom="reset"]')?.click();
    if (previousView) document.querySelector(`#view-tabs [data-view="${previousView}"]`)?.click();
    previousView = null;
    fit();
  }
  button.addEventListener('click', () => {
    if (detailed) return leave();
    const active = document.querySelector('#view-tabs [aria-pressed="true"]');
    const original = active?.dataset.view || 'a45';
    if (original === 'front') document.querySelector('#view-tabs [data-view="a45"]')?.click();
    previousView = original;
    document.querySelector('[data-zoom="reset"]')?.click();
    detailed = true;
    fit();
  });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'Escape' && detailed) { event.preventDefault(); leave(); }
  });
  ['frame-style-options','view-tabs','render-mode-options'].forEach(id => {
    document.getElementById(id).addEventListener('click', event => {
      if (!event.target.closest('button')) return;
      detailed = false; previousView = null; viewer.dataset.printDetail = 'false';
      document.querySelector('[data-zoom="reset"]')?.click(); schedule();
    });
  });
  new MutationObserver(records => {
    if (detailed && records.some(r => r.type === 'childList' || r.target.closest?.('.uv-print-content'))) schedule();
  }).observe(viewer, {subtree:true, childList:true, attributes:true, characterData:true});
  new ResizeObserver(() => { if (detailed) schedule(); }).observe(viewer);
  document.fonts?.addEventListener('loadingdone', schedule);
  fit();
})();
