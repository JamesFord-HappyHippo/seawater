# TIM Platform IAC Restructure

## Overview

This document outlines the restructuring of the TIM Platform Infrastructure as Code (IAC) to eliminate Callisto/TimeBridge references and create a cleaner, more maintainable platform architecture.

## What Changed

### 1. Eliminated Legacy References
- ❌ Removed all Callisto/TimeBridge specific lambdas
- ❌ Eliminated conflicting path structures
- ❌ Removed redundant and duplicate endpoints
- ❌ Cleaned up complex nested path hierarchies

### 2. New Platform-Centric Structure
- ✅ Organized services into logical business domains
- ✅ Simplified API paths under `/tim/` namespace
- ✅ Consolidated similar functions into unified services
- ✅ Improved maintainability and deployment consistency

## New Service Architecture

### Service Categories

#### 1. **Client Management Services**
- `clientsService` - `/tim/clients` (GET, POST, PUT, DELETE)
- `companiesService` - `/tim/companies` (GET, POST, PUT, DELETE)
- `clientCompaniesService` - `/tim/clients/companies` (GET, POST, PUT, DELETE)

#### 2. **User Management Services**
- `usersService` - `/tim/users` (GET, POST, PUT, DELETE)
- `userEntitlementsService` - `/tim/users/entitlements` (GET, POST, PUT, DELETE)

#### 3. **Organizational Structure Services**
- `organizationService` - `/tim/organization` (GET)
- `departmentsService` - `/tim/departments` (GET, POST, PUT, DELETE)
- `jobsService` - `/tim/jobs` (GET, POST, PUT, DELETE)
- `locationsService` - `/tim/locations` (GET, POST, PUT, DELETE)

#### 4. **Employee Management Services**
- `employeesService` - `/tim/employees` (GET, POST, PUT, DELETE)
- `dataLoadService` - `/tim/data/load/*` (CSV, JSON, status, process)

#### 5. **Workflow and Approval Services**
- `approvalGroupsService` - `/tim/approvals/groups` (GET, POST, PUT, DELETE)
- `workflowActionsService` - `/tim/workflow/actions/*` (initiate, pending, completed, approve, reject, stats)
- `workflowConfigService` - `/tim/workflow/config/*` (actions, approvals)
- `agentTriggersService` - `/tim/workflow/agent-triggers` (GET, POST, PUT, DELETE, check)

#### 6. **Analytics and Reporting Services**
- `wageAnalyticsService` - `/tim/analytics/wages/*` (company, department, job, location)
- `attritionAnalyticsService` - `/tim/analytics/attrition/*` (company, department, job, location, candidates)
- `tenureAnalyticsService` - `/tim/analytics/tenure/*` (company, department, job, location)
- `workforcePlanningService` - `/tim/analytics/workforce/*` (plan, backfill-priorities)

#### 7. **Performance Management Services**
- `performanceEvaluationService` - `/tim/performance/evaluations` (GET, POST, PUT, DELETE)
- `performanceMetricsService` - `/tim/performance/metrics/*` (company, client)
- `riskAnalysisService` - `/tim/performance/risk/*` (regrettable, trends)
- `careerDevelopmentService` - `/tim/performance/career/*` (guidance, recommendations)
- `managerService` - `/tim/managers/*` (assignments, scores, scoreboard)

#### 8. **Communication Services**
- `emailService` - `/tim/email/*` (send, send-rejection, CRUD operations, feedback)
- `emailTemplatesService` - `/tim/email/templates` (GET, POST, PUT, DELETE)

#### 9. **System Monitoring Services**
- `alertsService` - `/tim/system/alerts` (GET)
- `eventAnalyticsService` - `/tim/system/events` (GET)

#### 10. **Specialized Features**
- `criticalJobsService` - `/tim/jobs/critical` (GET, POST, PUT, DELETE)

## Key Improvements

