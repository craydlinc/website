/**
 * Pull posts from Substack RSS → static HTML under blog/posts/ and blog/posts.json.
 * Run from repo root: npm run import-substack
 *
 * Default feed: https://craydladam.substack.com/feed
 * Override: SUBSTACK_FEED=https://example.substack.com/feed
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');

const FEED_URL = process.env.SUBSTACK_FEED || 'https://craydladam.substack.com/feed';
const SITE_ORIGIN = 'https://www.craydl.com';
const PUBLICATION_NAME = 'Katz in the Craydl';

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeBasicEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Inner of a tag: CDATA or plain text. */
function unwrapCdata(s) {
  const m = String(s).match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1].trim() : String(s).trim();
}

function tagInner(inner) {
  const t = inner.trim();
  if (t.includes('<![CDATA[')) return unwrapCdata(t);
  return decodeBasicEntities(stripTags(t));
}

function getTagBlock(itemXml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, 'i');
  const m = itemXml.match(re);
  return m ? m[1] : '';
}

function getContentEncoded(itemXml) {
  const m = itemXml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
  return m ? m[1] : '';
}

function getLink(itemXml) {
  const m = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (!m) return '';
  const inner = m[1].trim();
  if (!inner.includes('<')) return decodeBasicEntities(inner);
  return tagInner(inner);
}

