/**
 * Fetches Substack archive JSON and sets `image` on articles/posts.json entries
 * whose `origin` is `personal`, matching by normalized title.
 *
 * Run from repo root: node scripts/enrich-substack-thumbnails.mjs
 *
 * Optional: SUBSTACK_SUBDOMAIN=craydladam (default)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const POSTS_PATH = path.join(ROOT, 'articles', 'posts.json');
const SUBDOMAIN = process.env.SUBSTACK_SUBDOMAIN || 'craydladam';
const ARCHIVE_BASE = `https://${SUBDOMAIN}.substack.com/api/v1/archive?sort=new`;

function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAllArchivePosts() {
  const all = [];
  const limit = 20;
  for (let offset = 0; offset < 2000; offset += limit) {
    const url = `${ARCHIVE_BASE}&offset=${offset}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Archive fetch failed ${res.status}: ${url}`);
    const chunk = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < limit) break;
  }
  return all;
}

function buildCoverByTitle(archivePosts) {
  const map = new Map();
  for (const p of archivePosts) {
    if (!p || !p.title || !p.cover_image) continue;
    map.set(normalizeTitle(p.title), p.cover_image);
  }
  return map;
}

async function main() {
  const archivePosts = await fetchAllArchivePosts();
  const coverByTitle = buildCoverByTitle(archivePosts);

  const raw = fs.readFileSync(POSTS_PATH, 'utf8');
  const posts = JSON.parse(raw);
  if (!Array.isArray(posts)) throw new Error('posts.json must be an array');

  let matched = 0;
  const missed = [];
  for (const post of posts) {
    if (post.origin !== 'personal') continue;
    const key = normalizeTitle(post.title);
    const url = coverByTitle.get(key);
    if (url) {
      post.image = url;
      matched++;
    } else {
      missed.push(post.title);
    }
  }

  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2) + '\n', 'utf8');
  console.log(`Substack archive posts: ${archivePosts.length}`);
  console.log(`Personal posts matched with cover: ${matched}`);
  if (missed.length) {
    console.log(`No Substack cover match (${missed.length}):`);
    missed.forEach((t) => console.log(' -', t));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
