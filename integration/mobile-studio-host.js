/* Optional storefront presentation adapter. Does not read cart or design data.
 * Load with mobile-studio.css simulator release; never move/reload the iframe. */
(() => {
  'use strict';
  const css = document.createElement('style');
  css.textContent = `
    .eyefans-studio-open,.eyefans-studio-close{display:none}
    @media(max-width:980px){
      .eyefans-studio-open{display:block;width:100%;min-height:48px;margin:12px 0;padding:12px;border:0;border-radius:12px;background:#18382f;color:#fffdf8;font:700 16px sans-serif}
      .eyefans-custom-wrap.eyefans-studio-expanded{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100%!important;max-width:none!important;height:100vh!important;height:100dvh!important;margin:0!important;padding:calc(52px + env(safe-area-inset-top,0px)) 0 env(safe-area-inset-bottom,0px)!important;border:0!important;border-radius:0!important;background:#fffdf8;box-sizing:border-box;overflow:hidden!important}
      .eyefans-studio-expanded iframe{display:block!important;width:100%!important;height:100%!important;max-height:none!important;border:0!important}
      .eyefans-studio-expanded .eyefans-studio-close{display:block;position:absolute;top:env(safe-area-inset-top,0px);left:0;width:100%;height:52px;border:0;border-bottom:1px solid #ded8cc;background:#fffdf8;color:#18382f;font:700 15px sans-serif;text-align:left;padding:0 16px}
    }`;
  document.head.append(css);
  function attach() {
    document.querySelectorAll('.eyefans-custom-wrap').forEach(wrap => {
      if (wrap.dataset.mobileStudioReady || !wrap.querySelector('iframe')) return;
      wrap.dataset.mobileStudioReady = '1';
      const open = document.createElement('button');
      const close = document.createElement('button');
      open.type = close.type = 'button';
      open.className = 'eyefans-studio-open';
      close.className = 'eyefans-studio-close';
      open.textContent = '展開設計畫面・邊選邊看';
      close.textContent = '← 返回商品頁（保留本次設計）';
      open.setAttribute('aria-expanded', 'false');
      wrap.before(open); wrap.append(close);
      let active = false, previousOverflow = '';
      function leave() {
        if (!active) return;
        active = false;
        wrap.classList.remove('eyefans-studio-expanded');
        document.body.style.overflow = previousOverflow;
        open.setAttribute('aria-expanded','false');
        open.focus({preventScroll:true});
      }
      open.addEventListener('click', () => {
        if (active) return;
        active = true; previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        wrap.classList.add('eyefans-studio-expanded');
        open.setAttribute('aria-expanded','true'); close.focus({preventScroll:true});
      });
      close.addEventListener('click',leave);
      document.addEventListener('keydown',e => { if(e.key === 'Escape') leave(); });
      const mobile = matchMedia('(max-width:980px)');
      mobile.addEventListener('change', e => { if(!e.matches) leave(); });
    });
  }
  attach();
  new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
})();
