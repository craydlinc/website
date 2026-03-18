# Media (source assets → AWS DAM + CDN)

Place **high-resolution originals** here (PNG, JPEG, TIFF, WebP). On push to GitHub, the [media pipeline](../docs/AWS_MEDIA_PIPELINE.md) can:

1. **Upload originals** to your S3 **DAM** bucket (`dam/originals/…`).
2. **Generate optimized WebP** copies in four audience folders (aligned with HubSpot `customer_type` / `AudienceHero.jsx`):
   - `developer`
   - `homeowner`
   - `builder`
   - `owners_representative`

## Folder layout

```
Media/
  README.md
  your-slug/           # optional: one folder per campaign or page
    hero-source.png    # original (any supported format)
```

Or flat files:

```
Media/
  project-alpha-hero.jpg
```

The pipeline uses the **file basename** (without extension) as the CDN slug, e.g. `hero-source` →  
`…/webp/developer/hero-source.webp`.

## Rules

- **Do not** reference `Media/` paths in production HTML/JS for large images—use your **CDN base URL** + audience-specific WebP after the pipeline runs.
- **Deploy**: Your static host should **exclude** this folder so high-res files are never served from the repo deploy (see `docs/AWS_MEDIA_PIPELINE.md`).
- Very large files: consider [Git LFS](https://git-lfs.github.com/) for `Media/**` so clones stay fast.

## Local preview

For local dev you can keep small placeholders in `images/` or point `VITE_CDN_BASE` / env at the CDN once assets exist.
