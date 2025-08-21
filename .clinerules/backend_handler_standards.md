# Backend Handler Standards

## Method-Specific Handler Architecture (August 2025) ✅

### Current Pattern: Single HTTP Method Per Handler
**Status**: Ready for deployment to Seawater climate platform
**Achievement**: Proven pattern with 63+ method-specific handlers in Tim-Combo

### HTTP Method Parameter Conventions
**Strict adherence required for consistent climate API behavior:**

```javascript
// GET/DELETE Methods - Use queryStringParameters for climate queries
async function getPropertyRiskHandler({ queryStringParameters: queryParams = {}, requestContext }) {
    // ✅ CORRECT: Access query parameters for climate data
    const address = queryParams.address;
    const riskSources = queryParams.sources;
    const coordinates = queryParams.coordinates;
}

// POST/PUT Methods - Use body (requestBody) for climate assessments
async function createRiskAssessmentHandler({ body: requestBody = {}, requestContext }) {
    // ✅ CORRECT: Access request body for climate submissions
    const propertyData = requestBody.property_data;
    const riskParameters = requestBody.risk_parameters;
}
```

### Method-Specific Naming Convention
**Handler files must include HTTP method suffix for climate APIs:**

```javascript
// ✅ CORRECT Method-Specific Naming for Climate Platform
propertyRiskGet.js           // GET /climate/property-risk
riskAssessmentCreate.js      // POST /climate/risk-assessment
bulkAnalysisGet.js          // GET /climate/bulk-analysis
professionalReportPost.js   // POST /climate/professional-report

// Climate-specific geographic handlers
geographicRiskGet.js        // GET /climate/geographic-risk
boundaryDataGet.js          // GET /climate/boundary-data

// ❌ INCORRECT Multi-Method Handlers (deprecated)
propertyRisk.js             // Handles multiple HTTP methods - DO NOT USE
riskAssessment.js          // Handles GET/POST/PUT - DO NOT USE
```

## Import Path Consistency

### Helper Imports
All backend handlers must use relative imports from the same directory structure:

```javascript
// ✅ CORRECT - Use relative paths to helpers in same directory structure
const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');

// ❌ INCORRECT - Don't use ../admin/ or other directory traversal
const { wrapHandler } = require('../admin/lambdaWrapper');
const { executeQuery } = require('../admin/dbOperations');
```

### 🚨 CRITICAL: Helper Verification Before Import

**Before importing any helper in a handler, ALWAYS verify:**

```bash
# 1. Check helper exists in expected location
list_files src/backend/src/helpers

# 2. Verify the specific helper file
read_file src/backend/src/helpers/helperName.js

# 3. Check export pattern matches import expectations
```

**Rule**: Never assume a helper exists. Always verify file location and export pattern before adding imports.

**Common Helper Locations:**
- Core helpers: `src/backend/src/helpers/`
- Handler-specific helpers: Same directory as handler (`./`)
- Integration helpers: `src/backend/src/helpers/` (use relative path `./`)

### Standard Handler Pattern
All handlers must follow this exact pattern:

```javascript
/**
 * Handler Description
 * Brief description of what this handler does
 */

const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');

/**
 * Main handler function
 */
async function handlerName({ queryParams = {}, requestBody = {}, requestContext, httpMethod }) {
    try {
        const Request_ID = requestContext.requestId;
        
        // Handler logic here
        
        return createSuccessResponse(
            { Records: results },
            'Success message',
            {
                Total_Records: results.length,
                Request_ID,
                Timestamp: new Date().toISOString()
            }
        );
        
    } catch (error) {
        console.error('Handler Error:', error);
        return handleError(error);
    }
}

exports.handler = wrapHandler(handlerName);
```

## Database Operations

### Use executeQuery Helper
```javascript
// ✅ CORRECT
const result = await executeQuery(query, params);

// ❌ INCORRECT - No direct database connections
const { Pool } = require('pg');
const pool = new Pool({...});
const result = await pool.query(query, params);
```

## Response Formatting

### Use Helper Functions
```javascript
// ✅ CORRECT
return createSuccessResponse(data, message, meta);

// ❌ INCORRECT - No manual response formatting
return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, data })
};
```

## Error Handling

### Use handleError Helper
```javascript
// ✅ CORRECT
catch (error) {
    console.error('Handler Error:', error);
    return handleError(error);
}

// ❌ INCORRECT - No manual error responses
catch (error) {
    return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: error.message })
    };
}
```

