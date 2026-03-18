output "cloudfront_url" {
  description = "Website URL (CloudFront)"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.website.id
}

output "website_bucket" {
  description = "S3 bucket for static website content"
  value       = aws_s3_bucket.website.id
}

output "staging_bucket" {
  description = "S3 bucket for media staging uploads"
  value       = aws_s3_bucket.staging.id
}

output "dam_bucket" {
  description = "S3 bucket for DAM originals"
  value       = aws_s3_bucket.dam.id
}

output "cdn_bucket" {
  description = "S3 bucket for public WebP assets"
  value       = aws_s3_bucket.cdn.id
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions (set as GitHub secret AWS_ROLE_ARN)"
  value       = aws_iam_role.github_actions.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL for Lambda container image"
  value       = aws_ecr_repository.media_processor.repository_url
}
