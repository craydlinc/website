terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "craydl-tfstate"
    key            = "website/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "craydl-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "craydl"
      ManagedBy = "opentofu"
    }
  }
}

locals {
  project = "craydl"
}
