// Forward Solutions — minimal scripting
// Scroll-triggered reveals on sections. Everything else is CSS.

(function () {
  'use strict';

  // Mark JS as loaded so reveal styles activate
  document.body.classList.add('js-loaded');

  // Reveal sections as they scroll into view
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );

  // Apply to section heads and major content blocks (skip hero — already animated on load)
  document.querySelectorAll('.section-head, .offering-card, .step, .featured-copy, .featured-visual, .compare-col, .plan-card, .support-copy, .lee-grid, .work-card, .who-list, .tickets-col').forEach((el) => {
    el.classList.add('scroll-reveal');
    observer.observe(el);
  });
})();

/* Nav dropdown — touch & keyboard support (hover handled by CSS) */
(function () {
  var dd = document.querySelector('.nav-dropdown');
  if (!dd) return;
  var trigger = dd.querySelector('.nav-dropdown-trigger');

  // On touch devices, first tap opens the menu instead of navigating.
  var isTouch = window.matchMedia('(hover: none)').matches;
  if (isTouch) {
    trigger.addEventListener('click', function (e) {
      if (!dd.classList.contains('is-open')) {
        e.preventDefault();
        dd.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      // second tap (already open) falls through and navigates to services.html
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) {
        dd.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Keyboard: open on focus-within, close on Escape
  dd.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      dd.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.blur();
    }
  });
})();
