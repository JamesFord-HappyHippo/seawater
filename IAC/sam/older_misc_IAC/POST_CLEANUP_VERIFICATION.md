# 🔧 Post-Cleanup Verification Checklist

## **Step 1: Remove Callisto Handlers from template.yml**

**Remove all functions starting with `callisto*`:**
```bash
# Functions to remove from your template.yml:
callistoCreateIntegrationFunction
callistoListIntegrationsFunction  
callistoUpdateIntegrationFunction
callistoDeleteIntegrationFunction
callistoGetClientDashboardFunction
callistoCreateMappingFunction
callistoExecuteIntegrationFunction
callistoUploadCertificateFunction
callistoListCertificatesFunction
callistoUpdateCertificateFunction
callistoDeleteCertificateFunction
callistoCheckCertificateExpirationsFunction
callistoGetHealthMetricsFunction
callistoGetCertificateAlertsFunction
callistoAcknowledgeAlertFunction
callistoResolveAlertFunction
callistoManageScheduleFunction
callistoManageECSScheduleFunction
callistoScheduleListFunction
callistoGenerateJWTTokenFunction
callistoGetPendingActionsFunction
callistoGetNotificationCountFunction
callistoProcessResponseFunction
callistoListTemplatesFunction
callistoManageTemplateOverridesFunction
callistoErrorLogsFunction
# Plus all email-related callisto functions
```

## **Step 2: Re-merge Extension File**

**After cleanup, merge this file:**
```
IAC/sam/callisto_integration_platform_extension.yaml
```

## **Step 3: Verify Functions Present**

**✅ Extension file should provide these 28 functions:**

### **Integration Management (5)**
- ✅ `listIntegrationsFunction`
- ✅ `createIntegrationFunction` 
- ✅ `updateIntegrationFunction`
- ✅ `deleteIntegrationFunction`
- ✅ `getClientDashboardFunction`

### **Certificate Management (5)**
- ✅ `listCertificatesFunction`
- ✅ `uploadCertificateFunction`
- ✅ `updateCertificateFunction`
- ✅ `deleteCertificateFunction`
- ✅ `checkCertificateExpirationsFunction`

### **Monitoring & Alerts (4)**
- ✅ `getHealthMetricsFunction`
- ✅ `getCertificateAlertsFunction`
- ✅ `acknowledgeAlertFunction`
- ✅ `resolveAlertFunction`

### **Self-Service Onboarding (3)**
- ✅ `startOnboardingFunction`
- ✅ `updateOnboardingSessionFunction`
- ✅ `completeOnboardingFunction`

### **Operational Processing (3)**
- ✅ `processEventsFunction`
- ✅ `transformDataFunction`
- ✅ `generateOutputFunction`

### **Schedule Management (2)**
- ✅ `manageECSScheduleFunction`
- ✅ `scheduledBatchProcessorFunction`

### **Business Rules & JWT (2)**
- ✅ `executeBusinessRulesFunction`
- ✅ `generateJWTTokenFunction`

### **New Mapping System (2)**
- ✅ `createMappingFunction` ⭐ **NEW**
- ✅ `executeIntegrationFunction` ⭐ **NEW**

### **TimeBridge Integration (2)**
- ✅ `timebridgeScheduleSyncFunction` ⭐ **NEW**
- ✅ `timebridgeDataSyncFunction` ⭐ **NEW**

## **Step 4: Verify Handler Files**

**✅ Ensure these handler files exist:**
```
src/backend/src/handlers/integrations/callisto/
├── createMapping.js ⭐ NEW
├── executeIntegration.js ⭐ NEW  
├── timebridgeScheduleSync.js ⭐ NEW
├── timebridgeDataSync.js ⭐ NEW
├── createIntegration.js
├── listIntegrations.js
├── updateIntegration.js
├── deleteIntegration.js
├── getClientDashboard.js
├── uploadCertificate.js
├── listCertificates.js
├── updateCertificate.js
├── deleteCertificate.js
├── checkCertificateExpirations.js
├── getHealthMetrics.js
├── getCertificateAlerts.js
├── acknowledgeAlert.js
├── resolveAlert.js
├── manageECSSchedule.js
├── generateJWTToken.js
└── (plus existing handlers)
```

## **Step 5: Post-Merge Verification**

**Run this grep to verify no duplicates:**
```bash
grep -c "Function:" template.yml
# Should show reasonable count with no callisto* duplicates

grep "Function:" template.yml | grep -E "(Integration|Certificate|Mapping|TimeBridge)" | sort
# Should show clean list without duplicates
```

## **Step 6: Key Verification Points**

### **✅ API Paths Should Be:**
- `/tim/integrations/configurations` (CRUD)
- `/tim/integrations/certificates` (Certificates)
- `/tim/integrations/mapping` (NEW - Field Mapping)
- `/tim/integrations/execute` (NEW - Execute Integration)
- `/tim/integrations/timebridge/*` (NEW - TimeBridge)
- `/tim/integrations/health` (Monitoring)
- `/tim/integrations/alerts` (Alerts)

### **✅ Handler Pattern Should Be:**
- `Handler: index.handler` (ALL functions)

### **✅ ZIP Names Should Be:**
- `functionName_js.zip` pattern
- Example: `createMapping_js.zip`

## **Step 7: Deploy Test**

**After cleanup and re-merge:**
```bash
sam validate --template template.yml
# Should pass without errors

sam build --template template.yml
# Should build successfully
```

## **🎯 Expected Outcome**

After cleanup and re-merge, you should have:
- ✅ **28 integration functions** (no duplicates)
- ✅ **Clean function names** (no callisto prefix)
- ✅ **4 new handlers** working with helper system
- ✅ **Consistent API paths** under `/tim/integrations/*`
- ✅ **Ready for production deployment**

The extension file we created contains everything needed to replace the old callisto handlers with the new streamlined approach.