## Required Imports for All Handlers

Every handler must include these core imports:
- `wrapHandler` - Standard Lambda wrapper
- `executeQuery` - Database operations
- `createSuccessResponse` - Success responses
- `handleError` - Error handling

## Import Order

1. External packages (if needed: aws-sdk, papaparse, xlsx, etc.)
2. Core helpers (./lambdaWrapper, ./dbOperations, ./responseUtil, ./errorHandler)
3. Specific helpers or utilities
4. Business logic imports

This ensures consistency across all backend handlers and eliminates import path confusion.

## ID Generation Patterns

### Request IDs (Tracing/Logging)
All handlers must use AWS-provided request IDs instead of generating new UUIDs:

```javascript
// ✅ CORRECT - Use AWS Lambda request ID
async function handlerName({ queryParams = {}, requestBody = {}, requestContext }) {
    const Request_ID = requestContext.requestId;
    // ... handler logic
}

// ❌ INCORRECT - Don't generate random UUIDs for request tracing
const { v4: uuidv4 } = require('uuid');
const Request_ID = uuidv4();
```

### Entity IDs (Database Primary Keys)
Use business-scoped IDs that provide context and traceability:

```javascript
// ✅ CORRECT - Business-scoped entity IDs
const mapping_id = `mapping_${Company_ID}_${Date.now()}`;
const certificate_id = `cert_${Client_ID}_${Date.now()}`;
const template_id = `template_${Client_ID}_${Date.now()}`;

// ❌ INCORRECT - Random UUIDs with no business context
const mapping_id = require('crypto').randomUUID();
const certificate_id = uuidv4();
```

### Processing IDs (Workflow Tracking)
Use process-scoped IDs that include context and random suffix for uniqueness:

```javascript
// ✅ CORRECT - Process-scoped IDs
const processing_id = `proc_${Company_ID}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
const harvest_id = `harvest_${template_code}_${Date.now()}`;

// ❌ INCORRECT - Random UUIDs with no process context
const processing_id = uuidv4();
```

### LoadIDs (Batch Processing)
Use structured LoadIDs for batch data processing that provide company scope and chronological ordering:

```javascript
// ✅ CORRECT - Business-scoped LoadID pattern
// Format: load_TYPE_COMPANYID_YYYYMMDDHHMMSS_SEQ
async function generateLoadID(companyId, dataType = 'emp') {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T]/g, '').substr(0, 15);
    
    const sequenceQuery = `
        SELECT COALESCE(MAX(CAST(RIGHT(load_id, 3) AS INTEGER)), 0) + 1 as next_sequence
        FROM table_name WHERE load_id LIKE $1
    `;
    
    const sequencePattern = `load_${dataType}_${companyId}_${dateStr.substr(0, 13)}%`;
    const result = await executeQuery(sequenceQuery, [sequencePattern]);
    const sequence = result.rows[0].next_sequence.toString().padStart(3, '0');
    
    return `load_${dataType}_${companyId}_${dateStr}_${sequence}`;
}

// ❌ INCORRECT - Simple incrementing integers
SELECT COALESCE(max(load_id), 0) + 1 as new_load_id FROM table_name
```

### Audit/Log IDs
For audit trails and logging, use built-in crypto.randomUUID() (no external dependency):

```javascript
// ✅ CORRECT - Built-in Node.js crypto for audit logs
const audit_id = crypto.randomUUID();
const log_id = crypto.randomUUID();

// ❌ INCORRECT - External UUID library
const { v4: uuidv4 } = require('uuid');
const audit_id = uuidv4();
```

## LoadID Data Type Prefixes

Use consistent prefixes for different data types:
- `load_emp_` - Employee data loads
- `load_dept_` - Department data loads  
- `load_job_` - Job/Position data loads
- `load_loc_` - Location data loads
- `load_org_` - Organization data loads
- `load_payroll_` - Payroll data loads
- `load_timesheet_` - Timesheet data loads

## Benefits of These Patterns

- **Traceability** - IDs contain business context for debugging
- **Company Isolation** - Company-scoped IDs prevent cross-contamination
- **Chronological Ordering** - Timestamp-based IDs provide natural sorting
- **Concurrency Safety** - Sequence numbers handle simultaneous operations
- **Dependency Reduction** - Eliminates external UUID library requirements
- **Support Efficiency** - Support teams can understand IDs immediately

## Common Violations and Enforcement

### 🚨 Critical Violations to Fix

#### 1. Missing Required Core Imports
```javascript
// ❌ VIOLATION - Missing wrapHandler and handleError
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse } = require('./responseUtil');

