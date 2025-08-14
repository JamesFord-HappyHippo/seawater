// responseUtil.js - Seawater Climate Risk Platform
// Standardized API response formatting following Tim-Combo patterns

const DEFAULT_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
    'Access-Control-Allow-Methods': '*',
    'Content-Type': 'application/json',
    'X-Platform': 'seawater-climate-risk',
    'X-API-Version': '1.0'
};

function logResponse(statusCode, body) {
    console.log({
        timestamp: new Date().toISOString(),
        type: 'response',
        platform: 'seawater-climate-risk',
        statusCode,
        body: JSON.stringify(body).substring(0, 500), // Truncate for logging
        response_size: JSON.stringify(body).length
    });
}

function createResponse(statusCode, body, headers = {}) {
    const response = {
        statusCode,
        headers: { ...DEFAULT_HEADERS, ...headers },
        body: JSON.stringify(body)
    };
    logResponse(statusCode, body);
    return response;
}

function createErrorResponse(statusCode, message, error = null) {
    const body = {
        success: false,
        message,
        platform: 'seawater-climate-risk',
        meta: {
            timestamp: new Date().toISOString(),
            error_source: error?.source || 'API',
            request_id: error?.requestId || null
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

        // Add climate platform specific error context
        if (error.dataSource) body.data_source_error = error.dataSource;
        if (error.retryable) body.retryable = error.retryable;
        if (error.rateLimited) body.rate_limited = error.rateLimited;

        // Add debug info in non-production
        if (process.env.NODE_ENV !== 'production') {
            body.debug = {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5) // Limit stack trace
            };
        }
    }

    return createResponse(statusCode, body);
}

function createSuccessResponse(data, message = 'Operation successful', meta = {}) {
    // Handle data that's already wrapped in Records array
    const records = data?.Records || (Array.isArray(data) ? data : [data]);
    
    // Calculate basic analytics for climate data
    const analytics = calculateClimateAnalytics(records);
    
    // Build standard response for climate platform
    const body = {
        success: true,
        message,
        platform: 'seawater-climate-risk',
        meta: {
            total_records: records.length,
            request_id: meta.Request_ID || meta.requestId,
            timestamp: new Date().toISOString(),
            api_version: '1.0',
            // Climate platform specific metadata
            risk_assessment_version: meta.risk_assessment_version || '1.0',
            data_freshness: meta.data_freshness,
            confidence_score: meta.confidence_score,
            ...meta
        },
        data: {
            Records: records
        }
    };

    // Add Query_Context for climate queries
    const queryContext = {
        operation: meta.Operation,
        search_type: meta.search_type, // address, coordinates, radius
        radius_meters: meta.radius_meters,
        risk_types: meta.risk_types,
        subscription_tier: meta.subscription_tier,
        ...meta.Query_Context
    };
    if (Object.values(queryContext).some(v => v !== undefined)) {
        body.data.Query_Context = queryContext;
    }

    // Add Climate Analytics
    if (analytics && Object.keys(analytics).length > 0) {
        body.data.Analytics = {
            ...analytics,
            ...meta.Analytics,
            ...meta.Metrics,
            Performance_Metrics: meta.Performance_Metrics
        };
    }

    return createResponse(200, body);
}

// Calculate analytics specific to climate risk data
function calculateClimateAnalytics(records) {
    if (!Array.isArray(records) || records.length === 0) {
        return {};
    }

    const analytics = {
        total_properties: records.length
    };

    // Analyze risk scores if present
    const riskScores = records.map(r => r.overall_risk_score || r.overallRiskScore).filter(s => s !== undefined);
    if (riskScores.length > 0) {
        analytics.risk_summary = {
            average_risk_score: Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length),
            min_risk_score: Math.min(...riskScores),
            max_risk_score: Math.max(...riskScores),
            high_risk_properties: riskScores.filter(score => score >= 70).length,
            moderate_risk_properties: riskScores.filter(score => score >= 40 && score < 70).length,
            low_risk_properties: riskScores.filter(score => score < 40).length
        };
    }

    // Analyze by risk types
    const floodScores = records.map(r => r.flood_risk_score || r.floodRiskScore).filter(s => s !== undefined);
    if (floodScores.length > 0) {
        analytics.flood_risk_summary = {
            average_score: Math.round(floodScores.reduce((sum, score) => sum + score, 0) / floodScores.length),
            high_flood_risk_count: floodScores.filter(score => score >= 70).length
        };
    }

    const wildfireScores = records.map(r => r.wildfire_risk_score || r.wildfireRiskScore).filter(s => s !== undefined);
    if (wildfireScores.length > 0) {
        analytics.wildfire_risk_summary = {
            average_score: Math.round(wildfireScores.reduce((sum, score) => sum + score, 0) / wildfireScores.length),
            high_wildfire_risk_count: wildfireScores.filter(score => score >= 70).length
        };
    }

    // Geographic distribution
    const states = records.map(r => r.state).filter(s => s);
    if (states.length > 0) {
        const stateCounts = states.reduce((counts, state) => {
            counts[state] = (counts[state] || 0) + 1;
            return counts;
        }, {});
        analytics.geographic_distribution = stateCounts;
    }

    return analytics;
}

