# Callisto Integration Platform - Deployment Guide

This guide explains the environment-aware deployment strategy for the Callisto Integration Platform, ensuring proper separation between development and production scheduling.

## File Structure

### Core Files (Always Deploy)
- `callisto_integration_platform_extension.yaml` - All Lambda functions with manual/on-demand execution
- Main `lambda_with_auth.yaml` - Base infrastructure

### Environment-Specific Files
- `callisto_ecs_schedules.yaml` - **PRODUCTION ONLY** - Automatic scheduling infrastructure

## Deployment Strategy

### Development Environment

**Deploy ONLY:**
- Main stack with core Callisto functions
- NO automatic scheduling

```bash
# Development deployment (standard)
sam deploy --template-file lambda_with_auth.yaml \
           --stack-name tim-dev \
           --parameter-overrides EnvironmentName=development \
           --capabilities CAPABILITY_IAM

# All functions available via API for manual testing
# No automatic schedules running
# Certificate validation: Manual via API only
# Health monitoring: Manual via API only
# System cleanup: Manual via API only
```

**Functions Available in Development:**
- ✅ Manual certificate validation: `POST /tim/integrations/certificates/check-expiration`
- ✅ Manual health checks: `GET /tim/integrations/health`
- ✅ Manual batch processing: `POST /tim/integrations/batch/process`
- ✅ All integration management functions
- ❌ NO automatic scheduling

### Staging/Production Environment

**Deploy BOTH stacks:**

1. **First: Main stack** (same as development)
```bash
sam deploy --template-file lambda_with_auth.yaml \
           --stack-name tim-prod \
           --parameter-overrides EnvironmentName=production \
           --capabilities CAPABILITY_IAM
```

2. **Second: Scheduling stack** (production only)
```bash
sam deploy --template-file callisto_ecs_schedules.yaml \
           --stack-name tim-prod-scheduling \
           --parameter-overrides StackName=tim-prod EnvironmentName=production \
           --capabilities CAPABILITY_IAM
```

**Functions Available in Production:**
- ✅ All manual functions (same as development)
- ✅ **AUTOMATIC** certificate validation: Daily at 2 AM UTC
- ✅ **AUTOMATIC** health monitoring: Every 30 minutes
- ✅ **AUTOMATIC** system cleanup: Weekly Sunday 1 AM UTC
- ✅ CloudWatch alarms and SNS notifications
- ✅ ECS cluster for additional processing capacity

## System Schedules Created (Production Only)

| Schedule | Frequency | Function | Purpose |
|----------|-----------|----------|---------|
| Certificate Validation | Daily 2 AM UTC | `checkCertificateExpirationsFunction` | Validate certificates and credentials |
| Health Monitoring | Every 30 minutes | `getHealthMetricsFunction` | Monitor system health |
| Weekly Cleanup | Sunday 1 AM UTC | `scheduledBatchProcessorFunction` | Clean old data, archive metrics |

## Monitoring and Alerting (Production Only)

### CloudWatch Alarms
- **Certificate validation failures**: 3+ errors in 1 hour
- **Health monitoring failures**: 5+ errors in 30 minutes
- **SNS notifications**: Delivered to operations team

### Metrics Tracked
- Lambda function execution count
- Error rates by function
- Execution duration
- System health scores

## Database Considerations

The database includes both company-specific and system-level schedules:

### Schedule Scopes
- `company`: Client-specific integration schedules (managed via UI)
- `system`: Platform-wide maintenance schedules (managed by IAC)

### System Schedule Records
```sql
-- These are created by migration, activated by scheduling stack
SELECT * FROM "Integration_ECS_Schedules" WHERE "Schedule_Scope" = 'system';
```

## Migration Strategy

1. **Development**: Run all database migrations including system schedules
   - System schedules exist in DB but remain inactive (no EventBridge rules)
   - All testing done manually via API

2. **Production**: Deploy infrastructure to activate system schedules
   - Same database records now triggered by EventBridge
   - Automatic execution begins immediately

## Security Considerations

### IAM Roles and Permissions
- **ECSTaskExecutionRole**: ECS tasks can invoke Lambda functions
- **EventBridgeSchedulerRole**: EventBridge can trigger scheduled executions
- **Least privilege**: Each role has minimal required permissions

### Environment Isolation
- Development: No automatic execution, no external alerts
- Production: Full automation with monitoring and alerting

## Troubleshooting

### Development Issues
```bash
# Test certificate validation manually
curl -X POST https://api.example.com/tim/integrations/certificates/check-expiration \
     -H "Authorization: Bearer $TOKEN"

# Test health monitoring manually  
curl -X GET https://api.example.com/tim/integrations/health \
     -H "Authorization: Bearer $TOKEN"
```

### Production Issues
```bash
# Check EventBridge rules
aws events list-rules --name-prefix "tim-prod"

# Check Lambda function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/tim-prod"

# Check ECS cluster status
aws ecs describe-clusters --clusters callisto-integration-cluster
```

## Deployment Checklist

### Development Deployment
- [ ] Deploy main stack only
- [ ] Verify all API endpoints work manually
- [ ] Test integration management functions
- [ ] Confirm NO automatic schedules are running

### Production Deployment
- [ ] Deploy main stack first
- [ ] Verify main stack deployment successful
- [ ] Deploy scheduling stack second
- [ ] Verify EventBridge rules created
- [ ] Verify Lambda permissions granted
- [ ] Test automatic schedule execution
- [ ] Configure SNS topic subscribers
- [ ] Verify CloudWatch alarms active

## Cost Considerations

### Development
- **Low cost**: Only pay for manual API calls
- **No background processing**: No scheduled Lambda executions
- **Minimal CloudWatch**: Basic function logging only

### Production  
- **Scheduled executions**: 3 system schedules running automatically
- **CloudWatch alarms**: Additional monitoring costs
- **SNS notifications**: Alert delivery costs
- **ECS cluster**: On-demand Fargate tasks for heavy processing

## Support and Maintenance

For deployment issues:
1. Check CloudFormation stack events
2. Verify parameter values match environment
3. Ensure IAM permissions are correct
4. Review CloudWatch logs for function errors

For scheduling issues:
1. Check EventBridge rule configuration
2. Verify Lambda function permissions
3. Review execution history in CloudWatch
4. Check SNS topic for alert notifications
