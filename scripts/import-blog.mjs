/**
 * Pull posts from craydl.com WordPress REST API → blog/ HTML for static site.
 * Run: node scripts/import-blog.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');

const BASE = 'https://craydl.com';
const API = `${BASE}/wp-json/wp/v2/posts`;

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Decode &#8217; &#8230; etc. so excerpts read naturally (not double-escaped). */
function decodeHtmlEntities(text) {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/&#(\d+);/g, (_, n) =>
    String.fromCodePoint(parseInt(n, 10))
  );
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
    String.fromCodePoint(parseInt(h, 16))
  );
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    hellip: '…',
    mdash: '—',
    ndash: '–',
  };
  s = s.replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] || m);
  return s;
}

function plainTitle(post) {
  return decodeHtmlEntities(stripTags(post.title?.rendered || 'Untitled'));
}

const CACHE = path.join(__dirname, 'wp-page1.json');

async function fetchAllPosts() {
  if (fs.existsSync(CACHE)) {
    console.log('Using cached', path.basename(CACHE), '(delete to re-fetch from live API)');
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  }
  const all = [];
  let page = 1;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 90000);
  try {
    while (true) {
      const url = `${API}?per_page=100&page=${page}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) break;
      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      all.push(...batch);
      const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
      if (all.length >= total) break;
      page++;
    }
  } finally {
    clearTimeout(t);
  }
  return all;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerptFromPost(post, max = 160) {
  const ex = post.excerpt?.rendered;
  let t = ex
    ? decodeHtmlEntities(stripTags(ex))
    : decodeHtmlEntities(stripTags(post.content?.rendered || ''));
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length > max) {
    const cut = t.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    t = (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut) + '…';
  }
  return t;
}

async function fetchMediaUrl(id) {
  try {
    const r = await fetch(`${BASE}/wp-json/wp/v2/media/${id}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'CRAYDL-blog-migrator/1.0' },
    });
    if (!r.ok) return '';
    const m = await r.json();
    return (
      m.media_details?.sizes?.medium_large?.source_url ||
      m.media_details?.sizes?.large?.source_url ||
      m.media_details?.sizes?.medium?.source_url ||
      m.media_details?.sizes?.thumbnail?.source_url ||
      m.source_url ||
      ''
    );
  } catch {
    return '';
  }
}

function firstImageFromContent(html) {
  if (!html) return '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

async function enrichFeaturedImages(posts) {
  for (const post of posts) {
    post._thumbnail = firstImageFromContent(post.content?.rendered) || '';
  }
  if (process.env.FETCH_WP_THUMBS !== '1') return;
  const needThumb = posts.filter((p) => !p._thumbnail && p.featured_media);
  const ids = [...new Set(needThumb.map((p) => p.featured_media))];
  const mediaCache = new Map();
  for (let i = 0; i < ids.length; i += 12) {
    const chunk = ids.slice(i, i + 12);
    const results = await Promise.all(chunk.map((id) => fetchMediaUrl(id)));
    chunk.forEach((id, j) => mediaCache.set(id, results[j]));
  }
  for (const post of needThumb) {
    const u = mediaCache.get(post.featured_media);
    if (u) post._thumbnail = u;
  }
}

function postShell(title, metaDesc, bodyHtml, canonicalUrl, datePublished, originalUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)} | CRAYDL Blog</title>
  <meta name="description" content="${escHtml(metaDesc)}">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Urbanist:wght@900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../css/style.css">
  <link rel="stylesheet" href="../blog.css">
</head>
<body class="page-blog-post">
  <header class="site-header">
    <div class="container">
      <a href="../../index.html" class="brand-logo" aria-label="CRAYDL home">
        <img src="../../assets/logo-header-dark.png" alt="CRAYDL" width="180" height="60" class="brand-logo__img">
      </a>
      <button type="button" class="nav-toggle" aria-label="Toggle menu">☰</button>
      <nav class="nav-main" id="nav-main">
        <a href="../../services.html">Services</a>
        <a href="../../contact.html">Contact</a>
        <a href="../index.html">Blog</a>
      </nav>
      <div class="header-right">
        <a href="tel:480-716-5884" class="header-phone">480-716-5884</a>
      </div>
    </div>
  </header>
  <main class="blog-post-main">
    <article class="blog-article container">
      <p class="blog-back"><a href="../index.html">← All posts</a></p>
      <time class="blog-date" datetime="${datePublished}">${escHtml(datePublished)}</time>
      <div class="blog-content wp-content">${bodyHtml}</div>
      <p class="blog-source-note">Originally published at <a href="${escHtml(originalUrl)}" rel="noopener">craydl.com</a>.</p>
    </article>
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p><a href="../../contact.html">Contact us</a> · © CRAYDL.</p>
      </div>
    </div>
  </footer>
  <script src="../../js/main.js"></script>
