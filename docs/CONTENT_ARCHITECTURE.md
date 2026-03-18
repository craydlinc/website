# CRAYDL: Where content lives

## 1. Lead magnets (email-gated assets)

**Store in HubSpot**

- PDFs, checklists, guides, and other “trade your email” assets → **HubSpot File Manager** (or **Marketing → Files and URLs**).
- Gate them with **HubSpot forms** or **CTAs** so submissions create/update contacts and trigger workflows.
- **Do not** put gated lead-magnet files only in your JS repo; the repo should link to HubSpot-hosted URLs or embed HubSpot forms.

## 2. Website code & UI images

**Store in your JavaScript repo**

- Application code (React/Next.js/etc.), components, and **small UI images** (icons, favicon) live in **git**.
- **Large marketing / hero photography** → **`Media/`** in the repo. On push, the **AWS media pipeline** (see `docs/AWS_MEDIA_PIPELINE.md`) uploads originals to S3 (DAM), generates **WebP** for four audiences (`developer`, `homeowner`, `builder`, `owners_representative`), and you reference the **CDN URLs** in HTML/React—not the raw `Media/` paths on the live site.

## 3. Social media assets

**HubSpot Social + File Manager**

- Images/videos for **scheduled social posts** → upload in **HubSpot File Manager**, then attach via **Marketing → Social**.
- Keeps campaign assets versioned in HubSpot with publishing workflow; the website repo does not need duplicate copies of those campaign files.

---

## Personalized hero (React + secure API)

The `react/components/AudienceHero.jsx` component:

1. Detects the **HubSpot tracking cookie** (`hubspotutk`).
2. Calls **`/api/get-hubspot-contact`** on **your server only** (never expose HubSpot Private App tokens in the browser).
3. Renders hero copy based on a HubSpot contact property (e.g. `customer_type`): `developer`, `homeowner`, `builder`, `owners_representative`, or `generic`.

See `react/api/get-hubspot-contact.example.mjs` for a serverless pattern and required env vars.
