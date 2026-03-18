# -----------------------------------------------------------------------------
# ECR repository — stores the Lambda container image
# -----------------------------------------------------------------------------
resource "aws_ecr_repository" "media_processor" {
  name                 = "${local.project}-media-processor"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "media_processor" {
  repository = aws_ecr_repository.media_processor.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# -----------------------------------------------------------------------------
# Lambda function — media processor (container image)
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "media_processor" {
  count         = var.create_lambda ? 1 : 0
  function_name = "${local.project}-media-processor"
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.media_processor.repository_url}:latest"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  environment {
    variables = {
      STAGING_BUCKET  = aws_s3_bucket.staging.id
      DAM_BUCKET      = aws_s3_bucket.dam.id
      CDN_BUCKET      = aws_s3_bucket.cdn.id
      WEBP_QUALITY    = tostring(var.webp_quality)
      AUDIENCE_WIDTHS = var.audience_widths
    }
  }

  # Ignore image_uri changes — CI/CD updates the image separately
  lifecycle {
    ignore_changes = [image_uri]
  }
}

# S3 trigger: staging bucket incoming/ → Lambda
resource "aws_lambda_permission" "s3_invoke" {
  count         = var.create_lambda ? 1 : 0
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.media_processor[0].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.staging.arn
}

resource "aws_s3_bucket_notification" "staging_trigger" {
  count  = var.create_lambda ? 1 : 0
  bucket = aws_s3_bucket.staging.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.media_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "incoming/"
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}
