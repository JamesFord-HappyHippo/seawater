# Seawater Climate Risk Platform - Deployment Guide

## Overview

This comprehensive deployment guide provides step-by-step instructions for deploying the Seawater Climate Risk Platform infrastructure to AWS. The platform uses a serverless-first architecture with AWS SAM (Serverless Application Model) for infrastructure as code.

## Architecture Summary

- **Compute**: AWS Lambda functions for serverless processing
- **API**: API Gateway for REST API management
- **Database**: PostgreSQL with PostGIS on RDS
- **Cache**: Redis on ElastiCache
- **Storage**: S3 buckets for data and assets
- **CDN**: CloudFront for global content delivery
- **Monitoring**: CloudWatch, X-Ray, and custom metrics
- **Security**: IAM roles, VPC, security groups, secrets management

## Prerequisites

### Required Tools

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install AWS SAM CLI
pip install aws-sam-cli

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL client
sudo apt-get install postgresql-client
```

### AWS Account Setup

1. **Create AWS Account** with appropriate permissions
2. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Access Key, region (us-east-1), and output format (json)
   ```

3. **Verify AWS Access**:
   ```bash
   aws sts get-caller-identity
   ```

### Domain and SSL Certificate (Optional)

For custom domains:
1. Register domain or use existing domain
2. Create SSL certificate in AWS Certificate Manager
3. Note the certificate ARN for deployment parameters

## Environment Configuration

### 1. Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/seawater-platform.git
cd seawater-platform

# Copy and customize development parameters
cp IAC/parameters/dev.json.example IAC/parameters/dev.json
```

Edit `IAC/parameters/dev.json`:
```json
{
  "Parameters": {
    "Environment": "dev",
    "ProjectName": "seawater",
    "DatabasePassword": "your-secure-dev-password",
    "VpcCidr": "10.0.0.0/16",
    "LambdaMemorySize": 512,
    "DatabaseInstanceClass": "db.t3.micro",
    "RedisNodeType": "cache.t4g.micro",
    "MaxLambdaConcurrency": 10
  }
}
```

### 2. Staging Environment

```bash
cp IAC/parameters/staging.json.example IAC/parameters/staging.json
```

Edit staging parameters with higher resource allocations.

### 3. Production Environment

```bash
cp IAC/parameters/production.json.example IAC/parameters/production.json
```

Update production parameters with:
- Custom domain and certificate ARN
- Production-grade instance sizes
- Higher memory and concurrency limits

## Deployment Steps

### Step 1: Prepare Lambda Functions

```bash
# Navigate to each Lambda function directory and install dependencies
cd src/lambda/risk-aggregator
npm install --production
cd ../geographic-processor
npm install --production
cd ../fema-sync
npm install --production
cd ../premium-orchestrator
npm install --production
cd ../../..
```

### Step 2: Deploy Core Infrastructure

```bash
cd IAC

# Build SAM application
sam build --template-file seawater-infrastructure.yaml

# Deploy to development environment
sam deploy \
  --template-file seawater-infrastructure.yaml \
  --stack-name seawater-dev \
  --config-env dev \
  --parameter-overrides file://parameters/dev.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3
```

### Step 3: Deploy Security Policies

```bash
sam deploy \
  --template-file security-policies.yaml \
  --stack-name seawater-dev-security \
  --parameter-overrides Environment=dev ProjectName=seawater \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3
```

### Step 4: Initialize Database

```bash
# Get database endpoint from stack outputs
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name seawater-dev \
  --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" \
  --output text)

# Get database credentials from Secrets Manager
SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name seawater-dev \
  --query "Stacks[0].Outputs[?OutputKey=='DatabaseSecretArn'].OutputValue" \
  --output text)

DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ARN" \
  --query SecretString \
  --output text)

DB_USERNAME=$(echo "$DB_CREDENTIALS" | jq -r .username)
DB_PASSWORD=$(echo "$DB_CREDENTIALS" | jq -r .password)

# Initialize database schema
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_ENDPOINT" -U "$DB_USERNAME" -d seawater -f database/init-postgis.sql
```

### Step 5: Deploy Monitoring

```bash
sam deploy \
  --template-file monitoring/alarms.yaml \
  --stack-name seawater-dev-monitoring \
  --parameter-overrides \
    Environment=dev \
    ProjectName=seawater \
    AlertEmail=your-email@domain.com \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3
```

### Step 6: Deploy Cost Optimization (Production Only)

```bash
sam deploy \
  --template-file cost-optimization.yaml \
  --stack-name seawater-production-cost \
  --parameter-overrides \
    Environment=production \
    ProjectName=seawater \
    MonthlyBudgetLimit=500 \
    AlertEmail=finance@domain.com \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3
```

### Step 7: Deploy Disaster Recovery (Production Only)

```bash
sam deploy \
  --template-file disaster-recovery.yaml \
  --stack-name seawater-production-dr \
  --parameter-overrides \
    Environment=production \
    ProjectName=seawater \
    PrimaryRegion=us-east-1 \
    SecondaryRegion=us-west-2 \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3
