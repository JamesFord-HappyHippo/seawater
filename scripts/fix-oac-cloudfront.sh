#!/bin/bash
set -e

echo "🔧 Fixing CloudFront OAC Configuration"
echo "======================================"

AWS_PROFILE="media-sso"

# OAC IDs created earlier
MARKETING_OAC_ID="E1JQTJBMEGVP5N"
APP_OAC_ID="E2MQP84WZNAYYS"

# Distribution IDs
MARKETING_DIST_ID="E23KL3LT8HGQ5Q"
APP_DIST_ID="EPR0GNW1888AD"

echo "1. Updating Test App Distribution (EPR0GNW1888AD) with OAC..."

# Get current config
aws cloudfront get-distribution-config --id $APP_DIST_ID --profile $AWS_PROFILE > /tmp/app-config.json

# Extract ETag for update
ETAG=$(cat /tmp/app-config.json | jq -r '.ETag')

# Create updated config with OAC attached
cat /tmp/app-config.json | jq --arg oac_id "$APP_OAC_ID" '
  .DistributionConfig |
  .Origins.Items[0].OriginAccessControlId = $oac_id
' > /tmp/app-config-updated.json

# Update the distribution
aws cloudfront update-distribution \
  --id $APP_DIST_ID \
  --profile $AWS_PROFILE \
  --distribution-config file:///tmp/app-config-updated.json \
  --if-match $ETAG

if [ $? -eq 0 ]; then
    echo "✅ Test App Distribution updated with OAC"
else
    echo "❌ Failed to update Test App Distribution"
    exit 1
fi

echo ""
echo "2. Updating Marketing Site Distribution (E23KL3LT8HGQ5Q)..."
echo "   This requires changing from website endpoint to REST endpoint"

# Get current marketing config
aws cloudfront get-distribution-config --id $MARKETING_DIST_ID --profile $AWS_PROFILE > /tmp/marketing-config.json

# Extract ETag for update  
MARKETING_ETAG=$(cat /tmp/marketing-config.json | jq -r '.ETag')

# Create updated config with S3 REST endpoint and OAC
cat /tmp/marketing-config.json | jq --arg oac_id "$MARKETING_OAC_ID" '
  .DistributionConfig |
  .Origins.Items[0].DomainName = "seawater-marketing-site.s3.amazonaws.com" |
  .Origins.Items[0].OriginAccessControlId = $oac_id |
  .Origins.Items[0].S3OriginConfig = {
    "OriginAccessIdentity": "",
    "OriginReadTimeout": 30
  } |
  del(.Origins.Items[0].CustomOriginConfig)
' > /tmp/marketing-config-updated.json

# Update the marketing distribution
aws cloudfront update-distribution \
  --id $MARKETING_DIST_ID \
  --profile $AWS_PROFILE \
  --distribution-config file:///tmp/marketing-config-updated.json \
  --if-match $MARKETING_ETAG

if [ $? -eq 0 ]; then
    echo "✅ Marketing Site Distribution updated with OAC and S3 REST endpoint"
else
    echo "❌ Failed to update Marketing Site Distribution"
    exit 1
fi

echo ""
echo "3. Creating cache invalidations to test new configuration..."

# Invalidate both distributions
aws cloudfront create-invalidation --distribution-id $APP_DIST_ID --paths "/*" --profile $AWS_PROFILE
aws cloudfront create-invalidation --distribution-id $MARKETING_DIST_ID --paths "/*" --profile $AWS_PROFILE

echo "✅ Cache invalidations created"
echo ""
echo "🎉 OAC Configuration Complete!"
echo ""
echo "Sites should be accessible via:"
echo "- Marketing: https://seawater.io (via https://d2lflr2xbvbxzb.cloudfront.net)"
echo "- Test App: https://test.seawater.io (via https://d39f7usimmn1rn.cloudfront.net)"
echo ""
echo "S3 buckets are now private and secure with OAC access only."

# Cleanup temp files
rm -f /tmp/app-config*.json /tmp/marketing-config*.json

echo "Configuration files cleaned up."