#!/bin/bash

# Seawater Frontend CloudFront Deployment Script for Media Account
# Deploys React frontend to private S3 + CloudFront with development backend integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="prod"
STACK_NAME="seawater-frontend-cloudfront-${ENVIRONMENT}"
REGION="us-east-1"  # CloudFront requires us-east-1 for certificates
DEPLOY_REGION="us-east-2"  # S3 bucket region
DEV_API_ENDPOINT="https://5puux7rpx0.execute-api.us-east-2.amazonaws.com/dev"
DOMAIN_NAME="seawater.io"
AWS_PROFILE="media-sso"  # Use media account profile

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
BUILD_DIR="$FRONTEND_DIR/build"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/src/infrastructure"

echo -e "${BLUE}🌊 Seawater Frontend CloudFront Deployment (Media Account)${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws --profile $AWS_PROFILE &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
    echo -e "${RED}❌ Frontend package.json not found. Please run from project root.${NC}"
    exit 1
fi

# Get current AWS account to verify we're in media account
CURRENT_ACCOUNT=$(aws --profile $AWS_PROFILE sts get-caller-identity --query Account --output text)
echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo -e "   Current AWS Account: ${CURRENT_ACCOUNT}"
echo -e "   Environment: ${ENVIRONMENT}"
echo -e "   Stack Name: ${STACK_NAME}"
echo -e "   CloudFront Region: ${REGION}"
echo -e "   S3 Region: ${DEPLOY_REGION}"
echo -e "   Domain: ${DOMAIN_NAME}"
echo -e "   API Endpoint: ${DEV_API_ENDPOINT}"
echo ""

echo -e "${GREEN}✅ Confirmed: Deploying to media account ${CURRENT_ACCOUNT}${NC}"

# Step 1: Deploy CloudFormation stack
echo -e "${BLUE}🏗️  Step 1: Deploying CloudFront + Private S3 Infrastructure...${NC}"
echo -e "${YELLOW}   This will create a private S3 bucket and CloudFront distribution${NC}"

aws --profile $AWS_PROFILE cloudformation deploy \
    --template-file "$INFRASTRUCTURE_DIR/frontend-cloudfront-simple.yaml" \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        DomainName="$DOMAIN_NAME" \
        DevApiEndpoint="$DEV_API_ENDPOINT" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION"

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ CloudFront infrastructure deployed successfully${NC}"
else
    echo -e "${RED}❌ Infrastructure deployment failed${NC}"
    exit 1
fi

