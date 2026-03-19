/**
 * Google Business Profile — edit PROFILE and REVIEW here only.
 *
 * profile: Google Maps listing or Business Profile URL (from GBP → links, or browser address bar on your listing).
 * review: “Ask for reviews” / review link (often https://g.page/r/.../review or search.google.com/local/writereview?placeid=…).
 *
 * If review is left empty, “Leave a review” links use the profile URL until you paste the review link.
 */
(function () {
  'use strict';
  var PROFILE = 'https://share.google/x3mnlkSWDH6OtMTFJ';
  var REVIEW = '';

  function apply() {
    var reviewUrl = (REVIEW && String(REVIEW).trim()) ? String(REVIEW).trim() : PROFILE;
    document.querySelectorAll('[data-craydl-google="profile"]').forEach(function (el) {
      el.setAttribute('href', PROFILE);
    });
    document.querySelectorAll('[data-craydl-google="review"]').forEach(function (el) {
      el.setAttribute('href', reviewUrl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
