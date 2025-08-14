#!/bin/bash

# Seawater Climate Risk Platform - Phase 1 Deployment Script
# This script deploys the minimal infrastructure needed for Phase 1 MVP

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_PREFIX="Seawater"
ENVIRONMENT="dev"
REGION="us-east-2"
DATABASE_STACK="${STACK_PREFIX}-${ENVIRONMENT}-Database"
API_STACK="${STACK_PREFIX}-${ENVIRONMENT}-API"

echo -e "${BLUE}🌊 Seawater Climate Risk Platform - Phase 1 Deployment${NC}"
echo "========================================================="

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo -e "${RED}❌ SAM CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Get user input for sensitive parameters
echo -e "${YELLOW}🔐 Configuration Setup${NC}"

read -s -p "Enter database password (min 8 characters): " DB_PASSWORD
echo
if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo -e "${RED}❌ Password must be at least 8 characters long${NC}"
    exit 1
fi

read -p "Enter MapBox access token (get from https://mapbox.com): " MAPBOX_TOKEN
if [ -z "$MAPBOX_TOKEN" ]; then
    echo -e "${RED}❌ MapBox access token is required for geocoding${NC}"
    exit 1
fi

# Optional FEMA API key
read -p "Enter FEMA API key (optional, press enter to skip): " FEMA_API_KEY
if [ -z "$FEMA_API_KEY" ]; then
    FEMA_API_KEY="optional_key"
fi

echo -e "${GREEN}✅ Configuration collected${NC}"

# Step 1: Deploy Database Stack
echo -e "${YELLOW}🗄️  Step 1: Deploying Database Infrastructure...${NC}"

sam deploy \
    --template-file IAC/database-setup.yaml \
    --stack-name $DATABASE_STACK \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        DBPassword=$DB_PASSWORD \
    --no-confirm-changeset

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database stack deployed successfully${NC}"
else
    echo -e "${RED}❌ Database stack deployment failed${NC}"
    exit 1
fi

# Get database outputs
echo -e "${YELLOW}📊 Retrieving database connection details...${NC}"

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $DATABASE_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

DB_PORT=$(aws cloudformation describe-stacks \
    --stack-name $DATABASE_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' \
    --output text)

VPC_ID=$(aws cloudformation describe-stacks \
    --stack-name $DATABASE_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
    --output text)

LAMBDA_SG_ID=$(aws cloudformation describe-stacks \
    --stack-name $DATABASE_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaSecurityGroupId`].OutputValue' \
    --output text)

SUBNET_IDS=$(aws cloudformation describe-stacks \
    --stack-name $DATABASE_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSubnetIds`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Database endpoint: ${DB_ENDPOINT}:${DB_PORT}${NC}"

# Wait for database to be available
echo -e "${YELLOW}⏳ Waiting for database to be available...${NC}"
DB_INSTANCE_ID="seawater-${ENVIRONMENT}-db"

while true; do
    STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_ID \
        --region $REGION \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text 2>/dev/null || echo "not-found")
    
    if [ "$STATUS" = "available" ]; then
        echo -e "${GREEN}✅ Database is available${NC}"
        break
    elif [ "$STATUS" = "not-found" ]; then
        echo -e "${RED}❌ Database instance not found${NC}"
        exit 1
    else
        echo -e "${YELLOW}⏳ Database status: $STATUS (waiting...)${NC}"
        sleep 30
    fi
done

# Step 2: Initialize Database Schema
echo -e "${YELLOW}🔧 Step 2: Initializing database schema...${NC}"

# Create initialization script
cat > /tmp/init_seawater_db.sql << EOF
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify PostGIS installation
SELECT PostGIS_version();

-- Create application user
CREATE USER seawater_app WITH PASSWORD '$DB_PASSWORD';
GRANT CONNECT ON DATABASE seawater TO seawater_app;

-- Create schema (basic tables for Phase 1)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address TEXT NOT NULL,
    normalized_address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_properties_address ON properties (normalized_address);

-- Basic risk assessment table
CREATE TABLE IF NOT EXISTS climate_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    flood_risk_score INTEGER CHECK (flood_risk_score >= 0 AND flood_risk_score <= 100),
    wildfire_risk_score INTEGER CHECK (wildfire_risk_score >= 0 AND wildfire_risk_score <= 100),
    earthquake_risk_score INTEGER CHECK (earthquake_risk_score >= 0 AND earthquake_risk_score <= 100),
    assessment_date TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_property_id ON climate_risk_assessments (property_id);

-- Grant permissions to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seawater_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seawater_app;

-- Test data (optional)
INSERT INTO properties (address, normalized_address, latitude, longitude, location) 
VALUES 
    ('1600 Pennsylvania Avenue NW, Washington, DC 20500', '1600 Pennsylvania Avenue NW Washington DC 20500', 38.8977, -77.0365, ST_SetSRID(ST_MakePoint(-77.0365, 38.8977), 4326)),
    ('One World Trade Center, New York, NY 10007', 'One World Trade Center New York NY 10007', 40.7127, -74.0134, ST_SetSRID(ST_MakePoint(-74.0134, 40.7127), 4326))
ON CONFLICT DO NOTHING;

SELECT 'Database initialization completed successfully' as status;
EOF

# Connect to database and run initialization
echo -e "${YELLOW}📝 Running database initialization script...${NC}"
PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_ENDPOINT \
    -p $DB_PORT \
    -U postgres \
    -d seawater \
    -f /tmp/init_seawater_db.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema initialized successfully${NC}"
else
    echo -e "${RED}❌ Database initialization failed${NC}"
    echo -e "${YELLOW}ℹ️  You may need to install PostgreSQL client: sudo apt-get install postgresql-client${NC}"
    echo -e "${YELLOW}ℹ️  Or run the initialization manually using the connection details above${NC}"
fi

# Clean up temp file
rm -f /tmp/init_seawater_db.sql

# Step 3: Build and Package Lambda Functions
echo -e "${YELLOW}📦 Step 3: Building Lambda functions...${NC}"

# Create basic handler if it doesn't exist
mkdir -p src/backend/handlers
if [ ! -f src/backend/handlers/healthCheck.js ]; then
    cat > src/backend/handlers/healthCheck.js << 'EOF'
exports.handler = async (event) => {
    console.log('Health check request:', JSON.stringify(event, null, 2));
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        })
    };
};
EOF
fi

