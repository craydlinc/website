/**
 * CRAYDL - minimal JS for mobile nav and UX
 * Edit or remove as needed.
 */
(function () {
  var navToggle = document.querySelector('.nav-toggle');
  var navMain = document.querySelector('#nav-main');
  if (navToggle && navMain) {
    navToggle.addEventListener('click', function () {
      var open = navMain.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open);
      navToggle.textContent = open ? '✕' : '☰';
    });
  }
})();
