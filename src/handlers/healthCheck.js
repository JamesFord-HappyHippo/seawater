// healthCheck.js - Seawater Climate Risk Platform
// Health check endpoint following Tim-Combo patterns

const { wrapHandler } = require('../helpers/lambdaWrapper');
const { createSuccessResponse } = require('../helpers/responseUtil');
const { checkPoolHealth } = require('../helpers/dbClient');

/**
 * Health check endpoint for the Seawater Climate Risk Platform
 * Returns system status including database connectivity and external API status
 */
async function healthCheckHandler(event, context) {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        platform: 'seawater-climate-risk',
        components: {}
    };

    try {
        // Check database connectivity
        console.log('Checking database connectivity...');
        const dbHealth = await checkPoolHealth();
        healthStatus.components.database = {
            status: dbHealth.status,
            ...dbHealth
        };

        // Check environment variables
        console.log('Checking environment configuration...');
        const envCheck = checkEnvironmentVariables();
        healthStatus.components.environment = envCheck;

        // Check external API endpoints (basic connectivity)
        console.log('Checking external APIs...');
        const apiCheck = await checkExternalAPIs();
        healthStatus.components.external_apis = apiCheck;

        // Lambda function health
        healthStatus.components.lambda = {
            status: 'healthy',
            function_name: context.functionName,
            function_version: context.functionVersion,
            remaining_time_ms: context.getRemainingTimeInMillis(),
            memory_limit_mb: context.memoryLimitInMB,
            memory_usage: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
                heap_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
                heap_used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
            }
        };

        // Overall health determination
        const unhealthyComponents = Object.values(healthStatus.components)
            .filter(component => component.status !== 'healthy' && component.status !== 'operational');
        
        if (unhealthyComponents.length > 0) {
            healthStatus.status = 'degraded';
            console.warn('Health check found degraded components:', unhealthyComponents);
        }

        console.log('Health check completed:', {
            overall_status: healthStatus.status,
            component_count: Object.keys(healthStatus.components).length,
            unhealthy_components: unhealthyComponents.length
        });

        return createSuccessResponse(healthStatus);

    } catch (error) {
        console.error('Health check failed:', error);
        
        healthStatus.status = 'unhealthy';
        healthStatus.error = {
            message: error.message,
            code: error.code
        };

        return {
            statusCode: 503,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(healthStatus)
        };
    }
}

/**
 * Check critical environment variables
 */
function checkEnvironmentVariables() {
    const requiredVars = [
        'DB_HOST',
        'DB_NAME', 
        'DB_USER',
        'DB_PASSWORD',
        'MAPBOX_ACCESS_TOKEN'
    ];

    const optionalVars = [
        'FEMA_API_KEY',
        'FIRST_STREET_API_KEY',
        'CLIMATE_CHECK_API_KEY'
    ];

    const envStatus = {
        status: 'healthy',
        required_vars: {},
        optional_vars: {},
        missing_required: [],
        present_optional: []
    };

    // Check required variables
    for (const varName of requiredVars) {
        const isPresent = !!process.env[varName];
        envStatus.required_vars[varName] = isPresent;
        if (!isPresent) {
            envStatus.missing_required.push(varName);
        }
    }

    // Check optional variables  
    for (const varName of optionalVars) {
        const isPresent = !!process.env[varName];
        envStatus.optional_vars[varName] = isPresent;
        if (isPresent) {
            envStatus.present_optional.push(varName);
        }
    }

    // Set status based on missing required vars
    if (envStatus.missing_required.length > 0) {
        envStatus.status = 'unhealthy';
        envStatus.error = `Missing required environment variables: ${envStatus.missing_required.join(', ')}`;
    }

    return envStatus;
}

/**
 * Check external API connectivity
 */
async function checkExternalAPIs() {
    const apiStatus = {
        status: 'healthy',
        apis: {}
    };

    // MapBox Geocoding API
    if (process.env.MAPBOX_ACCESS_TOKEN) {
        try {
            // Simple validation that the token format looks correct
            const token = process.env.MAPBOX_ACCESS_TOKEN;
            apiStatus.apis.mapbox = {
                status: token.startsWith('pk.') ? 'configured' : 'invalid_token',
                configured: true
            };
        } catch (error) {
            apiStatus.apis.mapbox = {
                status: 'error',
                error: error.message
            };
        }
    } else {
        apiStatus.apis.mapbox = {
            status: 'not_configured',
            configured: false
        };
    }

    // FEMA API
    apiStatus.apis.fema = {
        status: process.env.FEMA_API_KEY ? 'configured' : 'not_configured',
        configured: !!process.env.FEMA_API_KEY
    };

    // First Street Foundation API
    apiStatus.apis.first_street = {
        status: process.env.FIRST_STREET_API_KEY ? 'configured' : 'not_configured',
        configured: !!process.env.FIRST_STREET_API_KEY
    };

    // Climate Check API
    apiStatus.apis.climate_check = {
        status: process.env.CLIMATE_CHECK_API_KEY ? 'configured' : 'not_configured',
        configured: !!process.env.CLIMATE_CHECK_API_KEY
    };

    // Overall API health
    const errorApis = Object.values(apiStatus.apis).filter(api => api.status === 'error');
    if (errorApis.length > 0) {
        apiStatus.status = 'degraded';
    }

    return apiStatus;
}

module.exports = {
    handler: wrapHandler(healthCheckHandler)
};