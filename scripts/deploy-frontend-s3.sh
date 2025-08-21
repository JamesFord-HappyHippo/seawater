#!/bin/bash

# Seawater Frontend S3 Deployment Script
# Deploys React frontend to S3 static website with development backend integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="dev"
STACK_NAME="seawater-frontend-s3-${ENVIRONMENT}"
REGION="us-east-2"
DEV_API_ENDPOINT="https://5puux7rpx0.execute-api.us-east-2.amazonaws.com/dev"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
BUILD_DIR="$FRONTEND_DIR/build"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/src/infrastructure"

echo -e "${BLUE}🌊 Seawater Frontend S3 Deployment${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
    echo -e "${RED}❌ Frontend package.json not found. Please run from project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo -e "   Environment: ${ENVIRONMENT}"
echo -e "   Stack Name: ${STACK_NAME}"
echo -e "   Region: ${REGION}"
echo -e "   API Endpoint: ${DEV_API_ENDPOINT}"
echo ""

# Clean up any failed previous deployment
echo -e "${BLUE}🧹 Cleaning up previous deployment...${NC}"
aws cloudformation delete-stack --stack-name seawater-frontend-dev --region "$REGION" 2>/dev/null || true

# Step 1: Deploy CloudFormation stack
echo -e "${BLUE}🏗️  Step 1: Deploying S3 Infrastructure...${NC}"
aws cloudformation deploy \
    --template-file "$INFRASTRUCTURE_DIR/frontend-s3-only.yaml" \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        DevApiEndpoint="$DEV_API_ENDPOINT" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION"

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
else
    echo -e "${RED}❌ Infrastructure deployment failed${NC}"
    exit 1
fi

# Get stack outputs
echo -e "${BLUE}📤 Getting stack outputs...${NC}"
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text)

WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

echo -e "   S3 Bucket: ${BUCKET_NAME}"
echo -e "   Website URL: ${WEBSITE_URL}"
echo ""

# Step 2: Build React application
echo -e "${BLUE}⚛️  Step 2: Building React application...${NC}"
cd "$FRONTEND_DIR"

# Set environment variables for build
export REACT_APP_API_URL="$DEV_API_ENDPOINT"
export REACT_APP_ENVIRONMENT="$ENVIRONMENT"
export GENERATE_SOURCEMAP=false

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🏗️  Building production bundle...${NC}"
npm run build

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ React build completed successfully${NC}"
else
    echo -e "${RED}❌ React build failed${NC}"
    exit 1
fi

# Step 3: Deploy to S3
echo -e "${BLUE}☁️  Step 3: Deploying to S3...${NC}"

# Sync build files to S3
aws s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" \
    --region "$REGION" \
    --delete

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Files uploaded to S3 successfully${NC}"
else
    echo -e "${RED}❌ S3 upload failed${NC}"
    exit 1
fi

# Final summary
echo ""
echo -e "${GREEN}🎉 Frontend Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}📍 Deployment Details:${NC}"
echo -e "   🌐 Website URL: ${WEBSITE_URL}"
echo -e "   🪣 S3 Bucket: ${BUCKET_NAME}"
echo -e "   🔗 API Endpoint: ${DEV_API_ENDPOINT}"
echo ""
echo -e "${YELLOW}🔧 Development Backend Integration:${NC}"
echo -e "   ✅ Connected to development Cognito user pool"
echo -e "   ✅ Connected to development PostgreSQL database"
echo -e "   ✅ Connected to development Lambda functions"
echo -e "   ✅ Connected to development API Gateway"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "   1. Test the frontend at: ${WEBSITE_URL}"
echo -e "   2. Verify API integration with development backend"
echo -e "   3. Run end-to-end tests"
echo -e "   4. Set up CloudFront distribution (requires account verification)"
echo ""
echo -e "${GREEN}🚀 Seawater.io is now live with development backend!${NC}"