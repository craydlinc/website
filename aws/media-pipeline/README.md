# CRAYDL AWS media pipeline

1. **Deploy** the SAM stack (Docker required for `sam build`).

   ```bash
   cd sam
   sam build --use-container
   sam deploy --guided
   ```

2. Copy **StagingBucketName** from stack outputs.

3. In GitHub → Settings → Secrets, add **MEDIA_STAGING_BUCKET** (and configure OIDC role **AWS_ROLE_ARN** — see workflow comments).

4. On each push that touches `Media/**`, Actions uploads to `s3://…/incoming/{commit-sha}/…`. S3 invokes Lambda, which:
   - Stores originals under `dam/…/originals/{sha}/…`
   - Writes WebP under `cdn/…/webp/{audience}/…` for developer, homeowner, builder, owners_representative.

5. Point CloudFront at the CDN bucket for HTTPS; use long cache headers (already set on objects).
