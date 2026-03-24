/**
 * Blog index: search + topic filter, content-themed thumbnail accents.
 */
(function () {
  'use strict';

  var list = document.getElementById('blog-index-list');
  if (!list) return;

  var searchInput = document.getElementById('blog-index-search');
  var emptyMsg = document.getElementById('blog-index-empty');
  var countEl = document.getElementById('blog-index-count');
  var filterButtons = document.querySelectorAll('[data-blog-filter]');

  function classifyTopic(title) {
    var t = (title || '').toLowerCase();
    if (/\b(bim|vdc|clash)\b/.test(t)) return 'bim';
    if (/\b(digital twin|twinning|virtual reality)\b/.test(t)) return 'twin';
    if (/pre[-\s]?construction|checklist|feasibility/.test(t)) return 'precon';
    if (/\bai\b|intelligent home|programmatic/.test(t)) return 'tech';
    if (/wildfire|climate|sustainability|connected construction|smart building/.test(t)) return 'outlook';
    return 'general';
  }

  function decorateItems() {
    var items = list.querySelectorAll('.blog-index__item');
    items.forEach(function (item) {
      var titleEl = item.querySelector('.blog-index__title-link');
      var excerptEl = item.querySelector('.blog-index__excerpt');
      var timeEl = item.querySelector('time');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var excerpt = excerptEl ? excerptEl.textContent.trim() : '';
      var when = timeEl ? timeEl.textContent.trim() : '';
      var topic = classifyTopic(title);
      item.setAttribute('data-topic', topic);
      item.setAttribute(
        'data-search',
        (title + ' ' + excerpt + ' ' + when).toLowerCase().replace(/\s+/g, ' ')
      );

      var thumbWrap = item.querySelector('.blog-index__thumb-wrap--empty');
      if (thumbWrap) {
        thumbWrap.classList.add('blog-index__thumb-wrap--themed');
        thumbWrap.classList.add('blog-index__thumb-theme--' + topic);
      }
    });
    return items.length;
  }

  var total = decorateItems();
  if (countEl) countEl.textContent = String(total);

  var activeFilter = 'all';
  var searchQuery = '';

  function matchesFilters(item) {
    if (activeFilter !== 'all' && item.getAttribute('data-topic') !== activeFilter) {
      return false;
    }
    if (!searchQuery) return true;
    var hay = item.getAttribute('data-search') || '';
    return hay.indexOf(searchQuery) !== -1;
  }

  function applyFilters() {
    var visible = 0;
    list.querySelectorAll('.blog-index__item').forEach(function (item) {
      var show = matchesFilters(item);
      item.hidden = !show;
      if (show) visible++;
    });
    if (emptyMsg) emptyMsg.hidden = visible !== 0;
    if (countEl) {
      countEl.textContent =
        visible === total ? String(total) : visible + ' of ' + total;
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = (searchInput.value || '').toLowerCase().trim();
      applyFilters();
    });
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeFilter = btn.getAttribute('data-blog-filter') || 'all';
      filterButtons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('is-active', on);
      });
      applyFilters();
    });
  });

  applyFilters();
})();
