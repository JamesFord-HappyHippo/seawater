#!/bin/bash

# Seawater Climate Risk Platform - Phase 1 Simple Deployment
# Following Tim-Combo patterns: External DB + Public access + No VPC complexity

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

echo -e "${BLUE}🌊 Seawater Phase 1 - Simple Deployment (Tim-Combo Pattern)${NC}"
echo "=================================================================="

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo -e "${RED}❌ SAM CLI is not installed${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Get user input
echo -e "${YELLOW}🔐 Configuration Setup${NC}"

read -s -p "Enter database password (min 8 characters): " DB_PASSWORD
echo
if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo -e "${RED}❌ Password must be at least 8 characters${NC}"
    exit 1
fi

read -p "Enter MapBox access token: " MAPBOX_TOKEN
if [ -z "$MAPBOX_TOKEN" ]; then
    echo -e "${RED}❌ MapBox token required${NC}"
    exit 1
fi

read -p "Enter FEMA API key (optional, press enter to skip): " FEMA_API_KEY
if [ -z "$FEMA_API_KEY" ]; then
    FEMA_API_KEY="optional_key"
fi

echo -e "${GREEN}✅ Configuration collected${NC}"

# Step 1: Get Default VPC Subnets
echo -e "${YELLOW}🔍 Step 1: Finding default VPC subnets...${NC}"

DEFAULT_VPC=$(aws ec2 describe-vpcs \
    --filters "Name=isDefault,Values=true" \
    --region $REGION \
    --query 'Vpcs[0].VpcId' \
    --output text)

if [ "$DEFAULT_VPC" = "None" ]; then
    echo -e "${RED}❌ No default VPC found. Creating one...${NC}"
    aws ec2 create-default-vpc --region $REGION
    DEFAULT_VPC=$(aws ec2 describe-vpcs \
        --filters "Name=isDefault,Values=true" \
        --region $REGION \
        --query 'Vpcs[0].VpcId' \
        --output text)
fi

SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$DEFAULT_VPC" \
    --region $REGION \
    --query 'Subnets[0:2].SubnetId' \
    --output text)

SUBNET_ARRAY=($SUBNET_IDS)
SUBNET1=${SUBNET_ARRAY[0]}
SUBNET2=${SUBNET_ARRAY[1]}

echo -e "${GREEN}✅ Using default VPC: $DEFAULT_VPC${NC}"
echo -e "${GREEN}✅ Using subnets: $SUBNET1, $SUBNET2${NC}"

# Update database template with actual subnet IDs
sed -i.bak "s/subnet-12345678/$SUBNET1/g" IAC/database-simple.yaml
sed -i.bak "s/subnet-87654321/$SUBNET2/g" IAC/database-simple.yaml

# Step 2: Create Basic Lambda Handlers
echo -e "${YELLOW}📦 Step 2: Creating basic Lambda handlers...${NC}"

mkdir -p src/backend/handlers
mkdir -p src/backend/dist

# Create health check handler (Node.js 22 compatible)
cat > src/backend/handlers/healthCheck.js << 'EOF'
const { Client } = require('pg');

exports.handler = async (event) => {
    console.log('Health check request:', JSON.stringify(event, null, 2));
    
    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            database: await checkDatabase()
        })
    };
    
    console.log('Health check response:', response);
    return response;
};

async function checkDatabase() {
    try {
        if (!process.env.DB_HOST) {
            return { status: 'not_configured', message: 'Database not configured' };
        }
        
        const client = new Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'seawater',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: false, // Set to true for production
            connectionTimeoutMillis: 5000,
        });
        
        await client.connect();
        const result = await client.query('SELECT NOW() as current_time, PostGIS_version() as postgis_version');
        await client.end();
        
        return {
            status: 'connected',
            timestamp: result.rows[0].current_time,
            postgis_version: result.rows[0].postgis_version
        };
    } catch (error) {
        console.error('Database connection error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}
EOF

# Create property risk handler (basic version)
cat > src/backend/handlers/getPropertyRisk.js << 'EOF'
const { Client } = require('pg');

exports.handler = async (event) => {
    console.log('Property risk request:', JSON.stringify(event, null, 2));
    
    try {
        const address = event.pathParameters?.address || event.queryStringParameters?.address;
        
        if (!address) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Address parameter is required',
                    message: 'Please provide an address to assess'
                })
            };
        }
        
        const client = new Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'seawater',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: false,
            connectionTimeoutMillis: 10000,
        });
        
        await client.connect();
        
        // Search for property by address
        const query = `
            SELECT p.*, cra.overall_risk_score, cra.flood_risk_score, 
                   cra.wildfire_risk_score, cra.hurricane_risk_score,
                   cra.earthquake_risk_score, cra.risk_category
            FROM properties p
            LEFT JOIN climate_risk_assessments cra ON p.id = cra.property_id
            WHERE p.normalized_address ILIKE $1 
               OR p.address ILIKE $1
            LIMIT 1
        `;
        
        const result = await client.query(query, [`%${address}%`]);
        await client.end();
        
        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Property not found',
                    message: `No property found matching address: ${address}`,
                    suggestion: 'Try a more specific address or check spelling'
                })
            };
        }
        
        const property = result.rows[0];
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: {
                    property: {
                        address: property.address,
                        city: property.city,
                        state: property.state,
                        zipCode: property.zip_code,
                        coordinates: {
                            latitude: parseFloat(property.latitude),
                            longitude: parseFloat(property.longitude)
                        }
                    },
                    riskAssessment: {
                        overallScore: property.overall_risk_score,
                        category: property.risk_category,
                        risks: {
                            flood: property.flood_risk_score,
                            wildfire: property.wildfire_risk_score,
                            hurricane: property.hurricane_risk_score,
                            earthquake: property.earthquake_risk_score
                        }
                    }
                },
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Property risk error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
EOF

