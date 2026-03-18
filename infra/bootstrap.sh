#!/usr/bin/env bash
# Bootstrap the S3 backend + DynamoDB lock table for OpenTofu state.
# Run once before the first `tofu init`.
#
# Usage:  ./bootstrap.sh [REGION]
#   REGION defaults to us-east-1

set -euo pipefail

REGION="${1:-us-east-1}"
STATE_BUCKET="craydl-tfstate"
LOCK_TABLE="craydl-tflock"

echo "==> Creating state bucket: ${STATE_BUCKET} (${REGION})"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket \
    --bucket "$STATE_BUCKET" \
    --region "$REGION"
else
  aws s3api create-bucket \
    --bucket "$STATE_BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
fi

aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

aws s3api put-public-access-block \
  --bucket "$STATE_BUCKET" \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

echo "==> Creating DynamoDB lock table: ${LOCK_TABLE} (${REGION})"
aws dynamodb create-table \
  --table-name "$LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" \
  2>/dev/null || echo "    (table already exists)"

echo ""
echo "Done! Now run:"
echo "  cd infra && tofu init && tofu plan"
