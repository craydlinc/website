/**
 * S3-triggered: object created under incoming/{commitSha}/...
 * 1) Copy original to DAM bucket
 * 2) Emit WebP per audience to CDN bucket
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { extname } from 'path';

const s3 = new S3Client({});

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);

const DEFAULT_WIDTHS = {
  developer: 1920,
  homeowner: 1200,
  builder: 1440,
  owners_representative: 1280,
};

function getAudienceWidths() {
  const raw = process.env.AUDIENCE_WIDTHS;
  if (raw) {
    try {
      return { ...DEFAULT_WIDTHS, ...JSON.parse(raw) };
    } catch {
      console.warn('Invalid AUDIENCE_WIDTHS JSON, using defaults');
    }
  }
  return DEFAULT_WIDTHS;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function cdnWebpKey(audience, relativePathWithoutExt) {
  const base = relativePathWithoutExt.replace(/^\/+/, '');
  return `webp/${audience}/${base}.webp`;
}

export async function handler(event) {
  const stagingBucket = process.env.STAGING_BUCKET;
  const damBucket = process.env.DAM_BUCKET;
  const cdnBucket = process.env.CDN_BUCKET;
  const widths = getAudienceWidths();

  if (!stagingBucket || !damBucket || !cdnBucket) {
    throw new Error('Missing STAGING_BUCKET, DAM_BUCKET, or CDN_BUCKET');
  }

  const audiences = Object.keys(widths);

  for (const record of event.Records || []) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const m = key.match(/^incoming\/([^/]+)\/(.+)$/);
    if (!m) {
      console.log('Skip (not incoming/{sha}/...):', key);
      continue;
    }
    const [, commitSha, relativePath] = m;
    if (relativePath.endsWith('/') || relativePath.split('/').pop()?.startsWith('.')) {
      continue;
    }
    const ext = extname(relativePath).toLowerCase();
    if (!IMAGE_EXT.has(ext)) {
      console.log('Skip non-image:', key);
      continue;
    }

    const getRes = await s3.send(
      new GetObjectCommand({ Bucket: stagingBucket, Key: key })
    );
    const body = await streamToBuffer(getRes.Body);

    const damKey = `originals/${commitSha}/${relativePath}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: damBucket,
        Key: damKey,
        Body: body,
        ContentType: getRes.ContentType || 'application/octet-stream',
        Metadata: {
          'source-key': key,
          'git-sha': commitSha,
        },
      })
    );
    console.log('DAM:', damKey);

    const pathNoExt = relativePath.slice(0, -ext.length);

    for (const audience of audiences) {
      const maxW = widths[audience];
      if (!maxW) continue;

      const webpBuffer = await sharp(body)
        .rotate()
        .resize({
          width: maxW,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: Number(process.env.WEBP_QUALITY) || 82, effort: 4 })
        .toBuffer();

      const outKey = cdnWebpKey(audience, pathNoExt);
      await s3.send(
        new PutObjectCommand({
          Bucket: cdnBucket,
          Key: outKey,
          Body: webpBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            audience,
            'max-width': String(maxW),
            'source-sha': commitSha,
            etag: createHash('md5').update(body).digest('hex').slice(0, 8),
          },
        })
      );
      console.log('CDN:', outKey);
    }
  }

  return { ok: true };
}
