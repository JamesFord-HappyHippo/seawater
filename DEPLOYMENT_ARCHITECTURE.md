# Tim-Combo Deployment Architecture

## Multi-Account, Multi-CloudFront Strategy

Tim-Combo uses a sophisticated deployment architecture with backend/frontend separation across multiple AWS accounts and CloudFront distributions.

## Account Structure

### Development Account (532595801838)
- **Primary Role**: Backend Lambda execution and database operations
- **Resources**: 
  - RDS PostgreSQL: `happy2.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com`
  - Lambda Functions: 311+ handlers
  - S3 Lambda Artifacts: `tim-dev-lambda`
  - API Gateway: `https://n2eqji12v4.execute-api.us-east-2.amazonaws.com`

### Sandbox Account (455510265254) 
- **Primary Role**: Testing environment (Flux Systems branding)
- **Resources**:
  - RDS PostgreSQL: `fluxcapacitor2325.c9ncobp8exjr.us-east-2.rds.amazonaws.com`
  - Lambda Functions: Synced from dev account
  - S3 Lambda Artifacts: `tim-sb-be-live`
  - API Gateway: `https://k0y33bw7t8.execute-api.us-east-2.amazonaws.com`

### Media Account (855652006097)
- **Primary Role**: Frontend hosting and CDN distribution
- **Resources**:
  - S3 Frontend Assets: `tim-sb-fe-live-855652006097`
  - CloudFront Distributions: Multiple per product/environment
  - Static Site Hosting: Separate from application hosting

## CloudFront Distribution Strategy

### Per-Product CloudFront Architecture

Each product requires **minimum 2 CloudFront distributions**:
1. **Application Distribution**: Dynamic React app with API integration
2. **Static Site Distribution**: Marketing pages, documentation, assets

## Route 53 DNS Configuration

### DNS Record Structure

For each product domain (e.g., `tim-combo.com`, `flux-systems.info`):

#### **Root Domain (Static Site)**
- **Record Type**: A Record (Alias)
- **Name**: `@` (root domain)
- **Target**: CloudFront Distribution (Static Site)
- **Example**: `tim-combo.com` → Static Site Distribution
- **Purpose**: Marketing pages, documentation, company information

#### **Application Subdomains (CNAME Records)**
```yaml
# Development Environment
dev.tim-combo.com:
  Type: CNAME
  Target: dev-app-distribution.cloudfront.net
  
# Test Environment  
test.tim-combo.com:
  Type: CNAME
  Target: test-app-distribution.cloudfront.net
  
# Staging Environment
stage.tim-combo.com:
  Type: CNAME
  Target: stage-app-distribution.cloudfront.net
  
# Production Application
app.tim-combo.com:
  Type: CNAME
  Target: prod-app-distribution.cloudfront.net
```

#### **Current Implementation Example (Flux Systems)**
```yaml
# Root domain (Static Site)
flux-systems.info:
  Type: A (Alias)
  Target: static-site-distribution.cloudfront.net
  
# Application (Production)
app.flux-systems.info:
  Type: CNAME 
  Target: E25ON3LWW4KFNF.cloudfront.net
  
# Development environments (when implemented)
dev.flux-systems.info:
  Type: CNAME
  Target: dev-app-distribution.cloudfront.net
```

### SSL Certificate Management

#### **Wildcard Certificates**
- **Certificate Scope**: `*.domain.com` and `domain.com`
- **AWS Certificate Manager**: Auto-renewal enabled
- **Validation Method**: DNS validation via Route 53
- **Distribution**: CloudFront distributions reference same certificate

#### **Certificate Example**
```yaml
Certificate: arn:aws:acm:us-east-1:account:certificate/cert-id
Domains:
  - tim-combo.com
  - "*.tim-combo.com"
Status: ISSUED
Validation: DNS (Route 53 automatic)
```

### Traffic Routing Strategy

#### **User Journey Flow**
1. **Marketing Visit**: `tim-combo.com` → Static Site Distribution → Marketing pages
2. **Application Access**: `app.tim-combo.com` → App Distribution → React SPA
3. **Development Testing**: `dev.tim-combo.com` → Dev Distribution → Latest builds
4. **Staging Validation**: `stage.tim-combo.com` → Stage Distribution → Pre-prod testing

#### **SEO and Performance Benefits**
- **Root Domain Authority**: Marketing content maintains domain authority
- **Application Performance**: Dedicated CloudFront optimization for SPA
- **Environment Isolation**: Clear separation between dev/test/stage/prod
- **Cache Optimization**: Different TTL strategies per content type