// Specialized response for property risk assessment
function createPropertyRiskResponse(propertyData, riskData, message = 'Property risk assessment retrieved successfully') {
    const responseData = {
        property: propertyData,
        risk_assessment: riskData,
        assessment_summary: {
            overall_risk_level: getRiskLevel(riskData?.overall_risk_score),
            primary_risks: identifyPrimaryRisks(riskData),
            recommendation: generateRecommendation(riskData)
        }
    };

    return createSuccessResponse(
        responseData, 
        message, 
        {
            risk_assessment_version: riskData?.assessment_version || '1.0',
            confidence_score: riskData?.confidence_score,
            data_freshness: riskData?.assessment_date,
            search_type: 'address'
        }
    );
}

// Specialized response for geographic searches
function createGeographicSearchResponse(properties, searchParams, message = 'Geographic search completed successfully') {
    return createSuccessResponse(
        properties,
        message,
        {
            search_type: 'geographic',
            radius_meters: searchParams.radius,
            center_coordinates: `${searchParams.latitude},${searchParams.longitude}`,
            filters_applied: searchParams.filters
        }
    );
}

// Specialized response for bulk operations
function createBulkAnalysisResponse(results, message = 'Bulk analysis completed') {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    return createSuccessResponse(
        successfulResults.map(r => r.data),
        message,
        {
            Analytics: {
                total_requested: results.length,
                successful_analyses: successfulResults.length,
                failed_analyses: failedResults.length,
                success_rate: Math.round((successfulResults.length / results.length) * 100),
                failed_addresses: failedResults.map(r => ({ address: r.address, error: r.error }))
            },
            search_type: 'bulk'
        }
    );
}

// Helper functions
function getRiskLevel(score) {
    if (!score) return 'unknown';
    if (score >= 80) return 'very_high';
    if (score >= 60) return 'high';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'low';
    return 'very_low';
}

function identifyPrimaryRisks(riskData) {
    if (!riskData) return [];
    
    const risks = [
        { type: 'flood', score: riskData.flood_risk_score },
        { type: 'wildfire', score: riskData.wildfire_risk_score },
        { type: 'hurricane', score: riskData.hurricane_risk_score },
        { type: 'earthquake', score: riskData.earthquake_risk_score },
        { type: 'tornado', score: riskData.tornado_risk_score },
        { type: 'heat', score: riskData.heat_risk_score },
        { type: 'drought', score: riskData.drought_risk_score },
        { type: 'hail', score: riskData.hail_risk_score }
    ].filter(risk => risk.score && risk.score >= 60)
     .sort((a, b) => b.score - a.score)
     .slice(0, 3);

    return risks;
}

function generateRecommendation(riskData) {
    const primaryRisks = identifyPrimaryRisks(riskData);
    if (primaryRisks.length === 0) return 'Property shows low climate risk across all categories.';
    
    const topRisk = primaryRisks[0];
    const recommendations = {
        flood: 'Consider flood insurance and elevation certificates.',
        wildfire: 'Implement defensible space and fire-resistant landscaping.',
        hurricane: 'Ensure proper storm shutters and structural reinforcement.',
        earthquake: 'Consider seismic retrofitting and earthquake insurance.',
        tornado: 'Identify safe rooms and consider impact-resistant materials.',
        heat: 'Improve insulation and consider cooling system upgrades.',
        drought: 'Implement water conservation and drought-resistant landscaping.',
        hail: 'Consider impact-resistant roofing materials.'
    };

    return recommendations[topRisk.type] || 'Consult with local climate adaptation specialists.';
}

// Backward compatibility exports - all map to createSuccessResponse with appropriate metadata
const createBatchResponse = (results, message, context) => createSuccessResponse(
    results.data || [],
    message,
    {
        ...context,
        search_type: 'batch',
        Analytics: {
            Total_Records: results.total_records || 0,
            Processed_Records: results.processed_records || 0,
            Successful_Records: results.successful_records || 0,
            Failed_Records: results.failed_records || 0,
            Performance_Metrics: results.performance
        }
    }
);

const createPaginatedResponse = (data, pagination, message) => createSuccessResponse(
    data,
    message,
    {
        Total_Records: pagination.total_records,
        Page: pagination.page,
        Page_Size: pagination.page_size,
        Total_Pages: pagination.total_pages,
        Has_Next: pagination.has_next,
        Has_Previous: pagination.has_previous,
        search_type: 'paginated'
    }
);

const createValidationErrorResponse = (errors, message = 'Validation failed') => 
    createErrorResponse(400, message, { validation_errors: errors });

// Rate limiting response
const createRateLimitErrorResponse = (limit, resetTime) => 
    createErrorResponse(429, 'Rate limit exceeded', {
        rate_limited: true,
        retryable: true,
        details: {
            limit: limit,
            reset_time: resetTime
        }
    });

module.exports = {
    createResponse,
    createErrorResponse,
    createSuccessResponse,
    // Climate platform specific responses
    createPropertyRiskResponse,
    createGeographicSearchResponse,
    createBulkAnalysisResponse,
    // Backward compatibility
    createBatchResponse,
    createPaginatedResponse,
    createValidationErrorResponse,
    createRateLimitErrorResponse,
    // Helper functions
    calculateClimateAnalytics,
    getRiskLevel,
    identifyPrimaryRisks,
    generateRecommendation
};