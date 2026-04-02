// ---------------------------------------------------------------------------
// AutoSEO Webhook — Cloudflare Pages Function
// Receives article data, downloads images, commits blog post + manifest + sitemap
// ---------------------------------------------------------------------------

const WEBHOOK_TOKEN = "aseo_wh_0dc8e775b03bbf7350a10911bf058a63";
const SITE_BASE = "https://www.craydl.com";

interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // "owner/repo"
  GITHUB_BRANCH?: string;
}

interface AutoSEOPayload {
  event: string;
  id: number;
  title: string;
  slug: string;
  metaDescription: string;
  content_html: string;
  content_markdown: string;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  infographicImageUrl: string | null;
  keywords: string[];
  metaKeywords: string | null;
  faqSchema: Array<{ question: string; answer: string }> | null;
  languageCode: string;
  status: string;
  publishedAt: string;
  updatedAt: string;
  createdAt: string;
}

interface PostEntry {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string | null;
  autoseo_id?: number;
}

type GHOpts = { token: string; repo: string; branch: string };

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Read raw body for HMAC verification
  const rawBody = await request.text();

  // 2. Validate bearer token
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${WEBHOOK_TOKEN}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // 3. Optionally verify HMAC-SHA256 signature
  const signature = request.headers.get("X-AutoSEO-Signature");
  if (signature) {
    const valid = await verifyHMAC(rawBody, signature, WEBHOOK_TOKEN);
    if (!valid) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }
  }

  // 4. Parse payload
  let payload: AutoSEOPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  // 5. Handle test event
  if (payload.event === "test") {
    return jsonResponse({ url: `${SITE_BASE}/test` }, 200);
  }

  const branch = env.GITHUB_BRANCH || "main";
  const ghOpts: GHOpts = {
    token: env.GITHUB_TOKEN,
    repo: env.GITHUB_REPO,
    branch,
  };

  try {
    const slug = payload.slug;
    const date = payload.publishedAt
      ? payload.publishedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    // 6. Download and commit images
    let heroImagePath: string | null = null;
    let infographicImagePath: string | null = null;

    if (payload.heroImageUrl) {
      heroImagePath = await downloadAndCommitImage(
        ghOpts,
        payload.heroImageUrl,
        `articles/images/${slug}-hero`
      );
    }

    if (payload.infographicImageUrl) {
      infographicImagePath = await downloadAndCommitImage(
        ghOpts,
        payload.infographicImageUrl,
        `articles/images/${slug}-infographic`
      );
    }

    // Local image URLs (relative to site root for HTML, absolute for manifest)
    const heroSrc = heroImagePath ? `../../${heroImagePath}` : null;
    const heroAbsolute = heroImagePath
      ? `${SITE_BASE}/${heroImagePath}`
      : null;
    const infographicSrc = infographicImagePath
      ? `../../${infographicImagePath}`
      : null;

    // 7. Build and commit blog post HTML
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
      lang: payload.languageCode || "en",
    });

    const filePath = `articles/posts/${slug}.html`;

    await commitFileToGitHub({
      ...ghOpts,
      path: filePath,
      content: html,
      message: payload.id
        ? `Blog post [AutoSEO #${payload.id}]: ${payload.title}`
        : `Add blog post: ${payload.title}`,
    });

    // 8. Update posts.json manifest (dedup by autoseo_id)
    const excerpt =
      payload.metaDescription ||
      payload.content_html.replace(/<[^>]*>/g, "").slice(0, 200).trim() +
        "\u2026";

    await updatePostsManifest(ghOpts, {
      slug,
      title: payload.title,
      date,
      excerpt,
      image: heroAbsolute,
      autoseo_id: payload.id,
    });

    // 9. Update sitemap
    await updateSitemap(ghOpts, slug);

    // 10. Return published URL
    const publishedUrl = `${SITE_BASE}/articles/posts/${slug}.html`;
    return jsonResponse({ url: publishedUrl }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook error:", message);
    return jsonResponse(
      { error: "Internal server error", detail: message },
      500
    );
  }
};

// ---------------------------------------------------------------------------
// HMAC-SHA256 verification
// ---------------------------------------------------------------------------