### Full Production Architecture (5 distributions per product)

#### **Application Distributions**
1. **Development App**: `dev-app.tim-combo.com`
   - Origin: S3 bucket with dev build
   - Behaviors: SPA routing, API proxy
   - Cache: Short TTL for development

2. **Test App**: `test-app.tim-combo.com`
   - Origin: S3 bucket with test build
   - Behaviors: SPA routing, API proxy
   - Cache: Medium TTL for testing

3. **Stage App**: `stage-app.tim-combo.com`
   - Origin: S3 bucket with staging build
   - Behaviors: SPA routing, API proxy
   - Cache: Production-like TTL

4. **Production App**: `app.tim-combo.com`
   - Origin: S3 bucket with production build
   - Behaviors: SPA routing, API proxy
   - Cache: Optimized production TTL

#### **Static Site Distribution**
5. **Static Marketing**: `www.tim-combo.com`
   - Origin: S3 bucket with marketing site
   - Behaviors: Static content serving
   - Cache: Long TTL for static assets

### Current Implementation Example (Flux Systems)

#### **Application Distribution** 
- **ID**: `E25ON3LWW4KFNF`
- **Domain**: `app.flux-systems.info`
- **Origin**: S3 `tim-sb-fe-live-855652006097`
- **Purpose**: React application hosting
- **Invalidation**: Automatic on deployment

#### **Static Site Distribution**
- **Domain**: `flux-systems.info` 
- **Origin**: Separate S3 bucket for static content
- **Purpose**: Marketing pages, documentation
- **Cache**: Long TTL optimization

## Deployment Pipeline Architecture

### Backend Deployment Flow

```bash
# 1. Development Account (Source)
aws s3 sync src/ s3://tim-dev-lambda/ --profile dev-sso

# 2. Cross-Account Sync to Sandbox
aws s3 sync s3://tim-dev-lambda/ s3://tim-sb-be-live/ --profile sandbox-sso

# 3. Lambda Function Updates
aws lambda update-function-code --function-name handlerName --s3-bucket tim-sb-be-live --s3-key handler.zip
```

### Frontend Deployment Flow

```bash
# 1. Environment-Specific Build
npm run build:dev     # Development environment
npm run build:test    # Test environment  
npm run build:stage   # Staging environment
npm run build:prod    # Production environment

# 2. Deploy to Media Account
aws s3 sync build/ s3://tim-app-dev-855652006097/ --profile media-sso --delete
aws s3 sync build/ s3://tim-app-test-855652006097/ --profile media-sso --delete
aws s3 sync build/ s3://tim-app-stage-855652006097/ --profile media-sso --delete
aws s3 sync build/ s3://tim-app-prod-855652006097/ --profile media-sso --delete

# 3. CloudFront Invalidation
aws cloudfront create-invalidation --distribution-id E25ON3LWW4KFNF --paths "/*" --profile media-sso
```

## Environment Configuration

### Backend Environment Variables

#### Development
```yaml
# .env.development
REACT_APP_API_URL=https://n2eqji12v4.execute-api.us-east-2.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=us-east-2_oWj5l1j6m
REACT_APP_COGNITO_CLIENT_ID=oah0kkkfg9rsrrnplm17u49p0
REACT_APP_FROM_EMAIL=noreply@happyhippo.ai
REACT_APP_SUPPORT_EMAIL=support@happyhippo.ai
```

#### Sandbox/Test
```yaml
# .env.sandbox
REACT_APP_API_URL=https://k0y33bw7t8.execute-api.us-east-2.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=us-east-2_57sEtr0xp
REACT_APP_COGNITO_CLIENT_ID=7kd60mm3dknahib7d84nqvla43
REACT_APP_FROM_EMAIL=noreply@flux-systems.info
REACT_APP_SUPPORT_EMAIL=support@flux-systems.info
REACT_APP_ADP_PILOT_MODE=true
```

### CloudFront Behavior Configuration

#### Application Distribution Behaviors
```yaml
# SPA Routing (Priority 0)
PathPattern: "*"
TargetOrigin: S3-tim-app-prod
ViewerProtocol: redirect-to-https
Compress: true
CachePolicyId: SPA-Optimized
OriginRequestPolicyId: CORS-S3Origin

# API Proxy (Priority 100)  
PathPattern: "/api/*"
TargetOrigin: API-Gateway
ViewerProtocol: https-only
CachePolicyId: CachingDisabled
OriginRequestPolicyId: AllViewer
```

