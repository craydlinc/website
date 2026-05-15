/**
 * Pull posts from craydl.com WordPress REST API → blog/ HTML for static site.
 * Run: node scripts/import-blog.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'articles');
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
  // Fetch WordPress featured images when no in-content image (skip with SKIP_WP_THUMBS=1).
  if (process.env.SKIP_WP_THUMBS === '1') return;
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

function classifyTopic(title) {
  const t = (title || '').toLowerCase();
  if (/\b(bim|vdc|clash)\b/.test(t)) return 'bim';
  if (/\b(digital twin|twinning|virtual reality)\b/.test(t)) return 'twin';
  if (/pre[-\s]?construction|checklist|feasibility/.test(t)) return 'precon';
  if (/\bai\b|intelligent home|programmatic/.test(t)) return 'tech';
  if (/wildfire|climate|sustainability|connected construction|smart building/.test(t)) return 'outlook';
  return 'general';
}

function postShell(title, metaDesc, bodyHtml, canonicalUrl, datePublished, originalUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-16675398368"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "AW-16675398368");
  </script>
  <!-- Meta Pixel Code -->
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1283271297251297');
  fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=1283271297251297&ev=PageView&noscript=1"
  /></noscript>
  <!-- End Meta Pixel Code -->
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
        <p><a href="../../contact.html">Contact us</a> · <a href="/privacy-policy">Privacy Policy</a> · © CRAYDL.</p>
      </div>
    </div>
  </footer>
  <script src="../../js/main.js"></script>
  <!-- HubSpot -->
  <script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/47055408.js"></script>
  <script src="../../js/utm-persist.js"></script>
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
    const newCanonical = `https://www.craydl.com/articles/posts/${slug}.html`;
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
      const topic = classifyTopic(p.title);
      const thumb = p.thumb
        ? `            <a href="${escHtml(p.url)}" class="blog-index__thumb-wrap" tabindex="-1" aria-hidden="true">
              <img class="blog-index__thumb" src="${escHtml(p.thumb)}" alt="" width="320" height="180" loading="lazy" decoding="async">
            </a>`
        : `            <a href="${escHtml(p.url)}" class="blog-index__thumb-wrap blog-index__thumb-wrap--empty blog-index__thumb-wrap--themed blog-index__thumb-theme--${topic}" aria-hidden="true">
              <span class="blog-index__thumb-fallback">CRAYDL</span>
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
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-16675398368"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "AW-16675398368");
  </script>
  <!-- Meta Pixel Code -->
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1283271297251297');
  fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=1283271297251297&ev=PageView&noscript=1"
  /></noscript>
  <!-- End Meta Pixel Code -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom Home Building Blog | CRAYDL</title>
  <meta name="description" content="Expert insights on custom home building, BIM, VDC, pre-construction, and luxury residential construction from CRAYDL.">
  <link rel="canonical" href="https://www.craydl.com/articles/">
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CRAYDL">
  <meta property="og:title" content="Custom Home Building Blog | CRAYDL">
  <meta property="og:description" content="Expert insights on custom home building, BIM, VDC, pre-construction, and luxury residential construction from CRAYDL.">
  <meta property="og:url" content="https://www.craydl.com/articles/">
  <meta property="og:image" content="https://www.craydl.com/assets/tour-indianola.png">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="520">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Custom Home Building Blog | CRAYDL">
  <meta name="twitter:description" content="Expert insights on custom home building, BIM, VDC, pre-construction, and luxury residential construction from CRAYDL.">
  <meta name="twitter:image" content="https://www.craydl.com/assets/tour-indianola.png">
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
        <div class="nav-dropdown">
          <button type="button" class="nav-dropdown__trigger" aria-expanded="false" aria-controls="nav-case-studies-menu" id="nav-case-studies-trigger">Case studies</button>
          <ul class="nav-dropdown__menu" id="nav-case-studies-menu" role="list">
            <li><a href="https://craydl-47055408.hubspotpagebuilder.com/case-studies/the-500000-virtual-first-save-the-mockingbird-estate" target="_blank" rel="noopener noreferrer">The $500K &quot;Virtual First&quot; Save — Mockingbird Estate</a></li>
            <li><a href="https://craydl-47055408.hubspotpagebuilder.com/case-studies/168000dollarinsurancepolicy" target="_blank" rel="noopener noreferrer">The $168,000 Insurance Policy</a></li>
            <li><a href="https://craydl-47055408.hubspotpagebuilder.com/case-studies/salesprocesstoexperience" target="_blank" rel="noopener noreferrer">When The Sales Process Fails To Showcase Experience</a></li>
          </ul>
        </div>
        <a href="../contact.html">Contact</a>
        <a href="/articles/" aria-current="page">Blog</a>
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
        <p class="blog-lead">Expert insights on custom home building, BIM, VDC, pre-construction, and luxury residential construction. Live articles from craydl.com—including those you route through <a href="https://getautoseo.com/content-history" rel="noopener noreferrer">AutoSEO</a>—are mirrored here whenever you refresh the blog from WordPress (see <code class="blog-lead-code">scripts/import-blog.mjs</code>).</p>
        <p class="text-center mt-lg"><a href="../index.html#faq" class="btn btn-outline">Frequently Asked Questions</a></p>
      </div>
    </section>
    <section class="section section--light">
      <div class="container">
        <div class="blog-index-toolbar">
          <div class="blog-index-toolbar__row">
            <label for="blog-index-search">Search</label>
            <div class="blog-index-search-wrap">
              <input type="search" id="blog-index-search" class="blog-index-search" placeholder="Search titles and excerpts…" autocomplete="off" enterkeyhint="search">
            </div>
            <p class="blog-index-meta" aria-live="polite"><span id="blog-index-count">${indexItems.length}</span> articles</p>
          </div>
          <div class="blog-index-toolbar__row blog-index-filters">
            <span class="visually-hidden" id="blog-filter-label">Filter by topic</span>
            <button type="button" class="blog-index-filter is-active" data-blog-filter="all" aria-pressed="true" aria-describedby="blog-filter-label">All</button>
            <button type="button" class="blog-index-filter" data-blog-filter="bim" aria-pressed="false">BIM &amp; VDC</button>
            <button type="button" class="blog-index-filter" data-blog-filter="twin" aria-pressed="false">Digital twin &amp; VR</button>
            <button type="button" class="blog-index-filter" data-blog-filter="precon" aria-pressed="false">Pre-construction</button>
            <button type="button" class="blog-index-filter" data-blog-filter="tech" aria-pressed="false">Tech &amp; process</button>
            <button type="button" class="blog-index-filter" data-blog-filter="outlook" aria-pressed="false">Market &amp; outlook</button>
            <button type="button" class="blog-index-filter" data-blog-filter="general" aria-pressed="false">Design &amp; stories</button>
          </div>
        </div>
        <p id="blog-index-empty" class="blog-index-empty" hidden>No posts match your search and filters. Try different keywords or choose &ldquo;All.&rdquo;</p>
        <ul class="blog-index" id="blog-index-list">
${listHtml}
        </ul>
        <p class="text-center mt-lg"><a href="../index.html#faq" class="btn btn-outline">Frequently Asked Questions</a></p>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p><a href="../contact.html">Contact us</a> · <a href="https://share.google/x3mnlkSWDH6OtMTFJ" target="_blank" rel="noopener noreferrer" data-craydl-google="profile">Google listing</a> · <a href="https://share.google/x3mnlkSWDH6OtMTFJ" target="_blank" rel="noopener noreferrer" data-craydl-google="review">Review us</a> · <a href="/privacy-policy">Privacy Policy</a> · © CRAYDL.</p>
      </div>
    </div>
  </footer>
  <script src="../js/main.js"></script>
  <script src="blog-index.js"></script>
  <script src="../js/google-business-urls.js"></script>
  <!-- Start of HubSpot Embed Code -->
  <script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/47055408.js"></script>
  <!-- End of HubSpot Embed Code -->
</body>
</html>`;

  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexPage, 'utf8');

  const siteBase = 'https://www.craydl.com';
  const locs = [
    `${siteBase}/articles/`,
    ...indexItems.map((p) => `${siteBase}/articles/${p.url}`),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((loc) => `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(BLOG_DIR, 'sitemap.xml'), sitemap, 'utf8');
  console.log('Wrote articles/sitemap.xml');
  console.log('Wrote articles/index.html and', posts.length, 'post pages under articles/posts/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
