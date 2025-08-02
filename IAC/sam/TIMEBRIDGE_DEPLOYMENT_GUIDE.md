# TimeBridge Lambda Functions Deployment Guide

## 📋 Overview

This guide covers deploying the TimeBridge integration Lambda functions using AWS SAM (Serverless Application Model). The TimeBridge extension adds QuickBooks Time → ADP Workforce Now integration capabilities to the existing infrastructure.

## 🏗️ Architecture Components

### **Lambda Functions Deployed:**
1. **QuickBooksTimeExtractFunction** - Extracts time data from QuickBooks Time API
2. **TimeBridgeProcessPayrollFunction** - End-to-end payroll processing pipeline
3. **QuickBooksOAuthFunction** - Handles QuickBooks OAuth authentication
4. **EmployeeMappingFunction** - Manages employee mapping between systems
5. **TimeBridgeStatusFunction** - Monitors processing status and health
6. **TimeBridgeAuditFunction** - Provides audit trails and reporting

### **API Endpoints Created:**
- `POST /integrations/quickbooks/time-extract`
- `POST /integrations/timebridge/process-payroll`
- `GET/POST /integrations/quickbooks/oauth`
- `GET/POST/PUT/DELETE /integrations/employee-mapping`
- `GET /integrations/timebridge/status`
- `GET /integrations/timebridge/audit`

## 🚀 Deployment Steps

### **1. Prepare Lambda Deployment Packages**

Create ZIP files for each handler:

```bash
# Navigate to backend source directory
cd src/backend/src

# Create QuickBooks Time Extract package
mkdir -p dist/quickbooks_timeExtract
cp handlers/integrations/quickbooks/timeExtract.js dist/quickbooks_timeExtract/
cp -r helpers/ dist/quickbooks_timeExtract/
cd dist/quickbooks_timeExtract && zip -r ../../quickbooks_timeExtract_js.zip . && cd ../..

# Create TimeBridge Process Payroll package
mkdir -p dist/timebridge_processPayroll
cp handlers/integrations/timebridge/processPayroll.js dist/timebridge_processPayroll/
cp -r helpers/ dist/timebridge_processPayroll/
cd dist/timebridge_processPayroll && zip -r ../../timebridge_processPayroll_js.zip . && cd ../..

# Create additional function packages as needed...
```

### **2. Upload Packages to S3**

Upload the ZIP files to your deployment bucket:

```bash
# Upload to the TIM deployment bucket
aws s3 cp quickbooks_timeExtract_js.zip s3://your-tim-bucket-name/
aws s3 cp timebridge_processPayroll_js.zip s3://your-tim-bucket-name/
aws s3 cp quickbooks_oauth_js.zip s3://your-tim-bucket-name/
aws s3 cp employee_mapping_js.zip s3://your-tim-bucket-name/
aws s3 cp timebridge_status_js.zip s3://your-tim-bucket-name/
aws s3 cp timebridge_audit_js.zip s3://your-tim-bucket-name/
```

### **3. Deploy Using SAM**

#### **Option A: Update Existing Stack**

Add the TimeBridge extension to your main SAM template:

```yaml
# In your main template.yaml
Transform: AWS::Serverless-2016-10-31

# Add this include to merge the TimeBridge resources
Resources:
  # Your existing resources...
  
  # Include TimeBridge extension
  TimeBridgeExtension:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: timebridge_extension.yaml
      Parameters:
        TIMBucketName: !Ref TIMBucketName
        LambdaExecutionRole: !Ref LambdaExecutionRole
        ApiGateway: !Ref ApiGateway
        timhost: !Ref timhost
        timuser: !Ref timuser
        tim4pass: !Ref tim4pass
        timname: !Ref timname
        timport: !Ref timport
```

#### **Option B: Deploy as Separate Stack**

```bash
# Deploy the TimeBridge extension as a nested stack
sam deploy \
  --template-file timebridge_extension.yaml \
  --stack-name tim-timebridge-extension \
  --parameter-overrides \
    TIMBucketName=your-bucket-name \
    LambdaExecutionRoleArn=your-lambda-role-arn \
    ApiGatewayId=your-api-gateway-id \
    timhost=your-db-host \
    timuser=your-db-user \
    tim4pass=your-db-password \
    timname=your-db-name \
    timport=your-db-port \
  --capabilities CAPABILITY_IAM
```

### **4. Verify Deployment**

Test the deployed endpoints:

