variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format"
  type        = string
}

variable "webp_quality" {
  description = "WebP compression quality for media pipeline"
  type        = number
  default     = 82
}

variable "audience_widths" {
  description = "JSON map of audience → pixel width for WebP generation"
  type        = string
  default     = "{\"developer\":1920,\"homeowner\":1200,\"builder\":1440,\"owners_representative\":1280}"
}

variable "lambda_memory" {
  description = "Memory (MB) for the media processor Lambda"
  type        = number
  default     = 1024
}

variable "lambda_timeout" {
  description = "Timeout (seconds) for the media processor Lambda"
  type        = number
  default     = 120
}

variable "create_lambda" {
  description = "Set to true after pushing a Docker image to ECR"
  type        = bool
  default     = false
}
