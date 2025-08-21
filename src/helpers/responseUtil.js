// responseUtil.js

// List of allowed origins for CORS
const ALLOWED_ORIGINS = [
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    
    // Production React Apps
    'https://dmrl5r8exo2al.cloudfront.net',    // Current CloudFront
    'https://app.honeydolist.vip',              // Future production
    
    // Marketing Site
    'https://drl7ua1ewmc32.cloudfront.net',     // Marketing CloudFront
    'https://honeydolist.vip',                  // Marketing domain
    
    // Development/Staging environments
    'https://dev.honeydolist.vip',
    'https://test.honeydolist.vip',
    'https://staging.honeydolist.vip',
    
    // Legacy
    'https://dev.honeydo.app'
];

// Get CORS headers based on request origin
function getCorsHeaders(event) {
    // Extract origin from various possible locations
    const requestOrigin = event?.headers?.origin || 
                         event?.headers?.Origin || 
                         event?.headers?.referer?.replace(/\/$/, '') ||
                         '*';
    
    // Check if origin is in allowed list
    const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin) 
        ? requestOrigin 
        : ALLOWED_ORIGINS[0]; // Default to first allowed origin
    
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Client-Version, X-Client-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    };
}

function logResponse(statusCode, body) {
    console.log({
        timestamp: new Date().toISOString(),
        type: 'response',
        statusCode,
        body: JSON.stringify(body)
    });
}

function createResponse(statusCode, body, headers = {}, event = null) {
    // Get CORS headers based on the event (if provided)
    const corsHeaders = event ? getCorsHeaders(event) : {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
        'Access-Control-Allow-Methods': '*',
        'Content-Type': 'application/json'
    };
    
    const response = {
        statusCode,
        headers: { ...corsHeaders, ...headers },
        body: JSON.stringify(body)
    };
    logResponse(statusCode, body);
    return response;
}

function createErrorResponse(statusCode, message, error = null, event = null) {
    const body = {
        success: false,
        message,
        meta: {
            Timestamp: new Date().toISOString(),
            Error_Source: error?.source || 'API'
        }
    };

    if (error) {
        // Add error details
        if (error.code) body.error_code = error.code;
        if (error.details) body.error_details = error.details;
        
        // Add validation errors if present
        if (error.validation_errors) {
            body.validation_errors = error.validation_errors;
        }

        // Add debug info in non-production
        if (process.env.NODE_ENV !== 'production') {
            body.debug = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }
    }

    return createResponse(statusCode, body, {}, event);
}

function createSuccessResponse(data, message = 'Operation successful', meta = {}, event = null) {
    // Handle data that's already wrapped in Records array
    const records = data?.Records || (Array.isArray(data) ? data : [data]);
    
    // Build standard response
    const body = {
        success: true,
        message,
        meta: {
            Total_Records: records.length,
            Request_ID: meta.Request_ID || meta.requestId,
            Timestamp: new Date().toISOString(),
            Family_ID: meta.Family_ID,
            User_ID: meta.User_ID
        },
        data: {
            Records: records
        }
    };

    // Add Query_Context if relevant fields exist
    const queryContext = {
        Mode: meta.Mode,
        Operation: meta.Operation,
        Family_ID: meta.Family_ID,
        User_ID: meta.User_ID,
        ...meta.Query_Context
    };
    if (Object.values(queryContext).some(v => v !== undefined)) {
        body.data.Query_Context = queryContext;
    }

    // Add Analytics if metrics exist
    const analytics = {
        Total_Active: records.filter(r => r.is_active === true).length,
        ...meta.Analytics,
        ...meta.Metrics,
        Performance_Metrics: meta.Performance_Metrics
    };
    if (Object.values(analytics).some(v => v !== undefined)) {
        body.data.Analytics = analytics;
    }

    return createResponse(200, body, {}, event);
}

// Add OPTIONS handler for preflight requests
function handleOptionsRequest(event) {
    return createResponse(200, {}, getCorsHeaders(event), event);
}

// Backward compatibility exports - all map to createSuccessResponse
const createBatchResponse = (results, message, context, event) => createSuccessResponse(
    results.data || [],
    message,
    {
        ...context,
        Analytics: {
            Total_Records: results.total_records || 0,
            Processed_Records: results.processed_records || 0,
            Successful_Records: results.successful_records || 0,
            Failed_Records: results.failed_records || 0,
            Performance_Metrics: results.performance
        }
    },
    event
);

const createPaginatedResponse = (data, pagination, message, event) => createSuccessResponse(
    data,
    message,
    {
        Total_Records: pagination.total_records,
        Page: pagination.page,
        Page_Size: pagination.page_size,
        Total_Pages: pagination.total_pages,
        Has_Next: pagination.has_next,
        Has_Previous: pagination.has_previous
    },
    event
);

const createHierarchicalResponse = createSuccessResponse;
const createChangeTrackingResponse = createSuccessResponse;

const createValidationErrorResponse = (errors, message = 'Validation failed', event = null) => 
    createErrorResponse(400, message, { validation_errors: errors }, event);

module.exports = {
    createResponse,
    createErrorResponse,
    createSuccessResponse,
    handleOptionsRequest,  // New OPTIONS handler
    // Keep exports for backward compatibility
    createBatchResponse,
    createPaginatedResponse,
    createHierarchicalResponse,
    createChangeTrackingResponse,
    createValidationErrorResponse,
    // Export utility functions for direct use
    getCorsHeaders,
    ALLOWED_ORIGINS
};