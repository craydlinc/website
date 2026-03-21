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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNavDropdowns();
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
})();
