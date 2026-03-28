var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var WEBHOOK_TOKEN = "aseo_wh_5f8efdc75e5ef72eec175cb21cf8480d";
var SITE_BASE = "https://www.craydl.com";
var index_default = {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    const rawBody = await request.text();
    const auth = request.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${WEBHOOK_TOKEN}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const signature = request.headers.get("X-AutoSEO-Signature");
    if (signature) {
      const valid = await verifyHMAC(rawBody, signature, WEBHOOK_TOKEN);
      if (!valid) {
        return jsonResponse({ error: "Invalid signature" }, 401);
      }
    }
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }
    if (payload.event === "test") {
      return jsonResponse({ url: `${SITE_BASE}/test` }, 200);
    }
    const branch = env.GITHUB_BRANCH || "main";
    const ghOpts = {
      token: env.GITHUB_TOKEN,
      repo: env.GITHUB_REPO,
      branch
    };
    try {
      const slug = payload.slug;
      const date = payload.publishedAt ? payload.publishedAt.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      let heroImagePath = null;
      let infographicImagePath = null;
      if (payload.heroImageUrl) {
        heroImagePath = await downloadAndCommitImage(
          ghOpts,
          payload.heroImageUrl,
          `blog/images/${slug}-hero`
        );
      }
      if (payload.infographicImageUrl) {
        infographicImagePath = await downloadAndCommitImage(
          ghOpts,
          payload.infographicImageUrl,
          `blog/images/${slug}-infographic`
        );
      }
      const heroSrc = heroImagePath ? `../../${heroImagePath}` : null;
      const heroAbsolute = heroImagePath ? `${SITE_BASE}/${heroImagePath}` : null;
      const infographicSrc = infographicImagePath ? `../../${infographicImagePath}` : null;
      const html = buildBlogPostHTML({
        title: payload.title,
        body: payload.content_html,
        metaDesc: payload.metaDescription,
        date,
        slug,
        heroImageSrc: heroSrc,
        heroImageAlt: payload.heroImageAlt,
        heroAbsoluteUrl: heroAbsolute,
        infographicSrc,
        faqSchema: payload.faqSchema,
        keywords: payload.metaKeywords,
        lang: payload.languageCode || "en"
      });
      const blogPath = `blog/posts/${slug}.html`;
      await commitFileToGitHub({
        ...ghOpts,
        path: blogPath,
        content: html,
        message: `SEO post [AutoSEO #${payload.id}]: ${payload.title}`
      });
      const excerpt = payload.metaDescription || payload.content_html.replace(/<[^>]*>/g, "").slice(0, 200).trim() + "\u2026";
      await updatePostsManifest(ghOpts, {
        slug,
        title: payload.title,
        date,
        excerpt,
        image: heroAbsolute,
        autoseo_id: payload.id
      });
      await updateAllSitemaps(ghOpts, slug);
      await addSlugToRedirects(ghOpts, slug);
      const publishedUrl = `${SITE_BASE}/blog/posts/${slug}.html`;
      return jsonResponse({ url: publishedUrl }, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Webhook error:", message);
      return jsonResponse(
        { error: "Internal server error", detail: message },
        500
      );
    }
  }
};
async function verifyHMAC(body, signatureHex, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (computed.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return diff === 0;
}
__name(verifyHMAC, "verifyHMAC");
async function downloadAndCommitImage(ghOpts, imageUrl, pathPrefix) {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Image download failed (${res.status}): ${imageUrl}`);
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : contentType.includes("gif") ? ".gif" : ".jpg";
  const filePath = `${pathPrefix}${ext}`;
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  await commitBinaryToGitHub(ghOpts, filePath, b64);
  return filePath;
}
__name(downloadAndCommitImage, "downloadAndCommitImage");
async function commitBinaryToGitHub(ghOpts, path, contentBase64) {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = ghHeaders(ghOpts.token);
  let existingSha;
  const getRes = await fetch(
    `${base}/contents/${path}?ref=${ghOpts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = await getRes.json();
    existingSha = data.sha;
  }
  const body = {
    message: `Add image: ${path}`,
    content: contentBase64,
    branch: ghOpts.branch
  };
  if (existingSha) body.sha = existingSha;
  const putRes = await fetch(`${base}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Image commit ${putRes.status}: ${err}`);
  }
}
__name(commitBinaryToGitHub, "commitBinaryToGitHub");
function buildBlogPostHTML(p) {
  const esc = /* @__PURE__ */ __name((s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"), "esc");
  const escJson = /* @__PURE__ */ __name((s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'), "escJson");
  const canonicalUrl = `${SITE_BASE}/blog/posts/${p.slug}.html`;
  const ogImage = p.heroAbsoluteUrl || `${SITE_BASE}/assets/tour-indianola.png`;
  const faqLD = p.faqSchema && p.faqSchema.length ? `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faqSchema.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer }
    }))
  })}<\/script>` : "";
  const blogPostingLD = `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.metaDesc,
    url: canonicalUrl,
    datePublished: p.date,
    author: {
      "@type": "Person",
      name: "Adam Katz",
      url: `${SITE_BASE}/contact.html`
    },
    publisher: {
      "@type": "Organization",
      name: "CRAYDL",
      url: SITE_BASE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_BASE}/assets/logo-header-dark.png`
      }
    },
    image: ogImage,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl }
  })}<\/script>`;
  const breadcrumbLD = `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_BASE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_BASE}/blog/` },
      { "@type": "ListItem", position: 3, name: p.title, item: canonicalUrl }
    ]
  })}<\/script>`;
  const heroBlock = p.heroImageSrc ? `
      <figure class="blog-hero-image">
        <img src="${esc(p.heroImageSrc)}" alt="${esc(p.heroImageAlt || p.title)}" width="1200" height="630" loading="eager" decoding="async" class="blog-hero-img">
      </figure>` : "";
  const infographicBlock = p.infographicSrc ? `
      <figure class="blog-infographic">
        <img src="${esc(p.infographicSrc)}" alt="Infographic: ${esc(p.title)}" loading="lazy" decoding="async" class="blog-infographic-img">
      </figure>` : "";
  return `<!DOCTYPE html>
<html lang="${p.lang}">
<head>
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"><\/script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "G-XXXXXXXXXX");
  <\/script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.title)} | CRAYDL Blog</title>
  <meta name="description" content="${esc(p.metaDesc)}">${p.keywords ? `
  <meta name="keywords" content="${esc(p.keywords)}">` : ""}
  <link rel="canonical" href="${canonicalUrl}">
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="CRAYDL">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(p.metaDesc)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="520">
  <meta property="article:published_time" content="${p.date}">
  <meta property="article:author" content="Adam Katz">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(p.title)}">
  <meta name="twitter:description" content="${esc(p.metaDesc)}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <!-- Structured Data -->${blogPostingLD}${breadcrumbLD}${faqLD}
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
      <button type="button" class="nav-toggle" aria-label="Toggle menu">\u2630</button>
      <nav class="nav-main" id="nav-main">
        <a href="../../services.html">Services</a>
        <a href="../../contact.html">Contact</a>
        <a href="../index.html">Articles</a>
      </nav>
      <div class="header-right">
        <a href="tel:480-716-5884" class="header-phone">480-716-5884</a>
      </div>
    </div>
  </header>
  <main class="blog-post-main">
    <article class="blog-article container">
      <p class="blog-back"><a href="../index.html">&larr; All posts</a></p>
      <time class="blog-date" datetime="${p.date}">${p.date}</time>
      <h1>${esc(p.title)}</h1>${heroBlock}
      <div class="blog-content wp-content">
${p.body}
      </div>${infographicBlock}
    </article>
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p><a href="../../contact.html">Contact us</a> &middot; &copy; CRAYDL. Virtual Design Construction for custom homes.</p>
        <p class="footer-tagline">See Before Building &middot; Est. 2021</p>
      </div>
    </div>
  </footer>
  <script src="../../js/main.js"><\/script>
  <!-- Start of HubSpot Embed Code -->
  <script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/47055408.js"><\/script>
  <!-- End of HubSpot Embed Code -->
</body>
</html>`;
}
__name(buildBlogPostHTML, "buildBlogPostHTML");
async function updatePostsManifest(ghOpts, newPost) {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = ghHeaders(ghOpts.token);
  const manifestPath = "blog/posts.json";
  let posts = [];
  let existingSha;
  const getRes = await fetch(
    `${base}/contents/${manifestPath}?ref=${ghOpts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = await getRes.json();
    existingSha = data.sha;
    if (data.content) {
      posts = JSON.parse(atob(data.content.replace(/\n/g, "")));
    }
  }
  posts = posts.filter(
    (p) => p.slug !== newPost.slug && !(newPost.autoseo_id && p.autoseo_id === newPost.autoseo_id)
  );
  posts.unshift(newPost);
  posts.sort((a, b) => b.date.localeCompare(a.date));
  const content = JSON.stringify(posts, null, 2);
  const encoded = toBase64(content);
  const body = {
    message: `Update blog manifest: ${newPost.title}`,
    content: encoded,
    branch: ghOpts.branch
  };
  if (existingSha) body.sha = existingSha;
  const putRes = await fetch(`${base}/contents/${manifestPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Manifest update ${putRes.status}: ${err}`);
  }
}
__name(updatePostsManifest, "updatePostsManifest");
async function updateAllSitemaps(ghOpts, newSlug) {
  const newLoc = `${SITE_BASE}/blog/posts/${newSlug}.html`;
  const sitemapPaths = [
    "sitemap.xml",
    "blog/sitemap.xml"
  ];
  for (const sitemapPath of sitemapPaths) {
    await updateSingleSitemap(ghOpts, sitemapPath, newLoc, newSlug);
  }
}
__name(updateAllSitemaps, "updateAllSitemaps");
async function updateSingleSitemap(ghOpts, sitemapPath, newLoc, newSlug) {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = ghHeaders(ghOpts.token);
  let xml = "";
  let existingSha;
  const getRes = await fetch(
    `${base}/contents/${sitemapPath}?ref=${ghOpts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = await getRes.json();
    existingSha = data.sha;
    if (data.content) {
      xml = atob(data.content.replace(/\n/g, ""));
    }
  }
  if (xml.includes(newLoc)) return;
  if (xml) {
    const entry = `  <url><loc>${newLoc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    xml = xml.replace("</urlset>", `${entry}\n</urlset>`);
  } else {
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_BASE}/blog/</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${newLoc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>`;
  }
  const body = {
    message: `Sitemap (${sitemapPath}): add ${newSlug}`,
    content: toBase64(xml),
    branch: ghOpts.branch
  };
  if (existingSha) body.sha = existingSha;
  const putRes = await fetch(`${base}/contents/${sitemapPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Sitemap update ${putRes.status} (${sitemapPath}): ${err}`);
  }
}
__name(updateSingleSitemap, "updateSingleSitemap");
async function addSlugToRedirects(ghOpts, newSlug) {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = ghHeaders(ghOpts.token);
  const redirectsPath = "infra/redirects.js";
  const getRes = await fetch(
    `${base}/contents/${redirectsPath}?ref=${ghOpts.branch}`,
    { headers }
  );
  if (!getRes.ok) {
    throw new Error(`Failed to read redirects.js: ${getRes.status}`);
  }
  const data = await getRes.json();
  const js = atob(data.content.replace(/\n/g, ""));
  if (js.includes(`'${newSlug}'`)) return;
  const marker = "];";
  const slugsEnd = js.indexOf(marker, js.indexOf("var seoSlugs"));
  if (slugsEnd === -1) {
    throw new Error("Could not find seoSlugs array end in redirects.js");
  }
  const updated = js.slice(0, slugsEnd) + `  '${newSlug}',\n` + js.slice(slugsEnd);
  const body = {
    message: `Add redirect slug: ${newSlug}`,
    content: toBase64(updated),
    branch: ghOpts.branch,
    sha: data.sha
  };
  const putRes = await fetch(`${base}/contents/${redirectsPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Redirects update ${putRes.status}: ${err}`);
  }
}
__name(addSlugToRedirects, "addSlugToRedirects");
async function commitFileToGitHub(opts) {
  const base = `https://api.github.com/repos/${opts.repo}`;
  const headers = ghHeaders(opts.token);
  let existingSha;
  const getRes = await fetch(
    `${base}/contents/${opts.path}?ref=${opts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = await getRes.json();
    existingSha = data.sha;
  }
  const body = {
    message: opts.message,
    content: toBase64(opts.content),
    branch: opts.branch
  };
  if (existingSha) body.sha = existingSha;
  const putRes = await fetch(`${base}/contents/${opts.path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub commit ${putRes.status}: ${err}`);
  }
}
__name(commitFileToGitHub, "commitFileToGitHub");
function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "craydl-autoseo-webhook"
  };
}
__name(ghHeaders, "ghHeaders");
function toBase64(text) {
  return btoa(
    new TextEncoder().encode(text).reduce((s, b) => s + String.fromCharCode(b), "")
  );
}
__name(toBase64, "toBase64");
function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
export {
  index_default as default
};
