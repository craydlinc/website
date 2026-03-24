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

  var lightboxDismissSelector = '[data-lightbox-dismiss]';

  function wireImageLightbox(lightboxEl, triggerEl) {
    if (!lightboxEl || !triggerEl) return function () { return false; };

    function openLightbox() {
      lightboxEl.hidden = false;
      lightboxEl.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
      var closeBtn = lightboxEl.querySelector('.image-lightbox__close');
      if (closeBtn) closeBtn.focus();
    }

    function closeLightbox() {
      if (lightboxEl.hidden) return false;
      lightboxEl.hidden = true;
      lightboxEl.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      triggerEl.focus();
      return true;
    }

    triggerEl.addEventListener('click', openLightbox);
    lightboxEl.addEventListener('click', function (e) {
      if (e.target.closest(lightboxDismissSelector)) closeLightbox();
    });

    return closeLightbox;
  }

  var timelineLightbox = document.getElementById('timeline-lightbox');
  var timelineZoomTrigger = document.querySelector('.plan-roadmap__zoom');
  var heroLightbox = document.getElementById('hero-lightbox');
  var heroZoomTrigger = document.querySelector('.hero__zoom');
  var developersLightbox1 = document.getElementById('developers-lightbox-1');
  var developersTrigger1 = document.getElementById('developers-lightbox-trigger-1');
  var developersLightbox2 = document.getElementById('developers-lightbox-2');
  var developersTrigger2 = document.getElementById('developers-lightbox-trigger-2');

  var closeHeroLightbox = wireImageLightbox(heroLightbox, heroZoomTrigger);
  var closeTimelineLightbox = wireImageLightbox(timelineLightbox, timelineZoomTrigger);
  var closeDevelopersLightbox1 = wireImageLightbox(developersLightbox1, developersTrigger1);
  var closeDevelopersLightbox2 = wireImageLightbox(developersLightbox2, developersTrigger2);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (heroLightbox && !heroLightbox.hidden) {
        closeHeroLightbox();
        return;
      }
      if (closeDevelopersLightbox1()) return;
      if (closeDevelopersLightbox2()) return;
      if (closeTimelineLightbox()) return;
      closeNavDropdowns();
    }
  });

  /* Developers page: toggle key drop vs wine wall */
  var optionsToggle = document.getElementById('developers-options-toggle');
  var optionsImg = document.getElementById('developers-options-img');
  var optionsCaption = document.getElementById('developers-options-caption');
  if (optionsToggle && optionsImg) {
    var keyDropSrc = 'assets/developers/key-drop.png';
    var wineSrc = 'assets/developers/winewall-12-29-25.png';
    var keyDropAlt = 'Interior hallway with built-in key drop cabinetry and wood finishes.';
    var wineAlt = 'Interior hallway with glass-enclosed wine wall and warm accent lighting.';
    var showingKeyDrop = true;
    optionsToggle.addEventListener('click', function () {
      showingKeyDrop = !showingKeyDrop;
      if (showingKeyDrop) {
        optionsImg.src = keyDropSrc;
        optionsImg.alt = keyDropAlt;
        optionsToggle.setAttribute('aria-label', 'Key drop cabinetry. Click to show wine wall option.');
        optionsToggle.setAttribute('aria-pressed', 'false');
        if (optionsCaption) optionsCaption.textContent = 'Key drop';
      } else {
        optionsImg.src = wineSrc;
        optionsImg.alt = wineAlt;
        optionsToggle.setAttribute('aria-label', 'Wine wall 12.29.25. Click to return to key drop.');
        optionsToggle.setAttribute('aria-pressed', 'true');
        if (optionsCaption) optionsCaption.textContent = 'Winewall 12.29.25';
      }
    });
  }

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