function pubDateToIso(pub) {
  const d = new Date(String(pub).trim());
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function sanitizeBodyHtml(html) {
  if (!html) return '';
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return s.trim();
}

function firstImgSrc(html) {
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function excerptFromDescription(descHtml, contentHtml, max = 220) {
  const raw = descHtml || stripTags(contentHtml).slice(0, 500);
  let t = stripTags(raw).replace(/\s+/g, ' ').trim();
  if (t.length > max) {
    const cut = t.slice(0, max - 1);
    const sp = cut.lastIndexOf(' ');
    t = (sp > max * 0.5 ? cut.slice(0, sp) : cut) + '…';
  }
  return t;
}

function slugFromLink(link) {
  try {
    const u = new URL(link);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    return last && /^[a-z0-9-]+$/i.test(last) ? last : 'post';
  } catch {
    return 'post';
  }

}

function parseRssItems(xml) {
  const items = [];
  const chunks = xml.split(/<item[\s>]/i);
  for (let i = 1; i < chunks.length; i++) {
    const end = chunks[i].search(/<\/item>/i);
    const body = end === -1 ? chunks[i] : chunks[i].slice(0, end);
    items.push(body);
  }
  return items;
}

function siteHeaderHtml() {
  return `  <header class="site-header">
    <div class="container">
      <a href="/index.html" class="brand-logo" aria-label="CRAYDL home">
        <img src="/assets/logo-header-dark.png" alt="CRAYDL — Est. 2021" width="180" height="60" class="brand-logo__img">
      </a>
      <button type="button" class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
      <nav class="nav-main" id="nav-main">
        <a href="/services.html">Services</a>
        <div class="nav-dropdown">
          <button type="button" class="nav-dropdown__trigger" aria-expanded="false" aria-controls="nav-virtual-tours-menu" id="nav-virtual-tours-trigger">Virtual tours</button>
          <ul class="nav-dropdown__menu nav-dropdown__menu--caps" id="nav-virtual-tours-menu" role="list">
            <li><a href="/index.html#new-home-tours">New homes</a></li>
            <li><a href="/index.html#remodel-tours">Remodels</a></li>
            <li><a href="/index.html#addition-tours">Additions</a></li>
            <li><a href="/index.html#casita-tours">Casitas/ADUs</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button type="button" class="nav-dropdown__trigger" aria-expanded="false" aria-controls="nav-case-studies-menu" id="nav-case-studies-trigger">Case studies</button>
          <ul class="nav-dropdown__menu" id="nav-case-studies-menu" role="list">
            <li><a href="https://craydl-47055408.hubspotpagebuilder.com/case-studies/the-500000-virtual-first-save-the-mockingbird-estate" target="_blank" rel="noopener noreferrer">The $500K &quot;Virtual First&quot; Save — Mockingbird Estate</a></li>
            <li><a href="https://craydl-47055408.hubspotpagebuilder.com/case-studies/168000dollarinsurancepolicy" target="_blank" rel="noopener noreferrer">The $168,000 Insurance Policy</a></li>
            <li><a href="https://craydl-47055408.hubspotpagebuilder.com/case-studies/salesprocesstoexperience" target="_blank" rel="noopener noreferrer">When The Sales Process Fails To Showcase Experience</a></li>
          </ul>
        </div>
        <a href="/contact.html">Contact</a>
        <a href="/articles/">Blog</a>
      </nav>
      <div class="header-right">
        <a href="tel:480-716-5884" class="header-phone">480-716-5884</a>
        <div class="social-links" role="navigation" aria-label="Social media">
          <a href="https://substack.com/@adamkatz1?utm_campaign=profile&amp;utm_medium=profile-page" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Substack">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FF6719" d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>
          </a>
          <a href="https://www.youtube.com/channel/UCJ7tIfYnrNa63DmVP7Kh2qA" target="_blank" rel="noopener noreferrer" class="social-icon social-icon--youtube" aria-label="YouTube">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
          <a href="https://www.instagram.com/craydlinc/" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig-hdr-sub" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FFDC80"/><stop offset="50%" stop-color="#F56040"/><stop offset="100%" stop-color="#C13584"/></linearGradient></defs><path fill="url(#ig-hdr-sub)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.77 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://www.facebook.com/craydlinc" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#0866FF" d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073c0 5.989 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-2.503 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 3.47h-2.33v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a href="https://share.google/x3mnlkSWDH6OtMTFJ" target="_blank" rel="noopener noreferrer" class="social-icon social-icon--google" aria-label="CRAYDL on Google — Business Profile" data-craydl-google="profile">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </a>
        </div>
      </div>
    </div>
  </header>`;
}

function postPageHtml({
  title,
  metaDesc,
  bodyHtml,
  canonicalUrl,
  datePublished,
  substackUrl,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "G-XXXXXXXXXX");
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)} | CRAYDL Blog</title>
  <meta name="description" content="${escHtml(metaDesc)}">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Urbanist:wght@900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/blog/blog.css">
</head>
<body class="page-blog-post">
${siteHeaderHtml()}
  <main class="blog-post-main">
    <article class="blog-article container">
      <p class="blog-back"><a href="/articles/">← All posts</a></p>
      <h1 class="blog-post-h1">${escHtml(title)}</h1>
      <time class="blog-date" datetime="${escHtml(datePublished)}">${escHtml(datePublished)}</time>
      <div class="blog-content wp-content substack-content">${bodyHtml}</div>
      <p class="blog-source-note">Originally published in <a href="${escHtml(substackUrl)}" rel="noopener noreferrer" target="_blank">${escHtml(PUBLICATION_NAME)}</a> on Substack. Comments and replies live on Substack.</p>
    </article>
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p><a href="/contact.html">Contact us</a> · <a href="https://share.google/x3mnlkSWDH6OtMTFJ" target="_blank" rel="noopener noreferrer" data-craydl-google="profile">Google listing</a> · <a href="https://share.google/x3mnlkSWDH6OtMTFJ" target="_blank" rel="noopener noreferrer" data-craydl-google="review">Review us</a> · © CRAYDL.</p>
      </div>
    </div>
  </footer>
  <script src="/js/main.js"></script>
  <script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/47055408.js"></script>
  <script src="/js/utm-persist.js"></script>
</body>
</html>`;
}

async function main() {
  console.log('Fetching Substack feed:', FEED_URL);
  const res = await fetch(FEED_URL, {
    headers: { 'User-Agent': 'CRAYDL-site-importer/1.0' },
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  const xml = await res.text();

  const itemBlocks = parseRssItems(xml);
  console.log('Parsed', itemBlocks.length, 'items');

  fs.mkdirSync(POSTS_DIR, { recursive: true });

  const indexItems = [];
  const usedSlugs = new Set();

  for (const block of itemBlocks) {
    const titleInner = getTagBlock(block, 'title');
    const title = tagInner(titleInner) || 'Untitled';
    const link = getLink(block);
    if (!link) continue;

    let slug = slugFromLink(link);
    const baseSlug = slug;
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${baseSlug}-${n}`)) n++;
      slug = `${baseSlug}-${n}`;
    }
    usedSlugs.add(slug);

    const pubRaw = tagInner(getTagBlock(block, 'pubDate'));
    const date = pubDateToIso(pubRaw) || new Date().toISOString().slice(0, 10);

    const descInner = getTagBlock(block, 'description');
    const descHtml = unwrapCdata(descInner) || descInner.trim();

    const encodedInner = getContentEncoded(block);
    const contentRaw = encodedInner ? unwrapCdata(encodedInner) : '';

    const bodyHtml = sanitizeBodyHtml(contentRaw || descHtml);
    const excerpt = excerptFromDescription(descHtml, contentRaw || descHtml, 220);
    const metaDesc = excerptFromDescription(descHtml, contentRaw || descHtml, 155);

    const enc = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const image = enc ? enc[1] : firstImgSrc(contentRaw || descHtml) || null;

    const canonicalUrl = `${SITE_ORIGIN}/blog/posts/${slug}.html`;
    const html = postPageHtml({
      title,
      metaDesc,
      bodyHtml,
      canonicalUrl,
      datePublished: date,
      substackUrl: link,
    });

    fs.writeFileSync(path.join(POSTS_DIR, `${slug}.html`), html, 'utf8');

    indexItems.push({
      slug,
      title,
      date,
      excerpt,
      image,
      source: PUBLICATION_NAME,
      substackUrl: link,
    });
  }

  indexItems.sort((a, b) => (a.date < b.date ? 1 : -1));

  fs.writeFileSync(
    path.join(BLOG_DIR, 'posts.json'),
    JSON.stringify(indexItems, null, 2) + '\n',
    'utf8'
  );

  console.log('Wrote', indexItems.length, 'posts to', path.relative(ROOT, POSTS_DIR));
  console.log('Updated blog/posts.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