async function verifyHMAC(
  body: string,
  signatureHex: string,
  secret: string
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time-ish comparison
  if (computed.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Image download + commit
// ---------------------------------------------------------------------------

async function downloadAndCommitImage(
  ghOpts: GHOpts,
  imageUrl: string,
  pathPrefix: string
): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Image download failed (${res.status}): ${imageUrl}`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("webp")
      ? ".webp"
      : contentType.includes("gif")
        ? ".gif"
        : ".jpg";

  const filePath = `${pathPrefix}${ext}`;
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Base64 encode the binary image
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);

  await commitBinaryToGitHub(ghOpts, filePath, b64);
  return filePath;
}

async function commitBinaryToGitHub(
  ghOpts: GHOpts,
  path: string,
  contentBase64: string
): Promise<void> {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = {
    Authorization: `Bearer ${ghOpts.token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  let existingSha: string | undefined;
  const getRes = await fetch(
    `${base}/contents/${path}?ref=${ghOpts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha?: string };
    existingSha = data.sha;
  }

  const body: Record<string, string> = {
    message: `Add image: ${path}`,
    content: contentBase64,
    branch: ghOpts.branch,
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(`${base}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub image commit ${putRes.status}: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Blog post HTML builder
// ---------------------------------------------------------------------------

function buildBlogPostHTML(p: {
  title: string;
  body: string;
  metaDesc: string;
  date: string;
  slug: string;
  heroImageSrc: string | null;
  heroImageAlt: string | null;
  heroAbsoluteUrl: string | null;
  infographicSrc: string | null;
  faqSchema: Array<{ question: string; answer: string }> | null;
  keywords: string | null;
  lang: string;
}): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const faqLD =
    p.faqSchema && p.faqSchema.length
      ? `\n  <script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: p.faqSchema.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        })}</script>`
      : "";

  const heroBlock = p.heroImageSrc
    ? `\n      <figure class="blog-hero-image">
        <img src="${esc(p.heroImageSrc)}" alt="${esc(p.heroImageAlt || p.title)}" width="1200" height="630" loading="eager" decoding="async" class="blog-hero-img">
      </figure>`
    : "";

  const infographicBlock = p.infographicSrc
    ? `\n      <figure class="blog-infographic">
        <img src="${esc(p.infographicSrc)}" alt="Infographic: ${esc(p.title)}" loading="lazy" decoding="async" class="blog-infographic-img">
      </figure>`
    : "";

  return `<!DOCTYPE html>
<html lang="${p.lang}">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-16675398368"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "AW-16675398368");
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.title)} | CRAYDL Blog</title>
  <meta name="description" content="${esc(p.metaDesc)}">${p.keywords ? `\n  <meta name="keywords" content="${esc(p.keywords)}">` : ""}
  <link rel="canonical" href="${SITE_BASE}/articles/posts/${p.slug}.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(p.metaDesc)}">
  <meta property="og:url" content="${SITE_BASE}/articles/posts/${p.slug}.html">${p.heroAbsoluteUrl ? `\n  <meta property="og:image" content="${esc(p.heroAbsoluteUrl)}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(p.title)}">
  <meta name="twitter:description" content="${esc(p.metaDesc)}">${p.heroAbsoluteUrl ? `\n  <meta name="twitter:image" content="${esc(p.heroAbsoluteUrl)}">` : ""}${faqLD}
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
        <p><a href="../../contact.html">Contact us</a> &middot;  <a href="/privacy-policy">Privacy Policy</a> &middot; &copy; CRAYDL. Virtual Design Construction for custom homes.</p>
        <p class="footer-tagline">See Before Building &middot; Est. 2021</p>
      </div>
    </div>
  </footer>
  <script src="../../js/main.js"></script>
  <!-- Start of HubSpot Embed Code -->
  <script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/47055408.js"></script>
  <!-- End of HubSpot Embed Code -->
  <script src="../../js/utm-persist.js"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Posts manifest (posts.json) — dedup by autoseo_id
// ---------------------------------------------------------------------------

async function updatePostsManifest(
  ghOpts: GHOpts,
  newPost: PostEntry
): Promise<void> {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = ghHeaders(ghOpts.token);
  const manifestPath = "articles/posts.json";

  let posts: PostEntry[] = [];
  let existingSha: string | undefined;

  const getRes = await fetch(
    `${base}/contents/${manifestPath}?ref=${ghOpts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha?: string; content?: string };
    existingSha = data.sha;
    if (data.content) {
      posts = JSON.parse(atob(data.content.replace(/\n/g, ""))) as PostEntry[];
    }
  }

  // Dedup: remove existing entry with same autoseo_id OR same slug
  posts = posts.filter(
    (p) =>
      p.slug !== newPost.slug &&
      !(newPost.autoseo_id && p.autoseo_id === newPost.autoseo_id)
  );

  posts.unshift(newPost);
  posts.sort((a, b) => b.date.localeCompare(a.date));

  const content = JSON.stringify(posts, null, 2);
  const encoded = toBase64(content);

  const body: Record<string, string> = {
    message: `Update blog manifest: ${newPost.title}`,
    content: encoded,
    branch: ghOpts.branch,
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(`${base}/contents/${manifestPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Manifest update ${putRes.status}: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

async function updateSitemap(ghOpts: GHOpts, newSlug: string): Promise<void> {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = ghHeaders(ghOpts.token);
  const sitemapPath = "articles/sitemap.xml";
  const newLoc = `${SITE_BASE}/articles/posts/${newSlug}.html`;

  let xml = "";
  let existingSha: string | undefined;

  const getRes = await fetch(
    `${base}/contents/${sitemapPath}?ref=${ghOpts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha?: string; content?: string };
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
  <url><loc>${SITE_BASE}/articles/</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${newLoc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>`;
  }

  const body: Record<string, string> = {
    message: `Sitemap: add ${newSlug}`,
    content: toBase64(xml),
    branch: ghOpts.branch,
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(`${base}/contents/${sitemapPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Sitemap update ${putRes.status}: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// GitHub file commit (text)
// ---------------------------------------------------------------------------

async function commitFileToGitHub(
  opts: GHOpts & { path: string; content: string; message: string }
): Promise<void> {
  const base = `https://api.github.com/repos/${opts.repo}`;
  const headers = ghHeaders(opts.token);

  let existingSha: string | undefined;
  const getRes = await fetch(
    `${base}/contents/${opts.path}?ref=${opts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha?: string };
    existingSha = data.sha;
  }

  const body: Record<string, string> = {
    message: opts.message,
    content: toBase64(opts.content),
    branch: opts.branch,
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(`${base}/contents/${opts.path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub commit ${putRes.status}: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

function toBase64(text: string): string {
  return btoa(
    new TextEncoder()
      .encode(text)
      .reduce((s, b) => s + String.fromCharCode(b), "")
  );
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
