interface Env {
  AUTOSEO_WEBHOOK_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // "owner/repo"
  GITHUB_BRANCH?: string;
}

interface AutoSEOPayload {
  title?: string;
  slug?: string;
  content?: string;
  body?: string;
  meta_description?: string;
  description?: string;
  date?: string;
  image?: string;
  featured_image?: string;
  thumbnail?: string;
  excerpt?: string;
  [key: string]: unknown;
}

interface PostEntry {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string | null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Validate bearer token
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${env.AUTOSEO_WEBHOOK_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: AutoSEOPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const title = payload.title || "Untitled Post";
  const body = payload.content || payload.body || "";
  const metaDesc = payload.meta_description || payload.description || "";
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const image = payload.image || payload.featured_image || payload.thumbnail || null;
  const slug =
    payload.slug ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  // Build excerpt from meta description or first ~200 chars of body text
  const excerpt =
    payload.excerpt ||
    metaDesc ||
    body.replace(/<[^>]*>/g, "").slice(0, 200).trim() + "…";

  const html = buildBlogPostHTML({ title, body, metaDesc, date, slug, image });
  const filePath = `blog/posts/${slug}.html`;
  const branch = env.GITHUB_BRANCH || "main";
  const ghOpts = { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, branch };

  try {
    // 1. Commit the blog post HTML
    await commitFileToGitHub({
      ...ghOpts,
      path: filePath,
      content: html,
      message: `Add blog post: ${title}`,
    });

    // 2. Update posts.json manifest
    await updatePostsManifest(ghOpts, {
      slug,
      title,
      date,
      excerpt,
      image,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "GitHub commit failed", detail: message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, slug, path: filePath }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBlogPostHTML(p: {
  title: string;
  body: string;
  metaDesc: string;
  date: string;
  slug: string;
  image: string | null;
}): string {
  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escaped(p.title)} | CRAYDL Blog</title>
  <meta name="description" content="${escaped(p.metaDesc)}">
  <link rel="canonical" href="https://www.craydl.com/blog/posts/${p.slug}.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escaped(p.title)}">
  <meta property="og:description" content="${escaped(p.metaDesc)}">
  <meta property="og:url" content="https://www.craydl.com/blog/posts/${p.slug}.html">${p.image ? `\n  <meta property="og:image" content="${escaped(p.image)}">` : ""}
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
      <h1>${escaped(p.title)}</h1>
      <div class="blog-content wp-content">
${p.body}
      </div>
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
  <script src="../../js/main.js"></script>
  <!-- Start of HubSpot Embed Code -->
  <script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/47055408.js"></script>
  <!-- End of HubSpot Embed Code -->
</body>
</html>`;
}

async function updatePostsManifest(
  ghOpts: { token: string; repo: string; branch: string },
  newPost: PostEntry
): Promise<void> {
  const base = `https://api.github.com/repos/${ghOpts.repo}`;
  const headers = {
    Authorization: `Bearer ${ghOpts.token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  const manifestPath = "blog/posts.json";

  // Fetch current manifest
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
      const decoded = atob(data.content.replace(/\n/g, ""));
      posts = JSON.parse(decoded) as PostEntry[];
    }
  }

  // Remove existing entry with same slug (update case)
  posts = posts.filter((p) => p.slug !== newPost.slug);

  // Add the new post at the beginning
  posts.unshift(newPost);

  // Sort by date descending
  posts.sort((a, b) => b.date.localeCompare(a.date));

  const content = JSON.stringify(posts, null, 2);
  const encoded = btoa(
    new TextEncoder()
      .encode(content)
      .reduce((s, b) => s + String.fromCharCode(b), "")
  );

  const body: Record<string, string> = {
    message: `Update blog manifest: ${newPost.title}`,
    content: encoded,
    branch: ghOpts.branch,
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const putRes = await fetch(`${base}/contents/${manifestPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub manifest update ${putRes.status}: ${err}`);
  }
}

async function commitFileToGitHub(opts: {
  token: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}): Promise<void> {
  const base = `https://api.github.com/repos/${opts.repo}`;
  const headers = {
    Authorization: `Bearer ${opts.token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Check if file already exists (need its SHA to update)
  let existingSha: string | undefined;
  const getRes = await fetch(
    `${base}/contents/${opts.path}?ref=${opts.branch}`,
    { headers }
  );
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha?: string };
    existingSha = data.sha;
  }

  // Base64-encode content
  const encoded = btoa(
    new TextEncoder()
      .encode(opts.content)
      .reduce((s, b) => s + String.fromCharCode(b), "")
  );

  const body: Record<string, string> = {
    message: opts.message,
    content: encoded,
    branch: opts.branch,
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const putRes = await fetch(`${base}/contents/${opts.path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub API ${putRes.status}: ${err}`);
  }
}
