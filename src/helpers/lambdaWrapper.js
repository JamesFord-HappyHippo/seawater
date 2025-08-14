// lambdaWrapper.js - Seawater Climate Risk Platform
// Following Tim-Combo proven integration patterns

const { parseEvent } = require('./eventParser');
const { handleError } = require('./errorHandler');
const { createSuccessResponse, createBatchResponse } = require('./responseUtil');

// Performance tracking helper
function trackPerformance() {
    const start = process.hrtime();
    return {
        end: () => {
            const [seconds, nanoseconds] = process.hrtime(start);
            return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
        }
    };
}

// Request context tracking for climate risk platform
function createRequestContext(event, context) {
    return {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        functionVersion: context.functionVersion,
        timestamp: new Date().toISOString(),
        path: event.path,
        method: event.httpMethod,
        sourceIp: event.requestContext?.identity?.sourceIp,
        userAgent: event.requestContext?.identity?.userAgent,
        // Include Cognito user context from API Gateway
        user: event.requestContext?.authorizer?.claims || {},
        // Climate platform specific context
        subscriptionTier: event.requestContext?.authorizer?.claims?.subscription_tier || 'free',
        apiKey: event.headers?.['x-api-key'] || null,
        location: {
            country: event.requestContext?.identity?.country || null,
            region: event.requestContext?.identity?.region || null
        }
    };
}

// Standard logging format for climate platform
function createLogEntry(type, requestContext, data = {}) {
    return {
        type,
        timestamp: new Date().toISOString(),
        requestId: requestContext.requestId,
        functionName: requestContext.functionName,
        path: requestContext.path,
        method: requestContext.method,
        sourceIp: requestContext.sourceIp,
        userAgent: requestContext.userAgent,
        subscriptionTier: requestContext.subscriptionTier,
        platform: 'seawater-climate-risk',
        ...data
    };
}

// Request logging with climate-specific data
function logRequest(requestContext, parsedEvent) {
    console.log(createLogEntry('request_start', requestContext, {
        queryParams: parsedEvent.queryParams,
        pathParams: parsedEvent.pathParams,
        headers: sanitizeHeaders(parsedEvent.headers),
        bodySize: parsedEvent.body ? JSON.stringify(parsedEvent.body).length : 0,
        user: requestContext.user,
        subscriptionTier: requestContext.subscriptionTier,
        // Climate platform specific request data
        address: parsedEvent.queryParams?.address || parsedEvent.pathParams?.address,
        coordinates: parsedEvent.queryParams?.lat && parsedEvent.queryParams?.lng ? 
            `${parsedEvent.queryParams.lat},${parsedEvent.queryParams.lng}` : null,
        riskTypes: parsedEvent.queryParams?.risk_types,
        radius: parsedEvent.queryParams?.radius
    }));
}

// Response logging with performance metrics
function logResponse(requestContext, response, duration) {
    console.log(createLogEntry('request_end', requestContext, {
        statusCode: response.statusCode,
        duration_ms: duration,
        responseSize: response.body ? response.body.length : 0,
        success: response.statusCode >= 200 && response.statusCode < 300,
        // Performance categorization for climate platform
        performanceCategory: duration < 500 ? 'fast' : duration < 2000 ? 'acceptable' : 'slow'
    }));
}

// Error logging with climate platform context
function logError(requestContext, error) {
    console.error(createLogEntry('request_error', requestContext, {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            details: error.details,
            // Climate platform specific error context
            dataSource: error.dataSource,
            retryable: error.retryable,
            rateLimited: error.rateLimited
        },
        statusCode: error.statusCode || 500,
        subscriptionTier: requestContext.subscriptionTier
    }));
}

// Batch operation helper for property analysis
async function processBatch(operations, handler, context) {
    const results = {
        total_records: operations.length,
        processed_records: 0,
        successful_records: 0,
        failed_records: 0,
        errors: [],
        performance: {
            total_duration: 0,
            average_duration: 0,
            batches_processed: 0,
            external_api_calls: 0,
            cache_hits: 0,
            cache_misses: 0
        }
    };

    for (const operation of operations) {
        const perfTracker = trackPerformance();
        try {
            const result = await handler({ ...operation, requestContext: context });
            results.successful_records++;
            
            // Track performance metrics from climate data operations
            if (result.performance) {
                results.performance.external_api_calls += result.performance.external_api_calls || 0;
                results.performance.cache_hits += result.performance.cache_hits || 0;
                results.performance.cache_misses += result.performance.cache_misses || 0;
            }
        } catch (error) {
            results.errors.push({
                index: operation.index,
                error: error.message,
                details: error.details,
                address: operation.address,
                retryable: error.retryable || false
            });
            results.failed_records++;
        }
        results.processed_records++;
        
        const duration = perfTracker.end();
        results.performance.total_duration += duration;
        results.performance.batches_processed++;
    }

    results.performance.average_duration = 
        results.performance.total_duration / results.performance.batches_processed;

    return results;
}

