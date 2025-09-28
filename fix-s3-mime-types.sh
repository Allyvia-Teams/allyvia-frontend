#!/bin/bash

# S3 MIME Type Fix Script for Allyvia Frontend
# This script fixes MIME types for JavaScript files on the live S3 bucket

echo "🔧 Fixing MIME types for JavaScript files in S3..."
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS CLI not configured or no permissions"
    echo "Please run 'aws configure' first"
    exit 1
fi

# Determine environment
ENVIRONMENT=${1:-dev}
case $ENVIRONMENT in
    "dev"|"development")
        BUCKET="allyvia-dev-frontend"
        CLOUDFRONT_ID="E2SUBFVBSB9DJG"
        ;;
    "staging")
        BUCKET="allyvia-staging-frontend"
        CLOUDFRONT_ID="YOUR_STAGING_CLOUDFRONT_ID"  # Replace with actual ID
        ;;
    "prod"|"production")
        BUCKET="allyvia-prod-frontend"
        CLOUDFRONT_ID="YOUR_PROD_CLOUDFRONT_ID"  # Replace with actual ID
        ;;
    *)
        echo "Usage: $0 [dev|staging|prod]"
        echo "Default: dev"
        exit 1
        ;;
esac

echo "🎯 Environment: $ENVIRONMENT"
echo "📦 S3 Bucket: $BUCKET"
echo "☁️  CloudFront: $CLOUDFRONT_ID"
echo ""

# Check if bucket exists
if ! aws s3 ls "s3://$BUCKET" &> /dev/null; then
    echo "❌ Error: Cannot access S3 bucket '$BUCKET'"
    echo "Please check bucket name and permissions"
    exit 1
fi

echo "🔍 Finding JavaScript files in S3 bucket..."
JS_FILES=$(aws s3 ls "s3://$BUCKET/" --recursive | grep -E '\.(js|mjs)$' | awk '{print $4}')

if [ -z "$JS_FILES" ]; then
    echo "⚠️  No JavaScript files found in bucket"
    exit 0
fi

echo "📝 Found JavaScript files:"
echo "$JS_FILES"
echo ""

echo "🚀 Fixing MIME types for JavaScript files..."

# Fix MIME types for each JavaScript file
echo "$JS_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        echo "   Fixing: $file"
        aws s3 cp "s3://$BUCKET/$file" "s3://$BUCKET/$file" \
            --metadata-directive REPLACE \
            --content-type "application/javascript" \
            --cache-control "max-age=31536000,public,immutable" \
            > /dev/null
    fi
done

echo ""
echo "✅ MIME types fixed for all JavaScript files"
echo ""

echo "🔄 Invalidating CloudFront cache..."
if [ "$CLOUDFRONT_ID" != "YOUR_STAGING_CLOUDFRONT_ID" ] && [ "$CLOUDFRONT_ID" != "YOUR_PROD_CLOUDFRONT_ID" ]; then
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)

    echo "📋 Invalidation created: $INVALIDATION_ID"
    echo "⏳ Cache invalidation in progress (takes 1-5 minutes)"
else
    echo "⚠️  CloudFront ID not configured for $ENVIRONMENT"
    echo "Please update the script with the correct CloudFront distribution ID"
fi

echo ""
echo "🎉 Fix completed!"
echo ""
echo "💡 Next steps:"
echo "   1. Wait 1-5 minutes for CloudFront cache to clear"
echo "   2. Clear your browser cache (Ctrl+Shift+R)"
echo "   3. Test the application"
echo ""
echo "🔗 Test URL: https://app.allyvia.co"