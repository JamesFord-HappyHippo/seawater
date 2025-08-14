# Seawater Climate Risk Platform - Phase 1 Deployment Guide

## 🌊 Phase 1 MVP Overview

Phase 1 provides the core infrastructure for a working climate risk assessment platform with:

- **PostgreSQL + PostGIS database** for spatial property data
- **AWS Lambda + API Gateway** for serverless backend
- **Free government data sources** (FEMA, USGS, NOAA)
- **Basic property risk assessment** with real climate data
- **Health check and monitoring** endpoints

## 🏗️ Infrastructure Components

Based on Tim-Combo's proven patterns:

### Required Infrastructure:
- ✅ **PostgreSQL Database** with PostGIS extension
- ✅ **API Gateway** for REST endpoints
- ✅ **Lambda Functions** for business logic
- ✅ **S3 Bucket** for deployment packages
- ✅ **IAM Roles** with minimal permissions

### NOT Required for Phase 1:
- ❌ **Cognito User Pools** (authentication comes in Phase 2)
- ❌ **VPC with private subnets** (simplified for development)
- ❌ **ElastiCache Redis** (caching comes in Phase 2)
- ❌ **CloudFront CDN** (frontend optimization for later)

## 🚀 Quick Start Deployment

### Prerequisites
1. **AWS CLI** configured with appropriate permissions
2. **SAM CLI** installed for serverless deployment
3. **PostgreSQL client** for database operations
4. **MapBox account** for geocoding (free tier available)

### Step 1: Clone and Prepare
```bash
cd /Users/jamesford/Source/Seawater
cp .env.example .env
# Edit .env with your actual values
```

### Step 2: Deploy Infrastructure
```bash
# Make deployment script executable (already done)
chmod +x deploy-phase1.sh

# Run the complete deployment
./deploy-phase1.sh
```

The script will:
1. ✅ Deploy PostgreSQL database with PostGIS
2. ✅ Initialize schema with test data
3. ✅ Deploy API Gateway with health check
4. ✅ Test the deployment
5. ✅ Provide connection details

### Step 3: Verify Deployment
```bash
# Test health endpoint
curl https://your-api-id.execute-api.us-east-2.amazonaws.com/dev/health

# Connect to database
psql -h your-db-endpoint -p 5432 -U postgres -d seawater

# Test spatial query
SELECT normalized_address, overall_risk_score, 
       ST_X(location) as longitude, ST_Y(location) as latitude
FROM property_risk_summary 
WHERE overall_risk_score > 50;
```

## 📊 What's Included

### Database Schema
- **properties**: Property addresses with PostGIS spatial indexing
- **climate_risk_assessments**: Multi-hazard risk scores (0-100 scale)
- **data_sources**: External API configuration and monitoring
- **data_source_responses**: API response audit trail
- **users**: Basic user management (Phase 1 simplified)

### Sample Data
- **4 test properties** across different risk zones:
  - Washington DC (moderate risk)
  - New York City (moderate risk)  
  - Paradise, CA (high wildfire risk)
  - Miami Beach, FL (high hurricane/flood risk)

### API Endpoints (Phase 1)
- `GET /health` - System health check
- `GET /properties/{address}/risk` - Property risk lookup (coming next)
- `POST /properties/compare` - Property comparison (coming next)
- `GET /geographic/risk` - Area-based risk search (coming next)

## 🔧 Configuration Details

### Database Connection
```
Host: seawater-dev.cluster-xxx.us-east-2.rds.amazonaws.com
Port: 5432
Database: seawater
User: postgres
Password: [from deployment script]
```

### Environment Variables
```bash
# Core settings
NODE_ENV=development
DB_HOST=your-db-endpoint
MAPBOX_ACCESS_TOKEN=pk.your_token

# Data sources
FEMA_API_KEY=optional
NOAA_API_KEY=optional
```

### API Gateway
```
Base URL: https://your-api-id.execute-api.us-east-2.amazonaws.com/dev
Health Check: /health
CORS: Enabled for all origins (dev only)
```

## 🔍 Testing Phase 1

### 1. Database Connectivity
```sql
-- Connect to database
psql -h your-endpoint -U postgres -d seawater

-- Test PostGIS
SELECT PostGIS_version();

-- Test sample data
SELECT COUNT(*) FROM properties;
SELECT COUNT(*) FROM climate_risk_assessments;

-- Test spatial queries  
SELECT p.normalized_address, cra.overall_risk_score,
       ST_Distance(p.location, ST_SetSRID(ST_MakePoint(-77.0365, 38.8977), 4326)) as distance_from_dc
FROM properties p
JOIN climate_risk_assessments cra ON p.id = cra.property_id
ORDER BY distance_from_dc;
```

### 2. API Testing
```bash
# Health check
curl -X GET https://your-api-id.execute-api.us-east-2.amazonaws.com/dev/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-08-13T...",
  "version": "1.0.0",
  "environment": "development"
}
```

### 3. Lambda Function Logs
```bash
# View logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/Seawater-dev"
aws logs tail /aws/lambda/Seawater-dev-HealthCheck --follow
```

## 📈 Next Steps

### Phase 1 Extensions
1. **Deploy property risk handlers** using existing Lambda code
2. **Add MapBox geocoding integration**
3. **Connect FEMA National Risk Index API**
4. **Implement caching layer**

### Phase 2 Preparation
1. **Add Cognito authentication**
2. **Implement subscription tiers**
3. **Add premium data sources**
4. **Deploy React frontend**

### Frontend Development
```bash
# Frontend setup (when ready)
cd src/frontend
npm install
npm run dev
```

## 🎯 Success Criteria

Phase 1 is successful when:
- ✅ Database is accessible with PostGIS enabled
- ✅ Health check endpoint returns 200 OK
- ✅ Sample properties have risk assessments
- ✅ Spatial queries execute in <500ms
- ✅ API Gateway routes requests correctly

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check security groups
aws ec2 describe-security-groups --group-names "Seawater-dev-DB-SG"

# Test connectivity
telnet your-db-endpoint 5432
```

**Lambda Function Timeout**
```bash
# Check function configuration
aws lambda get-function-configuration --function-name Seawater-dev-HealthCheck

# Increase timeout if needed
aws lambda update-function-configuration \
  --function-name Seawater-dev-HealthCheck \
  --timeout 60
```

**PostGIS Extension Not Found**
```sql
-- Manually enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify installation
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name LIKE 'postgis%';
```

## 💰 Cost Estimates

### Phase 1 Monthly Costs (Development)
- **RDS PostgreSQL (db.t3.micro)**: ~$15-20/month
- **Lambda Functions**: ~$1-5/month (low usage)
- **API Gateway**: ~$1-3/month (low usage)
- **S3 Storage**: <$1/month
- **Data Transfer**: ~$1-2/month
- **Total**: ~$20-30/month

### External API Costs (Free Tier)
- **MapBox Geocoding**: 50,000 requests/month free
- **FEMA National Risk Index**: Free
- **USGS Earthquake Data**: Free
- **NOAA Climate Data**: Free

## 🌊 Ready for Development!

Once Phase 1 is deployed successfully, you have a working climate risk platform foundation that can:

1. Store and query property data with spatial indexing
2. Assess climate risks using multiple data sources
3. Provide REST API access to risk information
4. Scale horizontally with serverless architecture
5. Integrate with external climate data APIs

The platform is ready for feature development, frontend integration, and user testing!