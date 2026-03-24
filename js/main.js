/**
 * CRAYDL - minimal JS for mobile nav and UX
 * Edit or remove as needed.
 */
(function () {
  function closeNavDropdowns() {
    document.querySelectorAll('.nav-dropdown.is-open').forEach(function (d) {
      d.classList.remove('is-open');
      var t = d.querySelector('.nav-dropdown__trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  var navToggle = document.querySelector('.nav-toggle');
  var navMain = document.querySelector('#nav-main');
  if (navToggle && navMain) {
    navToggle.addEventListener('click', function () {
      var open = navMain.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open);
      navToggle.textContent = open ? '✕' : '☰';
      if (!open) closeNavDropdowns();
    });
  }

  document.querySelectorAll('.nav-dropdown__trigger').forEach(function (trigger) {
    var dropdown = trigger.closest('.nav-dropdown');
    if (!dropdown) return;
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!window.matchMedia('(max-width: 768px)').matches) return;
      e.preventDefault();
      var willOpen = !dropdown.classList.contains('is-open');
      closeNavDropdowns();
      if (willOpen) {
        dropdown.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav-dropdown')) return;
    closeNavDropdowns();
  });

  var timelineLightbox = document.getElementById('timeline-lightbox');
  var timelineZoomTrigger = document.querySelector('.plan-roadmap__zoom');
  var lightboxDismissSelector = '[data-lightbox-dismiss]';

  function openTimelineLightbox() {
    if (!timelineLightbox) return;
    timelineLightbox.hidden = false;
    timelineLightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var closeBtn = timelineLightbox.querySelector('.image-lightbox__close');
    if (closeBtn) closeBtn.focus();
  }

  function closeTimelineLightbox() {
    if (!timelineLightbox || timelineLightbox.hidden) return false;
    timelineLightbox.hidden = true;
    timelineLightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (timelineZoomTrigger) timelineZoomTrigger.focus();
    return true;
  }

  if (timelineLightbox && timelineZoomTrigger) {
    timelineZoomTrigger.addEventListener('click', function () {
      openTimelineLightbox();
    });
    timelineLightbox.addEventListener('click', function (e) {
      if (e.target.closest(lightboxDismissSelector)) closeTimelineLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (closeTimelineLightbox()) return;
      closeNavDropdowns();
    }
  });

  /* Contact page: mailto + fallback when no native email app opens */
  var emailUs = document.getElementById('contact-email-us');
  var emailFallback = document.getElementById('email-manual-fallback');
  if (emailUs && emailFallback) {
    var EMAIL = 'hello@craydl.com';
    var fallbackTimer;
    var hideFallback = function () {
      emailFallback.hidden = true;
    };
    var showFallbackIfStillHere = function () {
      if (document.visibilityState === 'visible') {
        emailFallback.hidden = false;
      }
    };

    emailUs.addEventListener('click', function () {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      hideFallback();

      var cancelled = false;
      var cancel = function () {
        cancelled = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('pagehide', cancel);
      };
      var onVis = function () {
        if (document.hidden) cancel();
      };

      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('pagehide', cancel, { once: true });

      fallbackTimer = setTimeout(function () {
        document.removeEventListener('visibilitychange', onVis);
        if (!cancelled) showFallbackIfStillHere();
      }, 2800);
    });

    var dismissBtn = document.getElementById('dismiss-email-fallback');
    if (dismissBtn) dismissBtn.addEventListener('click', hideFallback);

    var copyBtn = document.getElementById('copy-email-address');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(EMAIL).then(function () {
            var t = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(function () {
              copyBtn.textContent = t;
            }, 2000);
          });
        } else {
          window.prompt('Copy this email address:', EMAIL);
        }
      });
    }
  }

  /* In-page anchors from nav: close dropdowns and mobile menu */
  var navMainEl = document.querySelector('#nav-main');
  var navToggleEl = document.querySelector('.nav-toggle');
  document.querySelectorAll('.nav-main a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () {
      closeNavDropdowns();
      if (navMainEl && navMainEl.classList.contains('is-open') && window.matchMedia('(max-width: 768px)').matches) {
        navMainEl.classList.remove('is-open');
        if (navToggleEl) {
          navToggleEl.setAttribute('aria-expanded', 'false');
          navToggleEl.textContent = '☰';
        }
      }
    });
  });

  /* FAQ: open the matching <details> when the URL hash targets its id */
  function openFaqFromHash() {
    var id = window.location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') {
      el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  window.addEventListener('hashchange', openFaqFromHash);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openFaqFromHash);
  } else {
    openFaqFromHash();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#faq-"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    window.setTimeout(function () {
      var el = document.getElementById(id);
      if (el && el.tagName === 'DETAILS') el.open = true;
    }, 0);
  });
})();
