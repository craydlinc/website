/**
 * Persona prompt — asks first-time home page visitors "Which best describes you?"
 * and remembers the answer in a first-party cookie (craydl_persona, 1 year).
 *
 * Returning visitors are redirected to their page by the inline script in
 * index.html <head>. "Other", the close button, Esc, and backdrop clicks store
 * "other" so we never ask again and never redirect.
 *
 * Reset for testing: visit /?persona=reset
 */
(function () {
  'use strict';

  var COOKIE_NAME = 'craydl_persona';
  var COOKIE_DAYS = 365;

  var OPTIONS = [
    { key: 'builder', label: 'Builder', href: 'builders.html' },
    { key: 'homeowner', label: 'Homeowner', href: 'homeowners.html' },
    { key: 'developer', label: 'Developer', href: 'developers.html' },
    { key: 'interior-designer', label: 'Interior Designer', href: 'interior-designers.html' },
    { key: 'architect', label: 'Architect', href: 'architects.html' },
    { key: 'other', label: 'Other', href: null }
  ];

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) +
      ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function track(persona) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'persona_select', { persona: persona });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'PersonaSelect', { persona: persona });
    }
  }

  if (getCookie(COOKIE_NAME)) return;
  if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)) return;

  function build() {
    var lastFocus = document.activeElement;

    var overlay = document.createElement('div');
    overlay.className = 'persona-overlay';
    overlay.innerHTML =
      '<div class="persona-dialog" role="dialog" aria-modal="true" aria-labelledby="persona-title">' +
        '<button type="button" class="persona-close" aria-label="Close">&times;</button>' +
        '<h2 id="persona-title" class="persona-title">Which best describes you?</h2>' +
        '<div class="persona-options"></div>' +
      '</div>';

    var list = overlay.querySelector('.persona-options');
    OPTIONS.forEach(function (opt) {
      var el;
      if (opt.href) {
        el = document.createElement('a');
        el.href = opt.href + window.location.search.replace(/([?&])persona=reset&?/, '$1').replace(/[?&]$/, '');
        el.className = 'btn btn-primary persona-option';
      } else {
        el = document.createElement('button');
        el.type = 'button';
        el.className = 'btn btn-outline persona-option';
      }
      el.textContent = opt.label;
      el.addEventListener('click', function () {
        setCookie(COOKIE_NAME, opt.key, COOKIE_DAYS);
        track(opt.key);
        if (!opt.href) close();
      });
      list.appendChild(el);
    });

    function close() {
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
      document.documentElement.classList.remove('persona-open');
      document.removeEventListener('keydown', onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function dismiss() {
      setCookie(COOKIE_NAME, 'other', COOKIE_DAYS);
      track('dismissed');
      close();
    }

    function onKey(e) {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'Tab') {
        var focusables = overlay.querySelectorAll('a, button');
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    overlay.querySelector('.persona-close').addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    document.documentElement.classList.add('persona-open');
    list.querySelector('.persona-option').focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