```bash
# Test QuickBooks extraction endpoint
curl -X POST \
  https://your-api-gateway.execute-api.region.amazonaws.com/Prod/integrations/quickbooks/time-extract \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Company_ID": "test-company-123",
    "Pay_Period_Start": "2024-01-01",
    "Pay_Period_End": "2024-01-14"
  }'

# Test TimeBridge processing endpoint
curl -X POST \
  https://your-api-gateway.execute-api.region.amazonaws.com/Prod/integrations/timebridge/process-payroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Company_ID": "test-company-123",
    "Pay_Period_Start": "2024-01-01",
    "Pay_Period_End": "2024-01-14"
  }'
```

## 🔧 Configuration Requirements

### **Environment Variables (Automatically Set):**
- `DB_HOST` - Database hostname
- `DB_USER` - Database username  
- `DB_PASS` - Database password
- `DB_NAME` - Database name
- `DB_PORT` - Database port
- `NODE_ENV` - Set to 'production'

### **IAM Permissions Required:**
- Database access (inherited from LambdaExecutionRole)
- CloudWatch Logs (included in TimeBridgePolicy)
- Secrets Manager access (for future credential storage)
- SSM Parameter Store access (for configuration)

### **Lambda Function Specifications:**
- **Runtime**: Node.js 18.x
- **Memory**: 256MB - 1024MB (varies by function)
- **Timeout**: 60s - 900s (varies by function)
- **Concurrent Executions**: Default (can be configured)

## 📊 Monitoring and Alerting

### **CloudWatch Alarms Created:**
- **TimeBridge-ProcessingErrors** - Monitors processing failures
- **SNS Topic**: timebridge-errors for notifications

### **Metrics to Monitor:**
- Function Duration
- Error Rate
- Invocation Count
- Throttles
- Dead Letter Queue Messages

### **Log Groups Created:**
- `/aws/lambda/timebridge-*` - All TimeBridge function logs

## 🔒 Security Configuration

### **Authentication:**
- All endpoints protected by Cognito Authorizer
- Company-level access control via integrationSecurity
- SuperUser validation for admin functions

### **Secrets Management:**
- QuickBooks credentials stored in Integration_Credentials table
- SSL certificates for ADP stored securely
- Database credentials via environment variables

### **Network Security:**
- Functions run in AWS Lambda execution environment
- Database access via VPC if configured
- API Gateway rate limiting can be configured

## 🧪 Testing Strategy

### **Unit Testing:**
```bash
# Test individual handlers locally
cd src/backend/src
node -e "
const handler = require('./handlers/integrations/quickbooks/timeExtract.js');
const testEvent = { /* test event */ };
handler.handler(testEvent).then(console.log);
"
```

### **Integration Testing:**
1. Test QuickBooks API connectivity
2. Test database operations
3. Test ADP API integration
4. Test end-to-end pipeline

### **Load Testing:**
- Use AWS Load Testing solution
- Test with realistic payroll data volumes
- Monitor Lambda concurrency and throttling

## 🔄 Deployment Rollback

If issues occur, rollback steps:

```bash
# Rollback CloudFormation stack
aws cloudformation cancel-update-stack --stack-name tim-timebridge-extension

# Or delete and redeploy previous version
aws cloudformation delete-stack --stack-name tim-timebridge-extension
```

## 📈 Scaling Considerations

### **Lambda Scaling:**
- Functions auto-scale based on demand
- Configure reserved concurrency if needed
- Monitor cold start times

### **Database Scaling:**
- Ensure RDS can handle increased connections
- Monitor query performance
- Consider read replicas for reporting functions

### **API Gateway Scaling:**
- Configure throttling limits
- Monitor request rates
- Set up caching for status endpoints

## 🎯 Success Criteria

### **Deployment Success:**
- ✅ All 6 Lambda functions deployed successfully
- ✅ API Gateway endpoints responding
- ✅ CloudWatch alarms configured
- ✅ IAM permissions working correctly

### **Functional Success:**
- ✅ QuickBooks authentication working
- ✅ Time data extraction functioning
- ✅ Data transformation accurate
- ✅ ADP submission successful
- ✅ Audit trails complete

### **Performance Success:**
- ✅ Processing completes within timeout limits
- ✅ Error rates < 1%
- ✅ API response times < 30 seconds
- ✅ Database queries optimized

## 📞 Support and Troubleshooting

### **Common Issues:**
1. **Lambda Timeout** - Increase timeout or optimize code
2. **Database Connection Errors** - Check VPC configuration
3. **API Gateway 403** - Verify Cognito authorization
4. **QuickBooks API Errors** - Check credentials and rate limits

### **Debug Commands:**
```bash
# Check function logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/timebridge

# Monitor function metrics
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration

# Test function directly
aws lambda invoke --function-name QuickBooksTimeExtractFunction test-output.json
```

This deployment guide provides comprehensive instructions for deploying the TimeBridge Lambda functions into your existing AWS infrastructure using SAM templates.
