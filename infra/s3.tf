# -----------------------------------------------------------------------------
# Website bucket — static HTML/CSS/JS served via CloudFront
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "website" {
  bucket_prefix = "${local.project}-website-"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.website.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
        }
      }
    }]
  })
}

# -----------------------------------------------------------------------------
# Staging bucket — Media/ uploads land here; Lambda triggers on incoming/
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "staging" {
  bucket_prefix = "${local.project}-staging-"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "staging" {
  bucket = aws_s3_bucket.staging.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "staging" {
  bucket = aws_s3_bucket.staging.id
  rule {
    id     = "expire-incoming"
    status = "Enabled"
    filter {
      prefix = "incoming/"
    }
    expiration {
      days = 90
    }
  }
}

# -----------------------------------------------------------------------------
# DAM bucket — versioned, encrypted, private originals
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "dam" {
  bucket_prefix = "${local.project}-dam-"
}

resource "aws_s3_bucket_versioning" "dam" {
  bucket = aws_s3_bucket.dam.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dam" {
  bucket = aws_s3_bucket.dam.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "dam" {
  bucket                  = aws_s3_bucket.dam.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# CDN bucket — public WebP assets
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "cdn" {
  bucket_prefix = "${local.project}-cdn-"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cdn" {
  bucket = aws_s3_bucket.cdn.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cdn" {
  bucket                  = aws_s3_bucket.cdn.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "cdn" {
  bucket = aws_s3_bucket.cdn.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_policy" "cdn" {
  bucket = aws_s3_bucket.cdn.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadWebp"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.cdn.arn}/webp/*"
    }]
  })
}
