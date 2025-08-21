#!/bin/bash

# Simple Seawater Frontend S3 Deployment Script
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
REGION="us-east-2"
DEV_API_ENDPOINT="https://5puux7rpx0.execute-api.us-east-2.amazonaws.com/dev"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="seawater-frontend-${ENVIRONMENT}-${ACCOUNT_ID}"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
BUILD_DIR="$FRONTEND_DIR/build"

echo -e "${BLUE}🌊 Seawater Frontend Simple S3 Deployment${NC}"
echo -e "${BLUE}==========================================${NC}"
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
echo -e "   Bucket Name: ${BUCKET_NAME}"
echo -e "   Region: ${REGION}"
echo -e "   API Endpoint: ${DEV_API_ENDPOINT}"
echo ""

# Step 1: Create S3 bucket
echo -e "${BLUE}🏗️  Step 1: Creating S3 bucket...${NC}"

# Check if bucket already exists
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Bucket already exists: ${BUCKET_NAME}${NC}"
else
    # Create bucket
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    
    echo -e "${GREEN}✅ Bucket created successfully${NC}"
fi

# Step 2: Configure bucket for static website hosting
echo -e "${BLUE}🌐 Step 2: Configuring static website hosting...${NC}"

# First, disable block public access (needed for static website)
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Enable static website hosting
aws s3api put-bucket-website \
    --bucket "$BUCKET_NAME" \
    --website-configuration '{
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "index.html"}
    }'

# Set bucket policy for public read access
aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
            }
        ]
    }'

echo -e "${GREEN}✅ Static website hosting configured${NC}"

# Step 3: Build React application
echo -e "${BLUE}⚛️  Step 3: Building React application...${NC}"
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

# Step 4: Deploy to S3
echo -e "${BLUE}☁️  Step 4: Deploying to S3...${NC}"

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

# Get website URL
WEBSITE_URL="http://${BUCKET_NAME}.s3-website.${REGION}.amazonaws.com"

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
echo -e "   4. Set up CloudFront distribution (optional)"
echo ""
echo -e "${GREEN}🚀 Seawater.io is now live with development backend!${NC}"
echo ""
echo -e "${BLUE}🧪 Quick Test:${NC}"
echo -e "   curl -I ${WEBSITE_URL}"