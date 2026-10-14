#!/usr/bin/env bash
# Upload a built Vite SPA to its S3 bucket and invalidate CloudFront.
#
# Configured only by env:
#   BUCKET           target bucket name (allyvia-staging-spa | allyvia-prod-spa)
#   DISTRIBUTION_ID  optional CloudFront distribution id; when empty the
#                    invalidation is skipped with a warning
#   DIST_DIR         optional build output directory, default dist
#
# The order is fixed so a browser never loads an index.html whose chunks are
# not yet in the bucket:
#   1. hashed assets/ first, immutable, never deleted (old chunks stay for
#      sessions that still hold the previous index.html)
#   2. everything else except assets/ and *.html, short cache, with --delete
#      (excluded paths are never deleted)
#   3. *.html last, no-cache
#   4. CloudFront invalidation of /*
set -euo pipefail

: "${BUCKET:?BUCKET is required (allyvia-<env>-spa)}"
DIST_DIR="${DIST_DIR:-dist}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-}"

if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "::error::$DIST_DIR/index.html is missing; run the build first."
  exit 1
fi

if grep -rq "localhost:8000" "$DIST_DIR"; then
  echo "::error::The build in $DIST_DIR references localhost:8000:"
  grep -rl "localhost:8000" "$DIST_DIR"
  exit 1
fi

if [ ! -d "$DIST_DIR/assets" ]; then
  echo "::error::$DIST_DIR/assets is missing; the build produced no hashed assets."
  exit 1
fi

echo "Uploading hashed assets to s3://$BUCKET/assets"
aws s3 sync "$DIST_DIR/assets" "s3://$BUCKET/assets" \
  --cache-control "public,max-age=31536000,immutable"

echo "Uploading other static files to s3://$BUCKET"
aws s3 sync "$DIST_DIR" "s3://$BUCKET" \
  --exclude "assets/*" \
  --exclude "*.html" \
  --cache-control "public,max-age=3600" \
  --delete

echo "Uploading HTML to s3://$BUCKET"
aws s3 cp "$DIST_DIR" "s3://$BUCKET" --recursive \
  --exclude "*" \
  --include "*.html" \
  --content-type text/html \
  --cache-control "no-cache,no-store,must-revalidate"

if [ -n "$DISTRIBUTION_ID" ]; then
  invalidation_id="$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)"
  echo "invalidation $invalidation_id created on $DISTRIBUTION_ID"
else
  echo "::warning::CloudFront invalidation skipped: no distribution id set (CloudFront is pending account verification). Set the repository variable once the distribution exists."
fi

echo "deployed $DIST_DIR to s3://$BUCKET"
