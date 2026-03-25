/**
 * UTM Persistence — captures UTM params on landing, stores in a 30-day cookie,
 * and pushes them to HubSpot's _hsq tracking so attribution flows into contact records.
 *
 * Include on every page AFTER the HubSpot embed script.
 */
(function () {
  'use strict';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var COOKIE_NAME = 'craydl_utm';
  var COOKIE_DAYS = 30;

  // -- Cookie helpers --------------------------------------------------------

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) +
      ';expires=' + d.toUTCString() +
      ';path=/;SameSite=Lax';
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  // -- Capture UTMs from URL -------------------------------------------------

  function captureUtms() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var hasAny = false;

    UTM_KEYS.forEach(function (key) {
      var val = params.get(key);
      if (val) {
        found[key] = val;
        hasAny = true;
      }
    });

    if (hasAny) {
      // Also store the landing page URL for first-touch attribution
      found._landing = window.location.pathname;
      found._ts = new Date().toISOString();
      setCookie(COOKIE_NAME, JSON.stringify(found), COOKIE_DAYS);
      return found;
    }

    return null;
  }

  // -- Read stored UTMs ------------------------------------------------------

  function getStoredUtms() {
    var raw = getCookie(COOKIE_NAME);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  // -- Push to HubSpot -------------------------------------------------------

  function pushToHubSpot(utms) {
    if (!utms) return;

    window._hsq = window._hsq || [];

    // Identify with UTM properties — HubSpot auto-maps these to contact fields
    // if the corresponding properties exist in HubSpot (they're built-in).
    var identifyProps = {};
    UTM_KEYS.forEach(function (key) {
      if (utms[key]) {
        // HubSpot built-in analytics fields
        identifyProps[key] = utms[key];
      }
    });

    // Track the page view with UTM context
    window._hsq.push(['setPath', window.location.pathname + window.location.search]);
    window._hsq.push(['trackPageView']);
  }

  // -- Expose for other scripts (e.g., custom form handlers) -----------------

  window.craydlUtm = {
    get: getStoredUtms,
    keys: UTM_KEYS
  };

  // -- Init ------------------------------------------------------------------

  var fresh = captureUtms();
  var utms = fresh || getStoredUtms();
  pushToHubSpot(utms);
})();