</body>
</html>`;
}

async function main() {
  console.log('Fetching posts from WordPress…');
  const posts = await fetchAllPosts();
  console.log('Found', posts.length, 'posts');
  console.log('Loading featured images…');
  await enrichFeaturedImages(posts);

  fs.mkdirSync(POSTS_DIR, { recursive: true });

  const indexItems = [];

  for (const post of posts) {
    const slug = post.slug;
    const title = plainTitle(post);
    const date = (post.date || '').split('T')[0];
    const originalUrl = post.link || `${BASE}/${slug}/`;
    const newCanonical = `https://www.craydl.com/blog/posts/${slug}.html`;
    const meta = excerptFromPost(post, 155);
    const content = post.content?.rendered || '';

    const html = postShell(title, meta, content, newCanonical, date, originalUrl);
    fs.writeFileSync(path.join(POSTS_DIR, `${slug}.html`), html, 'utf8');

    indexItems.push({
      slug,
      title,
      date,
      excerpt: excerptFromPost(post, 220),
      url: `posts/${slug}.html`,
      thumb: post._thumbnail || '',
    });
  }

  indexItems.sort((a, b) => (a.date < b.date ? 1 : -1));

  const listHtml = indexItems
    .map((p) => {
      const thumbSrc = p.thumb || '../assets/blog-thumb-placeholder.svg';
      const thumb = `            <a href="${escHtml(p.url)}" class="blog-index__thumb-wrap${p.thumb ? '' : ' blog-index__thumb-wrap--placeholder'}" tabindex="-1" aria-hidden="true">
              <img class="blog-index__thumb" src="${escHtml(thumbSrc)}" alt="" width="320" height="180" loading="lazy" decoding="async">
            </a>`;
      return `          <li class="blog-index__item">
${thumb}
            <div class="blog-index__body">
              <a href="${escHtml(p.url)}" class="blog-index__title-link">${escHtml(p.title)}</a>
              <time datetime="${p.date}">${p.date}</time>
              <p class="blog-index__excerpt">${escHtml(p.excerpt)}</p>
            </div>
          </li>`;
    })
    .join('\n');

  const indexPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom Home Building Blog | CRAYDL</title>
  <meta name="description" content="Expert insights on custom home building, BIM, VDC, pre-construction, and luxury residential construction from CRAYDL.">
  <link rel="canonical" href="https://www.craydl.com/blog/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Urbanist:wght@900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="blog.css">
</head>
<body class="page-blog-index">
  <header class="site-header">
    <div class="container">
      <a href="../index.html" class="brand-logo" aria-label="CRAYDL home">
        <img src="../assets/logo-header-dark.png" alt="CRAYDL" width="180" height="60" class="brand-logo__img">
      </a>
      <button type="button" class="nav-toggle" aria-label="Toggle menu">☰</button>
      <nav class="nav-main" id="nav-main">
        <a href="../services.html">Services</a>
        <a href="../contact.html">Contact</a>
        <a href="index.html" aria-current="page">Blog</a>
      </nav>
      <div class="header-right">
        <a href="tel:480-716-5884" class="header-phone">480-716-5884</a>
      </div>
    </div>
  </header>
  <main>
    <section class="section blog-hero">
      <div class="container">
        <p class="eyebrow">Luxury custom home building insights</p>
        <h1>CRAYDL blog</h1>
        <p class="blog-lead">Expert insights on custom home building, BIM, VDC, pre-construction, and luxury residential construction—migrated from our archive for easy reading.</p>
      </div>
    </section>
    <section class="section section--alt">
      <div class="container">
        <ul class="blog-index">
${listHtml}
        </ul>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p><a href="../contact.html">Contact us</a> · © CRAYDL.</p>
      </div>
    </div>
  </footer>
  <script src="../js/main.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexPage, 'utf8');

  const siteBase = 'https://www.craydl.com';
  const locs = [
    `${siteBase}/blog/`,
    ...indexItems.map((p) => `${siteBase}/blog/${p.url}`),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((loc) => `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(BLOG_DIR, 'sitemap.xml'), sitemap, 'utf8');
  console.log('Wrote blog/sitemap.xml');
  console.log('Wrote blog/index.html and', posts.length, 'post pages under blog/posts/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
