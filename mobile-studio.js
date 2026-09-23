// Only changes presentation while typing; never mutates saved design data.
(() => {
  const update = () => document.body.classList.toggle('mobile-studio-typing',
    !!document.activeElement?.matches('input[type="text"], input:not([type]), textarea'));
  document.addEventListener('focusin', update);
  document.addEventListener('focusout', () => requestAnimationFrame(update));
})();

// Fit the mobile 2D camera to the artwork rather than its square export canvas.
// Only the viewBox changes: paths, printing coordinates and cart data stay intact.
(() => {
  const viewer = document.getElementById('viewer');
  if (!viewer) return;
  const mobile = matchMedia('(max-width: 980px)');
  const originals = new WeakMap();
  let queued = false;
  function fit() {
    queued = false;
    viewer.querySelectorAll('.view > svg:not(.photo-composite)').forEach(svg => {
      if (!originals.has(svg)) originals.set(svg, svg.getAttribute('viewBox'));
      if (!mobile.matches) {
        svg.setAttribute('viewBox', originals.get(svg));
        return;
      }
      if (viewer.classList.contains('is-photo-mode') || svg.parentElement.hidden) return;
      const bounds = svg.getBBox();
      if (!(bounds.width > 0 && bounds.height > 0)) return;
      const pad = Math.max(bounds.width, bounds.height) * .045;
      svg.setAttribute('viewBox', [bounds.x-pad, bounds.y-pad,
        bounds.width+pad*2, bounds.height+pad*2].join(' '));
    });
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(fit); }
  }
  new MutationObserver(schedule).observe(viewer, {
    childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class']
  });
  mobile.addEventListener('change', schedule);
  schedule();
})();