// Usage tracking for subscription and billing
function trackUsage(requestContext, parsedEvent, response) {
    const usageData = {
        requestId: requestContext.requestId,
        userId: requestContext.user?.sub,
        subscriptionTier: requestContext.subscriptionTier,
        endpoint: requestContext.path,
        method: requestContext.method,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
        // Climate platform specific usage data
        propertyCount: parsedEvent.queryParams?.bulk ? 
            (parsedEvent.body?.addresses?.length || 1) : 1,
        riskTypesRequested: parsedEvent.queryParams?.risk_types?.split(',') || ['all'],
        apiKey: requestContext.apiKey,
        billableRequest: response.statusCode < 400 && requestContext.subscriptionTier !== 'free'
    };

    // Log usage for analytics and billing
    console.log({
        type: 'usage_event',
        ...usageData
    });

    return usageData;
}

// Rate limiting check
function checkRateLimit(requestContext) {
    // Implementation would check Redis or DynamoDB for rate limiting
    // Based on subscription tier limits
    const limits = {
        free: { hourly: 10, daily: 50 },
        premium: { hourly: 100, daily: 1000 },
        professional: { hourly: 1000, daily: 10000 },
        enterprise: { hourly: 10000, daily: 100000 }
    };

    const userLimit = limits[requestContext.subscriptionTier] || limits.free;
    
    // This would be implemented with actual rate limiting logic
    return {
        allowed: true,
        limit: userLimit,
        remaining: userLimit.hourly,
        resetTime: new Date(Date.now() + 3600000).toISOString()
    };
}

// Main wrapper function following Tim-Combo patterns
function wrapHandler(handler) {
    return async (event, context) => {
        const perfTracker = trackPerformance();
        const requestContext = createRequestContext(event, context);
        
        try {
            // Parse and validate the event
            const parsedEvent = parseEvent(event);
            
            // Debug logging
            console.log('DEBUG lambdaWrapper - parsedEvent.body keys:', Object.keys(parsedEvent.body || {}));
            console.log('DEBUG lambdaWrapper - parsedEvent.body type:', typeof parsedEvent.body);
            
            logRequest(requestContext, parsedEvent);

            // Check rate limits for subscription tier
            const rateLimitCheck = checkRateLimit(requestContext);
            if (!rateLimitCheck.allowed) {
                throw new Error('Rate limit exceeded for subscription tier');
            }

            // Add request context to the parsed event
            parsedEvent.requestContext = requestContext;

            // Handle batch operations if present (for bulk property analysis)
            if (Array.isArray(parsedEvent.body)) {
                const batchResults = await processBatch(parsedEvent.body, handler, requestContext);
                const response = createBatchResponse(batchResults);
                
                // Track usage for batch operations
                trackUsage(requestContext, parsedEvent, response);
                
                logResponse(requestContext, response, perfTracker.end());
                return response;
            }

            // Handle single operation
            const result = await handler(parsedEvent, context);

            // Format response if needed
            const response = result.statusCode ? result : createSuccessResponse(result);

            // Track usage for individual requests
            trackUsage(requestContext, parsedEvent, response);

            // Log response and performance
            logResponse(requestContext, response, perfTracker.end());

            return response;
        } catch (error) {
            // Log error details
            logError(requestContext, error);

            // Create error response
            const errorResponse = handleError(error);

            // Track failed usage for analytics
            trackUsage(requestContext, { queryParams: {}, pathParams: {} }, errorResponse);

            // Log error response
            logResponse(requestContext, errorResponse, perfTracker.end());

            return errorResponse;
        } finally {
            // Log final execution metrics
            console.log(createLogEntry('execution_summary', requestContext, {
                duration_ms: perfTracker.end(),
                memory: {
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
                },
                platform: 'seawater-climate-risk'
            }));
        }
    };
}

// Utility function to sanitize headers for logging
function sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    if (sanitized['Authorization']) sanitized['Authorization'] = '[REDACTED]';
    if (sanitized['x-api-key']) sanitized['x-api-key'] = '[REDACTED]';
    return sanitized;
}

module.exports = { 
    wrapHandler,
    processBatch,
    trackPerformance,
    createRequestContext,
    createLogEntry,
    logRequest,
    logResponse,
    logError,
    trackUsage,
    checkRateLimit
};