#### Static Site Distribution Behaviors
```yaml
# Root Content (Priority 0)
PathPattern: "*"
TargetOrigin: S3-static-content
ViewerProtocol: redirect-to-https
Compress: true
CachePolicyId: Managed-CachingOptimized

# Assets (Priority 100)
PathPattern: "/assets/*"  
TargetOrigin: S3-static-content
ViewerProtocol: https-only
CachePolicyId: Managed-CachingOptimizedForUncompressedObjects
```

## Security and Access Control

### Cross-Account Access
- **OIDC Authentication**: AWS SSO integration for cross-account deployment
- **IAM Roles**: Least privilege access for each deployment account
- **S3 Bucket Policies**: Restricted access with specific account permissions

### CloudFront Security
- **Origin Access Control**: S3 buckets not publicly accessible
- **SSL/TLS**: Enforce HTTPS with minimum TLS 1.2
- **Security Headers**: HSTS, CSP, X-Frame-Options configured
- **WAF Integration**: Web Application Firewall for production

## Monitoring and Observability

### CloudFront Metrics
- **Request Count**: Monitor traffic patterns across distributions
- **Cache Hit Ratio**: Optimize cache performance
- **Origin Response Time**: Backend performance monitoring
- **Error Rates**: 4xx/5xx error tracking

### Deployment Monitoring
- **Build Success Rate**: CI/CD pipeline health
- **Invalidation Status**: Cache clearing verification
- **Cross-Account Sync**: Artifact deployment success
- **Lambda Update Status**: Function deployment verification

## Disaster Recovery

### Backup Strategy
- **S3 Versioning**: Enabled on all deployment buckets
- **Cross-Region Replication**: Critical assets replicated
- **Lambda Function Versions**: Immutable deployment artifacts
- **Database Backups**: Automated RDS snapshots

### Rollback Procedures
```bash
# Frontend Rollback
aws s3 sync s3://tim-app-backup-bucket/v1.2.3/ s3://tim-app-prod-855652006097/ --profile media-sso
aws cloudfront create-invalidation --distribution-id E25ON3LWW4KFNF --paths "/*" --profile media-sso

# Backend Rollback  
aws lambda update-function-code --function-name handlerName --s3-bucket tim-sb-be-live --s3-key previous-version.zip
```

## Cost Optimization

### CloudFront Optimization
- **Price Class**: Use Price Class 100 for cost-sensitive environments
- **Compression**: Enable for all text-based content
- **Cache Optimization**: Maximize cache hit ratio
- **Origin Shield**: Consider for high-traffic applications

### S3 Storage Optimization
- **Intelligent Tiering**: Automatic cost optimization for static assets
- **Lifecycle Policies**: Archive old deployment artifacts
- **Cross-Account Transfer**: Optimize data transfer costs

## Implementation Checklist

### Per-Product Setup
- [ ] Create 5 S3 buckets per product (dev/test/stage/prod/static)
- [ ] Configure 5 CloudFront distributions per product
- [ ] Set up environment-specific build configurations
- [ ] Configure cross-account IAM roles and policies
- [ ] Implement automated deployment pipelines
- [ ] Set up monitoring and alerting
- [ ] Document rollback procedures
- [ ] Test disaster recovery processes

### DNS Configuration
- [ ] Register domain in Route 53 hosted zone
- [ ] Create A record (alias) for root domain to static site distribution
- [ ] Create CNAME records for each application environment:
  - [ ] `dev.domain.com` → Development app distribution
  - [ ] `test.domain.com` → Test app distribution 
  - [ ] `stage.domain.com` → Staging app distribution
  - [ ] `app.domain.com` → Production app distribution
- [ ] Request wildcard SSL certificate in ACM (us-east-1 for CloudFront)
- [ ] Configure DNS validation for certificate
- [ ] Associate certificate with all CloudFront distributions

### Security Hardening  
- [ ] Enable S3 bucket encryption
- [ ] Configure CloudFront Origin Access Control
- [ ] Implement WAF rules for production
- [ ] Set up SSL certificate management
- [ ] Configure security headers
- [ ] Enable access logging
- [ ] Implement least-privilege IAM policies

This architecture provides enterprise-grade deployment capabilities with proper separation of concerns, security isolation, and scalable infrastructure management.