# AWS media pipeline (GitHub → Lambda → S3 DAM + WebP)

End state when you push code:

| Step | What happens |
|------|----------------|
| 1 | GitHub Actions uploads new/changed files under `Media/` to S3 **staging** (`incoming/`). |
| 2 | S3 triggers a **Lambda** (Node.js + Sharp). |
| 3 | Lambda copies the **original** to the **DAM** bucket (`originals/{relative-path}`). |
| 4 | Lambda writes **four WebP variants** to the **CDN** bucket, one per audience folder. |

Your **deployed site** should not serve `Media/`—only optimized assets from CloudFront (or S3 website) URLs.

## Audience → WebP profile

Aligned with `react/components/AudienceHero.jsx` (four segments + generic). The pipeline outputs **four** WebP trees (generic can reuse one size or you add a fifth profile in Lambda config):

| Audience key | Default max width | Typical use |
|--------------|-------------------|-------------|
| `developer` | 1920px | Desktop / detail |
| `homeowner` | 1200px | Tablet / lifestyle |
| `builder` | 1440px | Pro screens |
| `owners_representative` | 1280px | Reports / decks |

Widths are configurable via Lambda environment variable `AUDIENCE_WIDTHS` (JSON).

## AWS resources (SAM)

See `aws/media-pipeline/sam/template.yaml`:

- **Staging bucket** – GitHub sync target; lifecycle can expire `incoming/` after N days.
- **DAM bucket** – Versioning recommended; originals only.
- **CDN bucket** – Public (via CloudFront) WebP assets: `webp/{audience}/{slug}.webp`.

## GitHub secrets

| Secret | Purpose |
|--------|---------|
| `MEDIA_STAGING_BUCKET` | Staging bucket name (SAM output **StagingBucketName**) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user with `s3:PutObject` on `incoming/*` (workflow default) |
| `AWS_REGION` | e.g. `us-east-1` |

**OIDC (recommended for production):** use `aws-actions/configure-aws-credentials` with `role-to-assume` instead of keys; IAM trust policy for `token.actions.githubusercontent.com` and `s3:PutObject` on the staging bucket ARN.

## “Strip high-res from code”

Two patterns:

1. **Recommended** – Keep `Media/` in git as **source of truth**; configure Netlify/Vercel/FTP deploy to **ignore** `Media/**` so production never ships those bytes.
2. **Aggressive** – After pipeline success, a follow-up workflow removes processed files from `Media/` and opens a PR (must be enabled carefully to avoid data loss).

## Deploy excludes

- **Netlify**: `netlify.toml` → `[build] ignore = "Media"` is not standard; use **build command** that copies site without `Media/`, or set **publish** to a subfolder produced by CI that omits `Media/`.
- **Manual**: rsync / deploy script with `--exclude Media/`.

## One-time setup

```bash
cd aws/media-pipeline/sam
sam build --use-container   # builds Lambda image with Sharp
sam deploy --guided
```

Note the **StagingBucketName** output and set `MEDIA_STAGING_BUCKET` in GitHub.

## Costs

S3 storage + Lambda invocations + CloudFront egress. Staging `incoming/` objects can be deleted after processing via lifecycle rule.
