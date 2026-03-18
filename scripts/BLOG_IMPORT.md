# Blog import (WordPress → static site)

## What you have

- **`blog/index.html`** – List of all posts (42 as of last import).
- **`blog/posts/*.html`** – Full post HTML migrated from [craydl.com WordPress REST API](https://craydl.com/wp-json/wp/v2/posts).
- **`blog/sitemap.xml`** – URLs for Search Console (`https://www.craydl.com/blog/...`).
- Each post uses **canonical** pointing at the **new** URL on `www.craydl.com` for SEO on the new site.

## Refresh posts (after new articles on WordPress)

1. Download fresh JSON (PowerShell):

   ```powershell
   Invoke-WebRequest -Uri "https://craydl.com/wp-json/wp/v2/posts?per_page=100&page=1" -OutFile "scripts\wp-page1.json" -TimeoutSec 120
   ```

   If you have more than 100 posts, also save `page=2`, merge arrays, or extend the script.

2. Run:

   ```bash
   node scripts/import-blog.mjs
   ```

3. Delete **`scripts/wp-page1.json`** only if you want the script to fetch live (may timeout on some networks).

## SEO after go-live

1. Submit **`https://www.craydl.com/blog/sitemap.xml`** in Google Search Console.
2. Add **301 redirects** from old URLs (e.g. `craydl.com/post-slug/`) to `https://www.craydl.com/blog/posts/post-slug.html` on your host.
3. Optionally remove or noindex duplicate posts on the old WordPress path once the new URLs are indexed.

## Images

Post bodies still reference images on **craydl.com** (WordPress uploads). They will load until you change hosts.

### Blog list thumbnails

- Excerpts decode HTML entities (`’`, `…`) so text reads normally.
- Each row shows an image: first `<img>` from post content when present, else **`assets/blog-thumb-placeholder.svg`**.
- To fill **featured images** from WordPress for all posts (slower, needs API access):

  **PowerShell:** `$env:FETCH_WP_THUMBS='1'; node scripts/import-blog.mjs`
