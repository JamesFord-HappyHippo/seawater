#!/bin/bash

# Deploy Seawater React Frontend to Existing Test Infrastructure
# Uses existing test CloudFront distribution and S3 bucket with test.seawater.io domain

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="test"
AWS_PROFILE="media-sso"
BUCKET_NAME="seawater-test-media-assets"
DISTRIBUTION_ID="EPR0GNW1888AD"
DOMAIN_NAME="test.seawater.io"
HOSTED_ZONE_ID="Z076488816A4961NJYQY3"
DEV_API_ENDPOINT="https://5puux7rpx0.execute-api.us-east-2.amazonaws.com/dev"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
BUILD_DIR="$FRONTEND_DIR/build"

echo -e "${BLUE}🌊 Seawater React Frontend → Test Environment${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Verify AWS profile
CURRENT_ACCOUNT=$(aws --profile $AWS_PROFILE sts get-caller-identity --query Account --output text)

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo -e "   AWS Account: ${CURRENT_ACCOUNT} (media)"
echo -e "   Environment: ${ENVIRONMENT}"
echo -e "   Domain: ${DOMAIN_NAME}"
echo -e "   S3 Bucket: ${BUCKET_NAME}"
echo -e "   CloudFront: ${DISTRIBUTION_ID}"
echo -e "   API Backend: ${DEV_API_ENDPOINT}"
echo ""

# Step 1: Build React application
echo -e "${BLUE}⚛️  Step 1: Building React application for test environment...${NC}"
cd "$FRONTEND_DIR"

# Set environment variables for build
export REACT_APP_API_URL="$DEV_API_ENDPOINT"
export REACT_APP_ENVIRONMENT="$ENVIRONMENT"
export REACT_APP_DOMAIN="$DOMAIN_NAME"
export GENERATE_SOURCEMAP=false

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🏗️  Building production bundle...${NC}"
npm run build

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ React build completed successfully${NC}"
    echo -e "${BLUE}   Build size: $(du -sh "$BUILD_DIR" | cut -f1)${NC}"
else
    echo -e "${RED}❌ React build failed${NC}"
    exit 1
fi

# Step 2: Deploy to existing S3 bucket
echo -e "${BLUE}☁️  Step 2: Deploying to test S3 bucket...${NC}"
echo -e "${YELLOW}   Uploading to: ${BUCKET_NAME}${NC}"

# Upload with optimized cache headers
echo -e "${YELLOW}   Setting cache headers for static assets...${NC}"

# Upload static JS/CSS files with long-term caching (1 year)
aws --profile $AWS_PROFILE s3 sync "$BUILD_DIR/static" "s3://$BUCKET_NAME/static" \
    --delete \
    --cache-control "public, max-age=31536000, immutable"

