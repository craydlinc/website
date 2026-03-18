/**
 * Contact form → hello@craydl.com (FormSubmit).
 * AJAX: thank-you on same page. No-JS: POST redirects to thank-you.html
 */
(function () {
  var form = document.getElementById('contact-form');
  var thanks = document.getElementById('contact-thanks');
  var alt = document.getElementById('contact-form-alt');
  var err = document.getElementById('contact-form-error');
  var submitBtn = document.getElementById('contact-form-submit');
  var nextInput = document.getElementById('contact-form-next');

  if (!form || !thanks) return;

  if (nextInput) {
    var base = window.location.href.replace(/[^/]+$/, '');
    nextInput.value = base + 'thank-you.html';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (err) err.hidden = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    var honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send message';
      }
      return;
    }

    fetch('https://formsubmit.co/ajax/hello@craydl.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: form.name.value,
        email: form.email.value,
        interest: form.interest.value,
        comments: form.comments.value || '(none)',
        _subject: 'CRAYDL website contact',
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var ok =
          data &&
          (data.success === true ||
            data.success === 'true' ||
            data.message === 'Email sent successfully!');
        if (ok) {
          form.setAttribute('hidden', '');
          thanks.removeAttribute('hidden');
          if (alt) alt.style.display = 'none';
          thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
          thanks.focus();
        } else {
          throw new Error('FormSubmit response');
        }
      })
      .catch(function () {
        if (err) err.removeAttribute('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send message';
        }
      });
  });
})();