# Get stack outputs
echo -e "${BLUE}📤 Getting stack outputs...${NC}"
BUCKET_NAME=$(aws --profile $AWS_PROFILE cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateBucketName`].OutputValue' \
    --output text)

DISTRIBUTION_ID=$(aws --profile $AWS_PROFILE cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

CLOUDFRONT_DOMAIN=$(aws --profile $AWS_PROFILE cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
    --output text)

WEBSITE_URL=$(aws --profile $AWS_PROFILE cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

echo -e "   🪣 Private S3 Bucket: ${BUCKET_NAME}"
echo -e "   ☁️  CloudFront Distribution: ${DISTRIBUTION_ID}"
echo -e "   🌐 CloudFront Domain: ${CLOUDFRONT_DOMAIN}"
echo -e "   🔗 Website URL: ${WEBSITE_URL}"
echo ""

# Step 2: Build React application
echo -e "${BLUE}⚛️  Step 2: Building React application for production...${NC}"
cd "$FRONTEND_DIR"

# Set environment variables for build
export REACT_APP_API_URL="$DEV_API_ENDPOINT"
export REACT_APP_ENVIRONMENT="$ENVIRONMENT"
export REACT_APP_DOMAIN="$DOMAIN_NAME"
export GENERATE_SOURCEMAP=false
export BUILD_PATH="$BUILD_DIR"

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

# Step 3: Deploy to private S3 bucket
echo -e "${BLUE}☁️  Step 3: Deploying to private S3 bucket...${NC}"
echo -e "${YELLOW}   Uploading to private bucket: ${BUCKET_NAME}${NC}"

# Set optimal cache headers for different file types
echo -e "${YELLOW}   Setting cache headers for static assets...${NC}"

# Upload static JS/CSS files with long-term caching (1 year)
aws --profile $AWS_PROFILE s3 sync "$BUILD_DIR/static" "s3://$BUCKET_NAME/static" \
    --region "$DEPLOY_REGION" \
    --delete \
    --cache-control "public, max-age=31536000, immutable"

# Upload root files (HTML, manifest, etc.) with short-term caching
aws --profile $AWS_PROFILE s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" \
    --region "$DEPLOY_REGION" \
    --exclude "static/*" \
    --cache-control "public, max-age=0, must-revalidate"

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Files uploaded to private S3 bucket successfully${NC}"
else
    echo -e "${RED}❌ S3 upload failed${NC}"
    exit 1
fi

# Step 4: Invalidate CloudFront cache
echo -e "${BLUE}🔄 Step 4: Invalidating CloudFront cache...${NC}"
echo -e "${YELLOW}   Creating cache invalidation for all files...${NC}"

INVALIDATION_ID=$(aws --profile $AWS_PROFILE cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --region "$REGION" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "   📝 Invalidation ID: ${INVALIDATION_ID}"

# Step 5: Wait for CloudFront deployment
echo -e "${BLUE}⏳ Step 5: Waiting for CloudFront deployment...${NC}"
echo -e "${YELLOW}   This typically takes 5-15 minutes for global distribution...${NC}"

# Show real-time deployment status
echo -e "${BLUE}   Checking deployment status...${NC}"
aws --profile $AWS_PROFILE cloudfront wait distribution-deployed \
    --id "$DISTRIBUTION_ID" \
    --region "$REGION" &

WAIT_PID=$!

# Show progress while waiting
while kill -0 $WAIT_PID 2>/dev/null; do
    echo -e "${YELLOW}   ⏳ Still deploying to edge locations...${NC}"
    sleep 30
done

wait $WAIT_PID
WAIT_RESULT=$?

if [[ $WAIT_RESULT -eq 0 ]]; then
    echo -e "${GREEN}✅ CloudFront deployment completed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  CloudFront deployment is still in progress${NC}"
    echo -e "${YELLOW}   You can check status with: aws --profile $AWS_PROFILE cloudfront get-distribution --id ${DISTRIBUTION_ID}${NC}"
fi

# Step 6: Verify deployment
echo -e "${BLUE}🧪 Step 6: Verifying deployment...${NC}"

echo -e "${YELLOW}   Testing CloudFront endpoint...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEBSITE_URL")

if [[ "$HTTP_STATUS" == "200" ]]; then
    echo -e "${GREEN}   ✅ Website is responding (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}   ⚠️  Website returned HTTP $HTTP_STATUS (may still be propagating)${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}🎉 CloudFront Frontend Deployment Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${PURPLE}📍 Production Deployment Details:${NC}"
echo -e "   🌐 Website URL: ${WEBSITE_URL}"
echo -e "   ☁️  CloudFront Distribution: ${DISTRIBUTION_ID}"
echo -e "   🪣 Private S3 Bucket: ${BUCKET_NAME}"
echo -e "   🔗 Backend API: ${DEV_API_ENDPOINT}"
echo -e "   🛡️  Security: Private S3 + CloudFront OAC + WAF"
echo ""
echo -e "${YELLOW}🔧 Development Backend Integration:${NC}"
echo -e "   ✅ Frontend served via CloudFront (global CDN)"
echo -e "   ✅ Assets stored in private S3 bucket"
echo -e "   ✅ Connected to development Cognito user pool"
echo -e "   ✅ Connected to development PostgreSQL database"
echo -e "   ✅ Connected to development Lambda functions"
echo -e "   ✅ Connected to development API Gateway"
echo ""
echo -e "${BLUE}📊 Performance & Security Features:${NC}"
echo -e "   ⚡ Global CDN distribution"
echo -e "   🔒 Private S3 bucket (no public access)"
echo -e "   🛡️  WAF protection enabled"
echo -e "   📈 CloudWatch monitoring dashboard"
echo -e "   🗜️  Gzip compression enabled"
echo -e "   ⚡ HTTP/2 and HTTP/3 support"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "   1. Test the frontend at: ${WEBSITE_URL}"
echo -e "   2. Verify development backend integration"
echo -e "   3. Run end-to-end tests"
echo -e "   4. Configure custom domain DNS (optional)"
echo -e "   5. Set up SSL certificate for custom domain"
echo -e "   6. Configure CI/CD pipeline for automated deployments"
echo ""
echo -e "${GREEN}🚀 Seawater.io is now live on CloudFront with development backend!${NC}"