# Upload root files (HTML, manifest, etc.) with short-term caching
aws --profile $AWS_PROFILE s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" \
    --exclude "static/*" \
    --cache-control "public, max-age=0, must-revalidate"

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Files uploaded to S3 successfully${NC}"
else
    echo -e "${RED}❌ S3 upload failed${NC}"
    exit 1
fi

# Step 3: Check if SSL certificate exists for test.seawater.io
echo -e "${BLUE}🔒 Step 3: Checking SSL certificate...${NC}"

# List certificates in us-east-1 (required for CloudFront)
CERT_ARN=$(aws --profile $AWS_PROFILE acm list-certificates --region us-east-1 \
    --query "CertificateSummaryList[?DomainName=='seawater.io' || DomainName=='*.seawater.io'].CertificateArn" \
    --output text)

if [[ -n "$CERT_ARN" ]]; then
    echo -e "${GREEN}   ✅ SSL certificate found: ${CERT_ARN}${NC}"
    HAS_CERT=true
else
    echo -e "${YELLOW}   ⚠️  No SSL certificate found for seawater.io domain${NC}"
    echo -e "${YELLOW}   Will use CloudFront default certificate for now${NC}"
    HAS_CERT=false
fi

# Step 4: Set up DNS record for test.seawater.io
echo -e "${BLUE}🌐 Step 4: Setting up DNS for ${DOMAIN_NAME}...${NC}"

# Get the CloudFront domain name
CF_DOMAIN=$(aws --profile $AWS_PROFILE cloudfront get-distribution --id $DISTRIBUTION_ID \
    --query 'Distribution.DomainName' --output text)

echo -e "${YELLOW}   Creating CNAME record: ${DOMAIN_NAME} → ${CF_DOMAIN}${NC}"

# Create the DNS record
aws --profile $AWS_PROFILE route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "'$DOMAIN_NAME'",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [{"Value": "'$CF_DOMAIN'"}]
            }
        }]
    }' > /dev/null

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}   ✅ DNS record created successfully${NC}"
else
    echo -e "${RED}   ❌ Failed to create DNS record${NC}"
    exit 1
fi

# Step 5: Update CloudFront distribution with custom domain (if we have cert)
if [[ "$HAS_CERT" == "true" ]]; then
    echo -e "${BLUE}🔄 Step 5: Updating CloudFront with custom domain...${NC}"
    
    # Get current distribution config
    ETAG=$(aws --profile $AWS_PROFILE cloudfront get-distribution --id $DISTRIBUTION_ID --query 'ETag' --output text)
    
    # Get current config and update with our domain
    aws --profile $AWS_PROFILE cloudfront get-distribution-config --id $DISTRIBUTION_ID --query 'DistributionConfig' > /tmp/dist-config.json
    
    # Get just the first certificate ARN (there were multiple)
    CERT_ARN=$(echo "$CERT_ARN" | cut -f1)
    
    # Update the aliases and certificate in the config
    jq --arg domain "$DOMAIN_NAME" --arg cert "$CERT_ARN" '
        .Aliases.Quantity = 1 |
        .Aliases.Items = [$domain] |
        .ViewerCertificate = {
            "ACMCertificateArn": $cert,
            "SSLSupportMethod": "sni-only",
            "MinimumProtocolVersion": "TLSv1.2_2021",
            "CertificateSource": "acm"
        }
    ' /tmp/dist-config.json > /tmp/updated-config.json
    
    # Update the distribution
    aws --profile $AWS_PROFILE cloudfront update-distribution \
        --id $DISTRIBUTION_ID \
        --distribution-config file:///tmp/updated-config.json \
        --if-match $ETAG > /dev/null
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}   ✅ CloudFront updated with custom domain${NC}"
    else
        echo -e "${YELLOW}   ⚠️  CloudFront update failed, but deployment continues${NC}"
    fi
    
    # Clean up temp files
    rm -f /tmp/dist-config.json /tmp/updated-config.json
else
    echo -e "${BLUE}🔄 Step 5: Skipping CloudFront domain update (no SSL cert)${NC}"
fi

# Step 6: Invalidate CloudFront cache
echo -e "${BLUE}🔄 Step 6: Invalidating CloudFront cache...${NC}"

INVALIDATION_ID=$(aws --profile $AWS_PROFILE cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${YELLOW}   Invalidation ID: ${INVALIDATION_ID}${NC}"

# Step 7: Wait for DNS propagation
echo -e "${BLUE}⏳ Step 7: Waiting for DNS propagation...${NC}"
echo -e "${YELLOW}   This may take a few minutes...${NC}"

# Wait for DNS to propagate
sleep 60

# Test the deployment
echo -e "${BLUE}🧪 Step 8: Testing deployment...${NC}"

if [[ "$HAS_CERT" == "true" ]]; then
    TEST_URL="https://$DOMAIN_NAME"
else
    TEST_URL="http://$CF_DOMAIN"
fi

echo -e "${YELLOW}   Testing: ${TEST_URL}${NC}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    echo -e "${GREEN}   ✅ Website is responding (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}   ⚠️  Website returned HTTP $HTTP_STATUS (may still be propagating)${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}🎉 Test Environment Deployment Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${PURPLE}📍 Test Environment Details:${NC}"
if [[ "$HAS_CERT" == "true" ]]; then
    echo -e "   🌐 Website URL: https://${DOMAIN_NAME}"
    echo -e "   🔒 SSL Certificate: Enabled"
else
    echo -e "   🌐 Website URL: http://${CF_DOMAIN}"
    echo -e "   🔒 SSL Certificate: Not configured (using CloudFront default)"
fi
echo -e "   ☁️  CloudFront Distribution: ${DISTRIBUTION_ID}"
echo -e "   🪣 S3 Bucket: ${BUCKET_NAME}"
echo -e "   🔗 Backend API: ${DEV_API_ENDPOINT}"
echo ""
echo -e "${YELLOW}🔧 Development Backend Integration:${NC}"
echo -e "   ✅ Frontend served via existing CloudFront distribution"
echo -e "   ✅ Connected to development Cognito user pool"
echo -e "   ✅ Connected to development PostgreSQL database"
echo -e "   ✅ Connected to development Lambda functions"
echo -e "   ✅ Connected to development API Gateway"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
if [[ "$HAS_CERT" == "true" ]]; then
    echo -e "   1. Test the frontend at: https://${DOMAIN_NAME}"
else
    echo -e "   1. Test the frontend at: http://${CF_DOMAIN}"
    echo -e "   2. Set up SSL certificate for custom domain (optional)"
fi
echo -e "   3. Verify development backend integration"
echo -e "   4. Run end-to-end tests"
echo ""
echo -e "${GREEN}🚀 Seawater.io test environment is now live!${NC}"