# Partner Endpoints IAC Deployment Guide

## Overview
This guide explains how to deploy the new partner endpoints functionality to AWS using CloudFormation/SAM.

## Files Created
1. `partner_endpoints_additions.yaml` - Resources to add to existing GPT4.yaml

**Note:** The `partner_endpoints_additions.yaml` file shows validation errors in VSCode because it references resources from the main GPT4.yaml file. These errors are expected and will resolve when the content is merged into the main template.

## Deployment Steps (Add to Existing GPT4.yaml)

### Steps:
1. Open the existing `IAC/sam/GPT4.yaml` file
2. Copy the API Gateway resources from `partner_endpoints_additions.yaml` and add them to the Resources section
3. Copy the Lambda Function resources and add them to the Resources section
4. Deploy using your existing deployment process

### Resources to Add:

#### API Gateway Endpoints:
```yaml
# Add these to the Resources section of GPT4.yaml

  # Partner Discovery Endpoints
  getPartnerEndpointsApi:
    Type: AWS::Serverless::Api
    Properties:
      RestApiId: !Ref ApiGateway
      Path: /tim/integrations/partner-endpoints
      Method: GET
      Auth:
        Authorizer: CognitoAuthorizer

  getPartnerListApi:
    Type: AWS::Serverless::Api
    Properties:
      RestApiId: !Ref ApiGateway
      Path: /tim/integrations/partner-list
      Method: GET
      Auth:
        Authorizer: CognitoAuthorizer
```

#### Lambda Functions:
```yaml
  # Partner Discovery Functions
  getPartnerEndpointsFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri:
        Bucket: !Ref LambdaBucketName
        Key: getPartnerEndpoints.zip
      Handler: index.handler
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSG
        SubnetIds:
          - !Ref PrivateSubnet
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          DB_HOST: !Sub '{{resolve:ssm:/tim-db-host:1}}'
          DB_USER: !Sub '{{resolve:ssm:/tim-db-user:1}}'
          DB_PASS: !Sub '{{resolve:ssm:/tim-db-pass:1}}'
          DB_NAME: !Sub '{{resolve:ssm:/tim-db-name:1}}'
          DB_PORT: !Sub '{{resolve:ssm:/tim-db-port:1}}'
      Events:
        getPartnerEndpointsEvent:
          Type: AWS::Serverless::Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /tim/integrations/partner-endpoints
            Method: GET

  getPartnerListFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri:
        Bucket: !Ref LambdaBucketName
        Key: getPartnerList.zip
      Handler: index.handler
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSG
        SubnetIds:
          - !Ref PrivateSubnet
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          DB_HOST: !Sub '{{resolve:ssm:/tim-db-host:1}}'
          DB_USER: !Sub '{{resolve:ssm:/tim-db-user:1}}'
          DB_PASS: !Sub '{{resolve:ssm:/tim-db-pass:1}}'
          DB_NAME: !Sub '{{resolve:ssm:/tim-db-name:1}}'
          DB_PORT: !Sub '{{resolve:ssm:/tim-db-port:1}}'
      Events:
        getPartnerListEvent:
          Type: AWS::Serverless::Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /tim/integrations/partner-list
            Method: GET
```

## Option 2: Build Script Configuration

### Lambda Packaging
Ensure your build script creates these ZIP files in the S3 bucket:
- `getPartnerEndpoints.zip` - Contains the getPartnerEndpoints handler
- `getPartnerList.zip` - Contains the getPartnerList handler

### Build Script Updates
Add these lines to your lambda packaging script:
```bash
# Package partner endpoints handlers
cd src/backend/src/handlers/integrations/callisto/
zip -r getPartnerEndpoints.zip getPartnerEndpoints.js *.js
aws s3 cp getPartnerEndpoints.zip s3://${LAMBDA_BUCKET}/

zip -r getPartnerList.zip getPartnerList.js *.js  
aws s3 cp getPartnerList.zip s3://${LAMBDA_BUCKET}/
```

## API Endpoints Created

After deployment, these endpoints will be available:

### Partner Discovery
- `GET /tim/integrations/partner-endpoints` - Get detailed partner endpoint configurations
- `GET /tim/integrations/partner-list` - Get simple partner list for dropdowns

### Query Parameters
Both endpoints support filtering:
- `Partner_Type=source|target` - Filter by partner type
- `Integration_Category=HR_PAYROLL|TIME_TRACKING|ERP_DATABASE` - Filter by category
- `Difficulty_Level=easy|intermediate|advanced` - Filter by difficulty (partner-list only)
- `Connection_Type=oauth2_rest|api_key_rest|database_odbc` - Filter by connection type

### Example Usage
```javascript
// Get all partners
GET /tim/integrations/partner-list

// Get only source system partners
GET /tim/integrations/partner-list?Partner_Type=source

// Get detailed endpoint configurations for HR systems
GET /tim/integrations/partner-endpoints?Integration_Category=HR_PAYROLL

// Get easy-to-setup partners
GET /tim/integrations/partner-list?Difficulty_Level=easy
```

## Deployment Verification

After deployment, verify the endpoints are working:
```bash
# Test partner list endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api-gateway.execute-api.region.amazonaws.com/prod/tim/integrations/partner-list

# Test partner endpoints endpoint  
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api-gateway.execute-api.region.amazonaws.com/prod/tim/integrations/partner-endpoints
```

## Integration with Frontend

These endpoints provide the data needed for:
1. Partner selection dropdowns in template creation forms
2. Endpoint selection based on chosen partner
3. Authentication field auto-population
4. Setup difficulty indicators
5. Time estimates for integration setup

Example frontend integration:
```javascript
// Load partner options for dropdown
const partners = await fetch('/tim/integrations/partner-list?Partner_Type=source');

// Load detailed endpoints for selected partner
const endpoints = await fetch(`/tim/integrations/partner-endpoints?Partner_Type=source&Integration_Category=${selectedCategory}`);
