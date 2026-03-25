/**
 * Blog index: loads posts from posts.json, renders cards with thumbnails,
 * search by title/content, and topic filtering.
 */
(function () {
  'use strict';

  var list = document.getElementById('blog-index-list');
  if (!list) return;

  var searchInput = document.getElementById('blog-index-search');
  var emptyMsg = document.getElementById('blog-index-empty');
  var loadingMsg = document.getElementById('blog-index-loading');
  var countEl = document.getElementById('blog-index-count');
  var filterButtons = document.querySelectorAll('[data-blog-filter]');

  var activeFilter = 'all';
  var searchQuery = '';
  var totalPosts = 0;

  var postsJsonUrl =
    window.location.protocol === 'file:'
      ? 'posts.json'
      : '/blog/posts.json';

  function monthKey(isoDate) {
    return (isoDate || '').slice(0, 7);
  }

  function monthHeadingLabel(isoDate) {
    var d = new Date((isoDate || '') + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return d
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      .toUpperCase();
  }

  function formatListDate(isoDate) {
    var d = new Date((isoDate || '') + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return isoDate || '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function classifyTopic(title) {
    var t = (title || '').toLowerCase();
    if (/\b(bim|vdc|clash)\b/.test(t)) return 'bim';
    if (/\b(digital twin|twinning|virtual reality)\b/.test(t)) return 'twin';
    if (/pre[-\s]?construction|checklist|feasibility/.test(t)) return 'precon';
    if (/\bai\b|intelligent home|programmatic/.test(t)) return 'tech';
    if (/wildfire|climate|sustainability|connected construction|smart building/.test(t)) return 'outlook';
    return 'general';
  }

  function escapeHTML(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderPost(post) {
    var topic = classifyTopic(post.title);
    var li = document.createElement('li');
    li.className = 'blog-index__item';
    li.setAttribute('data-topic', topic);
    li.setAttribute('data-search',
      (post.title + ' ' + (post.excerpt || '')).toLowerCase().replace(/\s+/g, ' ')
    );

    var thumbHTML;
    if (post.image) {
      thumbHTML =
        '<a href="posts/' + post.slug + '.html" class="blog-index__thumb-wrap" tabindex="-1" aria-hidden="true">' +
          '<img class="blog-index__thumb" src="' + escapeHTML(post.image) + '" alt="" width="320" height="180" loading="lazy" decoding="async">' +
        '</a>';
    } else {
      thumbHTML =
        '<a href="posts/' + post.slug + '.html" class="blog-index__thumb-wrap blog-index__thumb-wrap--empty blog-index__thumb-wrap--themed blog-index__thumb-theme--' + topic + '" aria-hidden="true">' +
          '<span class="blog-index__thumb-fallback">CRAYDL</span>' +
        '</a>';
    }

    var sourceLine = post.source
      ? '<p class="blog-index__source">' + escapeHTML(post.source) + '</p>'
      : '';

    li.innerHTML =
      thumbHTML +
      '<div class="blog-index__body">' +
        '<a href="posts/' + post.slug + '.html" class="blog-index__title-link">' + escapeHTML(post.title) + '</a>' +
        '<time datetime="' + post.date + '">' + escapeHTML(formatListDate(post.date)) + '</time>' +
        sourceLine +
        '<p class="blog-index__excerpt">' + escapeHTML(post.excerpt || '') + '</p>' +
      '</div>';

    return li;
  }

  function matchesFilters(item) {
    if (activeFilter !== 'all' && item.getAttribute('data-topic') !== activeFilter) {
      return false;
    }
    if (!searchQuery) return true;
    var hay = item.getAttribute('data-search') || '';
    var words = searchQuery.split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      if (words[i] && hay.indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  function applyFilters() {
    var visible = 0;
    var items = list.querySelectorAll('.blog-index__item');
    items.forEach(function (item) {
      var show = matchesFilters(item);
      item.hidden = !show;
      if (show) visible++;
    });
    list.querySelectorAll('.blog-index__month').forEach(function (header) {
      var el = header.nextElementSibling;
      var any = false;
      while (el && el.classList && !el.classList.contains('blog-index__month')) {
        if (el.classList.contains('blog-index__item') && !el.hidden) any = true;
        el = el.nextElementSibling;
      }
      header.hidden = !any;
    });
    if (emptyMsg) emptyMsg.hidden = visible !== 0;
    if (countEl) {
      countEl.textContent =
        visible === totalPosts ? String(totalPosts) : visible + ' of ' + totalPosts;
    }
  }

  function loadPosts() {
    fetch(postsJsonUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load posts.json');
        return res.json();
      })
      .then(function (posts) {
        if (loadingMsg) loadingMsg.hidden = true;

        // Sort by date descending
        posts.sort(function (a, b) {
          return b.date.localeCompare(a.date);
        });

        var frag = document.createDocumentFragment();
        var lastMonth = '';
        posts.forEach(function (post) {
          var mk = monthKey(post.date);
          if (mk && mk !== lastMonth) {
            lastMonth = mk;
            var mh = document.createElement('li');
            mh.className = 'blog-index__month';
            mh.setAttribute('role', 'presentation');
            mh.innerHTML = '<span class="blog-index__month-label">' + escapeHTML(monthHeadingLabel(post.date)) + '</span>';
            frag.appendChild(mh);
          }
          frag.appendChild(renderPost(post));
        });
        list.appendChild(frag);

        totalPosts = posts.length;
        if (countEl) countEl.textContent = String(totalPosts);
        applyFilters();
      })
      .catch(function (err) {
        if (loadingMsg) loadingMsg.textContent = 'Unable to load posts. Please try refreshing.';
        console.error('Blog index load error:', err);
      });
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = (searchInput.value || '').toLowerCase().trim();
      applyFilters();
    });
  }

  // Topic filters
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

  loadPosts();
})();
