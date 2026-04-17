/**
 * Google Ads conversion tracking (AW-16675398368).
 * Called from CTA onclick handlers. Requires gtag.js to be loaded on the page.
 */
function gtag_report_conversion(url) {
  var callback = function () {
    if (typeof(url) !== 'undefined') {
      window.location = url;
    }
  };
  if (typeof gtag === 'function') {
    gtag('event', 'conversion', {
      'send_to': 'AW-16675398368/hzLvCJex-ecZEODFuY8-',
      'value': 1.0,
      'currency': 'USD',
      'event_callback': callback
    });
  } else if (typeof url !== 'undefined') {
    window.location = url;
  }
  return false;
}