// ✅ CORRECT - All required core imports present
const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');
```

#### 2. Non-Standard Export Pattern
```javascript
// ❌ VIOLATION - Direct async export (unwrapped)
exports.handler = async (event) => {
    // handler logic
};

// ✅ CORRECT - Wrapped function pattern
async function handlerName({ queryParams = {}, requestContext }) {
    // handler logic
}
exports.handler = wrapHandler(handlerName);
```

#### 3. Raw Event Parameter Usage
```javascript
// ❌ VIOLATION - Raw event access
exports.handler = async (event) => {
    const queryParams = event.queryStringParameters || {};
    const requestId = event.requestContext?.requestId;

// ✅ CORRECT - Standard parameter destructuring
async function handlerName({ queryParams = {}, requestContext }) {
    const Request_ID = requestContext.requestId;
```

#### 4. Manual Error Handling
```javascript
// ❌ VIOLATION - Custom error responses
catch (error) {
    if (error.message.includes('access')) {
        return createErrorResponse(403, 'Access denied', {...});
    } else {
        return createErrorResponse(500, 'Internal error', {...});
    }
}

// ✅ CORRECT - Standard error helper
catch (error) {
    console.error('Handler Error:', error);
    return handleError(error);
}
```

#### 5. Non-Standard Response Format
```javascript
// ❌ VIOLATION - Custom response structure
return createSuccessResponse('Success message', {
    data: results,
    count: results.length
});

// ✅ CORRECT - Standard Records pattern
return createSuccessResponse(
    { Records: results },
    'Success message',
    {
        Total_Records: results.length,
        Request_ID,
        Timestamp: new Date().toISOString()
    }
);
```

### ✅ Enforcement Checklist

When reviewing or fixing handlers, verify:

- [ ] **wrapHandler import and usage** - `const { wrapHandler } = require('./lambdaWrapper');`
- [ ] **handleError import and usage** - `const { handleError } = require('./errorHandler');`
- [ ] **Standard parameter destructuring** - `{ queryParams = {}, requestBody = {}, requestContext }`
- [ ] **AWS-native request ID** - `const Request_ID = requestContext.requestId;`
- [ ] **Wrapped export** - `exports.handler = wrapHandler(functionName);`
- [ ] **Standard error handling** - `return handleError(error);` in catch blocks
- [ ] **Records response format** - `{ Records: [...] }` in success responses
- [ ] **Core helpers first** - Import order: core helpers, then specific helpers

### 🔧 Migration Patterns

#### Converting Non-Wrapped Handlers
```javascript
// BEFORE (non-compliant)
exports.handler = async (event) => {
    try {
        // logic
        return { statusCode: 200, body: JSON.stringify(result) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// AFTER (compliant)
async function handlerName({ queryParams = {}, requestContext }) {
    try {
        const Request_ID = requestContext.requestId;
        // logic
        return createSuccessResponse({ Records: results }, 'Success', {
            Total_Records: results.length,
            Request_ID,
            Timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Handler Error:', error);
        return handleError(error);
    }
}
exports.handler = wrapHandler(handlerName);
```

#### Import Standardization
```javascript
// BEFORE (mixed order)
const { executeQuery } = require('./dbOperations');
const { validateRequiredParams } = require('./validationUtil');
const { createSuccessResponse } = require('./responseUtil');
const { someBusinessHelper } = require('./businessHelper');

// AFTER (correct order)
const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');
const { validateRequiredParams } = require('./validationUtil');
const { someBusinessHelper } = require('./businessHelper');
```

### 🎯 Handler Standards Priority

**High Priority Fixes:**
1. Missing wrapHandler usage (security/monitoring impact)
2. Missing handleError usage (error handling consistency)
3. Non-standard parameter access (maintainability)

**Medium Priority Fixes:**
1. Import order violations (code organization)
2. Response format inconsistencies (API consistency)

**Low Priority Fixes:**
1. Comment format improvements
2. Variable naming consistency

This enforcement guide ensures all 203+ handlers follow consistent patterns for maintainability, debugging, and operational efficiency.