# Package Lambda functions
echo -e "${YELLOW}📦 Packaging Lambda functions...${NC}"
cd src/backend/handlers

# Install pg dependency
npm init -y
npm install pg

# Package each handler
for handler in *.js; do
    if [ -f "$handler" ]; then
        echo "Packaging $handler..."
        zip "${handler%.js}.zip" "$handler" package.json node_modules/ -r
        mv "${handler%.js}.zip" "../dist/"
    fi
done

cd ../../../

echo -e "${GREEN}✅ Lambda functions packaged${NC}"

# Step 3: Deploy Database
echo -e "${YELLOW}🗄️  Step 3: Deploying Database...${NC}"

sam deploy \
    --template-file IAC/database-simple.yaml \
    --stack-name $DATABASE_STACK \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        DBPassword=$DB_PASSWORD \
    --no-confirm-changeset

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database deployed successfully${NC}"
else
    echo -e "${RED}❌ Database deployment failed${NC}"
    exit 1
fi

# Get database endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $DATABASE_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Database endpoint: $DB_ENDPOINT${NC}"

# Step 4: Wait for database and initialize
echo -e "${YELLOW}⏳ Step 4: Waiting for database and initializing schema...${NC}"

DB_INSTANCE_ID="seawater-${ENVIRONMENT}-db"

# Wait for database to be available
while true; do
    STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_ID \
        --region $REGION \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text 2>/dev/null || echo "not-found")
    
    if [ "$STATUS" = "available" ]; then
        echo -e "${GREEN}✅ Database is available${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Database status: $STATUS (waiting...)${NC}"
        sleep 30
    fi
done

# Initialize database schema
echo -e "${YELLOW}🔧 Initializing database schema...${NC}"
if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_ENDPOINT \
        -p 5432 \
        -U postgres \
        -d seawater \
        -f database/init-schema.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema initialized${NC}"
    else
        echo -e "${YELLOW}⚠️  Schema initialization failed - you may need to run it manually${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not found - run schema manually later${NC}"
fi

# Step 5: Create S3 bucket and upload Lambda packages
echo -e "${YELLOW}📦 Step 5: Creating S3 bucket and uploading functions...${NC}"

aws s3 mb s3://seawater-dev-lambda --region $REGION 2>/dev/null || echo "Bucket already exists"

# Upload Lambda packages
aws s3 cp src/backend/dist/healthCheck.zip s3://seawater-dev-lambda/ --region $REGION
aws s3 cp src/backend/dist/getPropertyRisk.zip s3://seawater-dev-lambda/ --region $REGION

echo -e "${GREEN}✅ Lambda packages uploaded${NC}"

# Step 6: Deploy API Gateway and Lambdas
echo -e "${YELLOW}🚀 Step 6: Deploying API Gateway and Lambda functions...${NC}"

sam deploy \
    --template-file IAC/phase1-simple.yaml \
    --stack-name $API_STACK \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        DatabaseHost=$DB_ENDPOINT \
        DatabasePassword=$DB_PASSWORD \
        MapBoxAccessToken=$MAPBOX_TOKEN \
        FEMAAPIKey=$FEMA_API_KEY \
    --no-confirm-changeset

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API stack deployed successfully${NC}"
else
    echo -e "${RED}❌ API deployment failed${NC}"
    exit 1
fi

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $API_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SeawaterApiUrl`].OutputValue' \
    --output text)

# Step 7: Test deployment
echo -e "${YELLOW}🧪 Step 7: Testing deployment...${NC}"

echo "Testing health check endpoint..."
sleep 10  # Give API Gateway time to be ready

HEALTH_RESPONSE=$(curl -s "${API_URL}/health" | head -c 1000)
echo "Health check response: $HEALTH_RESPONSE"

echo "Testing property risk endpoint..."
RISK_RESPONSE=$(curl -s "${API_URL}/properties/1600%20Pennsylvania%20Avenue/risk" | head -c 1000)
echo "Property risk response: $RISK_RESPONSE"

# Final Summary
echo -e "${BLUE}🎉 Phase 1 Simple Deployment Complete!${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Database Stack:${NC} $DATABASE_STACK"
echo -e "${GREEN}✅ API Stack:${NC} $API_STACK"
echo -e "${GREEN}✅ Database Endpoint:${NC} $DB_ENDPOINT:5432"
echo -e "${GREEN}✅ API Gateway URL:${NC} $API_URL"
echo ""
echo -e "${YELLOW}🔧 Test Commands:${NC}"
echo "Health Check: curl $API_URL/health"
echo "Property Risk: curl \"$API_URL/properties/1600%20Pennsylvania%20Avenue/risk\""
echo "Database: psql -h $DB_ENDPOINT -p 5432 -U postgres -d seawater"
echo ""
echo -e "${GREEN}🌊 Seawater Phase 1 is operational!${NC}"