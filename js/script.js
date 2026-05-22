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