```

## Post-Deployment Configuration

### 1. Configure API Keys

Update the API keys secret with your external service credentials:

```bash
aws secretsmanager put-secret-value \
  --secret-id seawater-dev-api-keys \
  --secret-string '{
    "mapbox_token": "your-mapbox-token",
    "fema_api_key": "your-fema-key",
    "first_street_api_key": "your-firststreet-key",
    "climate_check_api_key": "your-climatecheck-key",
    "jwt_secret": "your-jwt-secret"
  }'
```

### 2. Upload Frontend to S3

```bash
# Build frontend application
cd frontend
npm run build

# Upload to S3 bucket
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name seawater-dev \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text)

aws s3 sync build/ s3://$FRONTEND_BUCKET/
```

### 3. Configure CloudWatch Dashboard

```bash
# Replace placeholders in dashboard JSON
sed "s/\${Environment}/dev/g" monitoring/cloudwatch-dashboard.json > /tmp/dashboard.json

# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "seawater-dev-dashboard" \
  --dashboard-body file:///tmp/dashboard.json
```

### 4. Test Deployment

```bash
# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name seawater-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
  --output text)

# Test health endpoint
curl $API_URL/health

# Test risk endpoint
curl "$API_URL/risk/property?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA"
```

## Environment Promotion

### Development to Staging

```bash
# Deploy to staging with staging parameters
sam deploy \
  --template-file seawater-infrastructure.yaml \
  --stack-name seawater-staging \
  --config-env staging \
  --parameter-overrides file://parameters/staging.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

### Staging to Production

```bash
# Deploy to production with production parameters
sam deploy \
  --template-file seawater-infrastructure.yaml \
  --stack-name seawater-production \
  --config-env production \
  --parameter-overrides file://parameters/production.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

## Monitoring and Maintenance

### 1. View CloudWatch Dashboard

Navigate to CloudWatch console and view the dashboard:
```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=seawater-dev-dashboard
```

### 2. Monitor Costs

View cost dashboard and budgets:
```bash
aws budgets describe-budgets --account-id $(aws sts get-caller-identity --query Account --output text)
```

### 3. Database Backup

```bash
# Manual backup
./database/backup-restore.sh backup -e dev

# List available backups
./database/backup-restore.sh list

# Restore from backup
./database/backup-restore.sh restore -e dev -f backup_file.sql.gz
```

### 4. Health Checks

```bash
# Check all service health
aws lambda invoke \
  --function-name seawater-dev-dr-health-check \
  --payload '{}' \
  response.json && cat response.json
```

## Troubleshooting

### Common Issues

1. **Database Connection Timeout**
   ```bash
   # Check security groups
   aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
   
   # Verify VPC configuration
   aws ec2 describe-vpcs --vpc-ids vpc-xxxxxxxxx
   ```

2. **Lambda Function Errors**
   ```bash
   # View function logs
   aws logs describe-log-groups --log-group-name-prefix /aws/lambda/seawater-dev
   aws logs get-log-events --log-group-name /aws/lambda/seawater-dev-risk-aggregator --log-stream-name LATEST
   ```

3. **API Gateway 5xx Errors**
   ```bash
   # Check API Gateway logs
   aws logs get-log-events --log-group-name /aws/apigateway/seawater-dev
   ```

### Performance Optimization

1. **Lambda Memory Tuning**
   ```bash
   # Run cost optimization function
   aws lambda invoke \
     --function-name seawater-dev-cost-optimizer \
     --payload '{}' \
     response.json
   ```

2. **Database Query Optimization**
   ```sql
   -- Connect to database and analyze slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

## Disaster Recovery Testing

### Monthly DR Test

```bash
# Execute DR test
aws lambda invoke \
  --function-name seawater-production-dr-orchestrator \
  --payload '{"operation": "test"}' \
  dr_test_result.json

cat dr_test_result.json
```

### Failover Procedure

```bash
# In case of disaster, execute failover
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:seawater-production-dr-runbook \
  --input '{}'
```

## Cost Optimization

### Regular Cost Reviews

1. **Weekly Cost Analysis**
   ```bash
   aws lambda invoke \
     --function-name seawater-production-cost-optimizer \
     --payload '{}' \
     cost_analysis.json
   ```

2. **Monthly Budget Review**
   ```bash
   aws budgets describe-budget \
     --account-id $(aws sts get-caller-identity --query Account --output text) \
     --budget-name seawater-production-monthly-budget
   ```

## Security Best Practices

### 1. Regular Security Audits

```bash
# Check IAM policies
aws iam list-attached-role-policies --role-name seawater-dev-lambda-execution-role

# Scan for unused resources
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=seawater
```

### 2. Update Dependencies

```bash
# Audit Lambda function dependencies
cd src/lambda/risk-aggregator
npm audit
npm audit fix
```

### 3. Rotate Secrets

```bash
# Rotate database password
aws secretsmanager rotate-secret \
  --secret-id seawater-production-database-credentials \
  --rotation-rules AutomaticallyAfterDays=90
```

## Support and Documentation

### Additional Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [PostgreSQL + PostGIS Documentation](https://postgis.net/documentation/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

### Getting Help

1. Check CloudWatch logs for error details
2. Review AWS documentation for specific services
3. Use AWS Support for production issues
4. Consult the team's internal runbooks

### Updating This Guide

This deployment guide should be updated whenever:
- New infrastructure components are added
- Deployment procedures change
- New environments are created
- Security requirements change

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Next Review**: March 2024