# Create build directory
mkdir -p src/backend/dist/handlers

# Package Lambda functions (simplified for Phase 1)
cd src/backend/handlers
for handler in *.js; do
    if [ -f "$handler" ]; then
        echo "Packaging $handler..."
        cp "$handler" "../dist/handlers/"
        cd "../dist/handlers"
        zip "${handler%.js}.zip" "$handler"
        cd "../../handlers"
    fi
done
cd ../../../

echo -e "${GREEN}✅ Lambda functions packaged${NC}"

# Step 4: Deploy API Stack (Updated template without Lambdas for now)
echo -e "${YELLOW}🚀 Step 4: Deploying API Gateway (minimal setup)...${NC}"

# Create minimal API template for Phase 1
cat > IAC/phase1-api-minimal.yaml << EOF
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Environment:
    Type: String
    Default: dev

Resources:
  SeawaterApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub "Seawater-\${Environment}-API"
      StageName: !Ref Environment
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'*'"

  HealthCheckFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "Seawater-\${Environment}-HealthCheck"
      CodeUri: ../src/backend/dist/handlers/healthCheck.zip
      Handler: healthCheck.handler
      Runtime: nodejs18.x
      Environment:
        Variables:
          NODE_ENV: !Ref Environment
          DB_HOST: $DB_ENDPOINT
          DB_PORT: $DB_PORT
      Events:
        HealthCheck:
          Type: Api
          Properties:
            RestApiId: !Ref SeawaterApi
            Path: /health
            Method: GET

Outputs:
  ApiUrl:
    Description: 'API Gateway URL'
    Value: !Sub 'https://\${SeawaterApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Environment}'
EOF

# Deploy minimal API
sam deploy \
    --template-file IAC/phase1-api-minimal.yaml \
    --stack-name $API_STACK \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --parameter-overrides Environment=$ENVIRONMENT \
    --no-confirm-changeset

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API stack deployed successfully${NC}"
else
    echo -e "${RED}❌ API stack deployment failed${NC}"
    exit 1
fi

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $API_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

# Step 5: Test Deployment
echo -e "${YELLOW}🧪 Step 5: Testing deployment...${NC}"

echo "Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/health" || echo "CURL_FAILED")

if [[ $HEALTH_RESPONSE == *"200" ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check warning (API may still be deploying)${NC}"
    echo "Response: $HEALTH_RESPONSE"
fi

# Final Summary
echo -e "${BLUE}🎉 Phase 1 Deployment Complete!${NC}"
echo "=============================================="
echo -e "${GREEN}✅ Database Stack:${NC} $DATABASE_STACK"
echo -e "${GREEN}✅ API Stack:${NC} $API_STACK"
echo -e "${GREEN}✅ Database Endpoint:${NC} $DB_ENDPOINT:$DB_PORT"
echo -e "${GREEN}✅ API Gateway URL:${NC} $API_URL"
echo ""
echo -e "${YELLOW}🔧 Next Steps:${NC}"
echo "1. Test the health endpoint: curl $API_URL/health"
echo "2. Connect to database: psql -h $DB_ENDPOINT -p $DB_PORT -U postgres -d seawater"
echo "3. Deploy remaining Lambda functions as needed"
echo "4. Set up frontend deployment"
echo ""
echo -e "${YELLOW}📝 Connection Details:${NC}"
echo "Database: postgresql://postgres:****@$DB_ENDPOINT:$DB_PORT/seawater"
echo "API Base URL: $API_URL"
echo ""
echo -e "${GREEN}🌊 Seawater Phase 1 is ready for development!${NC}"