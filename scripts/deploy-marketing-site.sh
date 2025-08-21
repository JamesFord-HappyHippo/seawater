#!/bin/bash
set -e

echo "🌊 Deploying Seawater.io Marketing Site"
echo "======================================="

# Configuration
BUCKET_NAME="seawater-marketing-site"
CLOUDFRONT_DISTRIBUTION_ID="E23KL3LT8HGQ5Q"
SOURCE_DIR="/Users/jamesford/Source/Seawater/src/static-site"
AWS_PROFILE="media-sso"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Deploy to S3
echo "📤 Uploading files to S3 bucket: $BUCKET_NAME"
aws s3 sync "$SOURCE_DIR/" "s3://$BUCKET_NAME" --profile "$AWS_PROFILE" --delete

if [ $? -eq 0 ]; then
    echo "✅ Files uploaded successfully"
else
    echo "❌ S3 upload failed"
    exit 1
fi

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache: $CLOUDFRONT_DISTRIBUTION_ID"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --profile "$AWS_PROFILE" \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

if [ $? -eq 0 ]; then
    echo "✅ Cache invalidation created: $INVALIDATION_ID"
    echo "🌐 Marketing site will be live at:"
    echo "   - https://seawater.io (root domain)"
    echo "   - https://d2lflr2xbvbxzb.cloudfront.net (CloudFront URL)"
    echo ""
    echo "📊 Cache invalidation may take 5-15 minutes to complete"
else
    echo "❌ CloudFront invalidation failed"
    exit 1
fi

echo "🎉 Deployment complete!"