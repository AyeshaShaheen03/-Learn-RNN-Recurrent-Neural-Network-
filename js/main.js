/* ===========================================================
   main.js — tabs, scroll reveal, shared bootstrap
   =========================================================== */

(function () {
  'use strict';

  // Dispatch a custom event so per-tab scripts know their section is live
  function dispatchAnim(sectionEl) {
    const name = sectionEl.getAttribute('data-anim');
    if (!name) return;
    window.dispatchEvent(new CustomEvent('scene:visible', {
      detail: { name, el: sectionEl }
    }));
  }

  // ---------- TAB SWITCHING ----------
  function setupTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    const indicator = document.querySelector('.tab-indicator');

    function moveIndicator(btn) {
      if (!indicator) return;
      const navRect = btn.parentElement.getBoundingClientRect();
      const r = btn.getBoundingClientRect();
      indicator.style.width = r.width + 'px';
      indicator.style.transform = `translateX(${r.left - navRect.left}px)`;
    }

    function activate(tab) {
      buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      panels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
      const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
      if (btn) moveIndicator(btn);

      // Re-trigger visibility for already-onscreen scenes in the new tab
      requestAnimationFrame(() => {
        document.querySelectorAll('#tab-' + tab + ' .scene').forEach(s => {
          const rect = s.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            s.classList.add('visible');
            dispatchAnim(s);
          }
        });
      });
    }

    buttons.forEach(b => {
      b.addEventListener('click', () => activate(b.dataset.tab));
    });

    // Initial indicator position
    const initial = document.querySelector('.tab-btn.active');
    if (initial) requestAnimationFrame(() => moveIndicator(initial));

    // Keep indicator aligned on resize
    window.addEventListener('resize', () => {
      const active = document.querySelector('.tab-btn.active');
      if (active) moveIndicator(active);
    });
  }

  // ---------- SCROLL REVEAL ----------
  function setupObserver() {
    const opts = { threshold: 0.15 };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          dispatchAnim(e.target);
        }
      });
    }, opts);
    document.querySelectorAll('.scene').forEach(s => io.observe(s));
  }

  // ---------- BOOT ----------
  function boot() {
    setupTabs();
    setupObserver();
    // Signal any listeners that the app is ready
    window.dispatchEvent(new Event('app:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
