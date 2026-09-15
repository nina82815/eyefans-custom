// Presentation only: never change SVG geometry or the saved design payload.
function initPreviewZoom() {
  const viewer = document.getElementById('viewer');
  const controls = document.getElementById('preview-zoom-controls');
  const minus = controls.querySelector('[data-zoom="out"]');
  const plus = controls.querySelector('[data-zoom="in"]');
  const reset = controls.querySelector('[data-zoom="reset"]');
  const output = document.getElementById('preview-zoom-value');
  let scale = 1, x = 0, y = 0, gesture = null;
  const pointers = new Map();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const local = event => {
    const rect = viewer.getBoundingClientRect();
    return { x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2 };
  };
  function render() {
    const rect = viewer.getBoundingClientRect();
    x = clamp(x, -(scale - 1) * rect.width / 2, (scale - 1) * rect.width / 2);
    y = clamp(y, -(scale - 1) * rect.height / 2, (scale - 1) * rect.height / 2);
    viewer.style.setProperty('--preview-scale', scale);
    viewer.style.setProperty('--preview-x', `${x}px`);
    viewer.style.setProperty('--preview-y', `${y}px`);
    viewer.classList.toggle('is-zoomed', scale > 1);
    viewer.classList.toggle('is-panning', pointers.size > 0 && scale > 1);
    output.textContent = `${Math.round(scale * 100)}%`;
    minus.disabled = scale <= 1;
    plus.disabled = scale >= 3;
  }
  function zoom(next, anchor = {x:0,y:0}) {
    next = clamp(next, 1, 3);
    x = anchor.x - (anchor.x - x) * next / scale;
    y = anchor.y - (anchor.y - y) * next / scale;
    scale = next;
    render();
  }
  function clearGesture() {
    const ids = [...pointers.keys()];
    pointers.clear(); gesture = null;
    ids.forEach(id => { if (viewer.hasPointerCapture(id)) viewer.releasePointerCapture(id); });
  }
  function resetView() { clearGesture(); scale = 1; x = y = 0; render(); }
  function beginGesture() {
    const points = [...pointers.values()];
    if (!points.length) { gesture = null; return; }
    const center = points.length > 1
      ? {x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2} : points[0];
    gesture = { center, x, y, scale, distance: points.length > 1
      ? Math.max(1, Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)) : 0 };
  }
  minus.addEventListener('click', () => zoom(scale - .25));
  plus.addEventListener('click', () => zoom(scale + .25));
  reset.addEventListener('click', resetView);
  viewer.addEventListener('pointerdown', event => {
    if (event.target.closest('#preview-zoom-controls') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (pointers.size >= 2) return;
    pointers.set(event.pointerId, local(event));
    viewer.setPointerCapture(event.pointerId);
    beginGesture(); render();
  });
  viewer.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    event.preventDefault();
    pointers.set(event.pointerId, local(event));
    const points = [...pointers.values()];
    if (points.length === 2 && gesture.distance) {
      const center = {x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
      scale = clamp(gesture.scale * Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y) / gesture.distance, 1, 3);
      x = center.x - (gesture.center.x-gesture.x) * scale / gesture.scale;
      y = center.y - (gesture.center.y-gesture.y) * scale / gesture.scale;
    } else {
      x = gesture.x + points[0].x-gesture.center.x;
      y = gesture.y + points[0].y-gesture.center.y;
    }
    render();
  });
  function finish(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (viewer.hasPointerCapture(event.pointerId)) viewer.releasePointerCapture(event.pointerId);
    beginGesture(); render();
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => viewer.addEventListener(type, finish));
  viewer.addEventListener('dragstart', event => event.preventDefault());
  viewer.addEventListener('keydown', event => {
    if (event.target !== viewer) return;
    if (event.key === '+' || event.key === '=') zoom(scale + .25);
    else if (event.key === '-') zoom(scale - .25);
    else if (event.key === '0' || event.key === 'Home' || event.key === 'Escape') resetView();
    else if (scale > 1 && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      x += event.key === 'ArrowLeft' ? -30 : event.key === 'ArrowRight' ? 30 : 0;
      y += event.key === 'ArrowUp' ? -30 : event.key === 'ArrowDown' ? 30 : 0;
      render();
    } else return;
    event.preventDefault();
  });
  // A different shape/angle starts centered; changing colors preserves zoom.
  ['frame-style-options','view-tabs','render-mode-options'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button && !button.disabled) resetView();
    });
  });
  window.addEventListener('blur', () => { clearGesture(); render(); });
  new ResizeObserver(() => { clearGesture(); render(); }).observe(viewer);
  render();
}
initPreviewZoom();