### 1. **Simplified Path Structure**
```yaml
# Old (Complex and Inconsistent)
/tim/company/action/approval-stats
/tim/company/action/completed-actions
/tim/company/action/pending-actions
/tim/company/deptdetail
/tim/company/jobdetail
/tim/company/locationdetail

# New (Clean and Consistent)
/tim/workflow/actions/stats
/tim/workflow/actions/completed
/tim/workflow/actions/pending
/tim/departments
/tim/jobs
/tim/locations
```

### 2. **Consolidated Lambda Functions**
- **Before**: 100+ individual lambda functions for CRUD operations
- **After**: 20 service-oriented lambdas handling multiple related operations
- **Benefit**: Easier maintenance, deployment, and monitoring

### 3. **Logical Grouping**
Services are now grouped by business domain rather than technical operation:
- All analytics under `/tim/analytics/*`
- All workflow operations under `/tim/workflow/*`
- All performance management under `/tim/performance/*`

### 4. **Improved Maintainability**
```yaml
# Single service handles all related operations
workflowActionsService:
  Events:
    - InitiateAction: POST /tim/workflow/actions/initiate
    - GetPendingActions: GET /tim/workflow/actions/pending
    - GetCompletedActions: GET /tim/workflow/actions/completed
    - ApproveAction: POST /tim/workflow/actions/approve
    - RejectAction: POST /tim/workflow/actions/reject
    - GetActionStats: GET /tim/workflow/actions/stats
```

## Migration Strategy

### Phase 1: Deploy New Services (Safe)
1. Deploy `tim-platform-services.yaml` alongside existing infrastructure
2. New services will not conflict with existing ones
3. Test new endpoints independently

### Phase 2: Update Frontend API Calls
1. Update frontend API endpoint configurations
2. Test functionality with new endpoints
3. Ensure all features work correctly

### Phase 3: Remove Legacy Infrastructure
1. Once new services are confirmed working
2. Remove old lambda functions and paths
3. Clean up unused resources

## Deployment Commands

```bash
# Deploy new platform services
sam deploy --template-file tim-platform-services.yaml \
           --stack-name tim-platform-services \
           --capabilities CAPABILITY_IAM \
           --parameter-overrides \
             TIMBucketName=tim-dev-lambda \
             AppName=TIMPlatform

# Validate deployment
aws apigateway get-rest-apis --query 'items[?name==`TimPlatformServices`]'
```

## Lambda Function Naming Convention

```yaml
# Service Pattern
{domain}Service:
  CodeUri: {domain}Service_js.zip
  
# Examples
clientsService_js.zip        # Handles all client operations
workflowActionsService_js.zip # Handles all workflow actions
emailService_js.zip          # Handles all email operations
```

## Environment Variables

All services inherit consistent environment variables:
```yaml
DB_HOST: Database hostname
DB_USER: Database username  
DB_PASS: Database password
DB_NAME: Database name
DB_PORT: Database port
```

## Security

- All endpoints require Cognito authentication
- Consistent IAM role across all services
- VPC access for database connectivity
- SES permissions for email services

## Benefits of New Structure

1. **Reduced Complexity**: 20 services vs 100+ individual functions
2. **Better Organization**: Logical grouping by business domain
3. **Easier Maintenance**: Related operations in single service
4. **Consistent Patterns**: Standard CRUD operations across services
5. **Simplified Deployment**: Single template for entire platform
6. **Cost Optimization**: Fewer cold starts, better resource utilization
7. **Improved Monitoring**: Easier to track and debug issues

## Next Steps

1. ✅ **Complete**: New IAC structure created
2. 🔄 **In Progress**: Update frontend API endpoints
3. ⏳ **Pending**: Deploy and test new services
4. ⏳ **Pending**: Migrate production traffic
5. ⏳ **Pending**: Remove legacy infrastructure

## Rollback Plan

If issues arise:
1. Keep legacy `lambda_with_auth.yaml` as backup
2. Switch frontend back to old endpoints
3. Remove new stack: `aws cloudformation delete-stack --stack-name tim-platform-services`
4. Resume using original infrastructure

## Contact

For questions about this restructure, contact the platform team.
