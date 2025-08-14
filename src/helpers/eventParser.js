// eventParser.js - Seawater Climate Risk Platform
// Event parsing and validation following Tim-Combo patterns

const { ValidationError } = require('./errorHandler');

/**
 * Parse and normalize Lambda event
 * @param {Object} event - Lambda event object
 * @returns {Object} Parsed event with normalized structure
 */
function parseEvent(event) {
    try {
        console.log('Parsing event for Seawater platform:', {
            type: 'event_parse_start',
            timestamp: new Date().toISOString(),
            platform: 'seawater-climate-risk',
            path: event.path,
            method: event.httpMethod,
            hasBody: !!event.body,
            bodyType: typeof event.body
        });

        const parsedEvent = {
            path: event.path || '',
            method: event.httpMethod || 'GET',
            headers: normalizeObjectKeys(event.headers || {}),
            queryParams: normalizeObjectKeys(event.queryStringParameters || {}),
            pathParams: normalizeObjectKeys(event.pathParameters || {}),
            requestContext: event.requestContext || {},
            body: null,
            isBase64Encoded: event.isBase64Encoded || false
        };

        // Parse body if present
        if (event.body) {
            try {
                if (event.isBase64Encoded) {
                    const decodedBody = Buffer.from(event.body, 'base64').toString('utf-8');
                    parsedEvent.body = JSON.parse(decodedBody);
                } else if (typeof event.body === 'string') {
                    parsedEvent.body = JSON.parse(event.body);
                } else {
                    parsedEvent.body = event.body;
                }
            } catch (parseError) {
                console.error('Error parsing request body:', parseError);
                throw new ValidationError('Invalid JSON in request body', [
                    { field: 'body', message: 'Request body must be valid JSON' }
                ]);
            }
        }

        // Normalize body keys if it's an object
        if (parsedEvent.body && typeof parsedEvent.body === 'object' && !Array.isArray(parsedEvent.body)) {
            parsedEvent.body = normalizeObjectKeys(parsedEvent.body);
        }

        console.log('Event parsed successfully:', {
            type: 'event_parse_success',
            timestamp: new Date().toISOString(),
            platform: 'seawater-climate-risk',
            path: parsedEvent.path,
            method: parsedEvent.method,
            queryParamCount: Object.keys(parsedEvent.queryParams).length,
            pathParamCount: Object.keys(parsedEvent.pathParams).length,
            hasBody: !!parsedEvent.body,
            bodyIsArray: Array.isArray(parsedEvent.body)
        });

        return parsedEvent;
    } catch (error) {
        console.error('Error parsing event:', error);
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError('Failed to parse request event', [
            { field: 'event', message: error.message }
        ]);
    }
}

/**
 * Normalize object keys to camelCase and handle common variations
 * @param {Object} obj - Object to normalize
 * @returns {Object} Object with normalized keys
 */
function normalizeObjectKeys(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const normalized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        // Convert various formats to camelCase
        let normalizedKey = key
            .toLowerCase()
            .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
            .replace(/^(.)/, char => char.toLowerCase());

        // Handle specific climate platform field mappings
        const fieldMappings = {
            'lat': 'latitude',
            'lng': 'longitude',
            'lon': 'longitude',
            'addr': 'address',
            'zip': 'zipCode',
            'riskscore': 'riskScore',
            'overallriskscore': 'overallRiskScore',
            'floodriskscore': 'floodRiskScore',
            'wildfire': 'wildfireRiskScore',
            'hurricane': 'hurricaneRiskScore',
            'earthquake': 'earthquakeRiskScore',
            'tornado': 'tornadoRiskScore',
            'heat': 'heatRiskScore',
            'drought': 'droughtRiskScore',
            'hail': 'hailRiskScore',
            'propertytype': 'propertyType',
            'yearbuilt': 'yearBuilt',
            'squarefeet': 'squareFeet',
            'femafloodzone': 'femaFloodZone',
            'femariskrating': 'femaRiskRating',
            'apikeyid': 'apiKeyId',
            'userid': 'userId',
            'requestid': 'requestId',
            'subscriptiontier': 'subscriptionTier'
        };

        normalizedKey = fieldMappings[normalizedKey] || normalizedKey;

        // Recursively normalize nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            normalized[normalizedKey] = normalizeObjectKeys(value);
        } else {
            normalized[normalizedKey] = value;
        }
    }

    return normalized;
}

/**
 * Validate climate platform specific request parameters
 * @param {Object} params - Request parameters
 * @param {string} operation - Operation type (property_risk, geographic_search, etc.)
 * @returns {Object} Validated parameters
 */
function validateClimateRequestParams(params, operation) {
    const validationErrors = [];

    switch (operation) {
        case 'property_risk':
            if (!params.address && !(params.latitude && params.longitude)) {
                validationErrors.push({
                    field: 'address_or_coordinates',
                    message: 'Either address or coordinates (latitude and longitude) are required'
                });
            }
            break;

        case 'geographic_search':
            if (!params.latitude || !params.longitude) {
                validationErrors.push({
                    field: 'coordinates',
                    message: 'Latitude and longitude are required for geographic search'
                });
            }
            
            if (!params.radius) {
                validationErrors.push({
                    field: 'radius',
                    message: 'Search radius is required'
                });
            } else {
                const radius = parseInt(params.radius);
                if (isNaN(radius) || radius <= 0 || radius > 50000) {
                    validationErrors.push({
                        field: 'radius',
                        message: 'Radius must be a number between 1 and 50000 meters'
                    });
                }
            }
            break;

        case 'bulk_analysis':
            if (!params.addresses || !Array.isArray(params.addresses)) {
                validationErrors.push({
                    field: 'addresses',
                    message: 'Addresses array is required for bulk analysis'
                });
            } else if (params.addresses.length === 0) {
                validationErrors.push({
                    field: 'addresses',
                    message: 'At least one address is required'
                });
            } else if (params.addresses.length > 100) {
                validationErrors.push({
                    field: 'addresses',
                    message: 'Maximum 100 addresses allowed per bulk request'
                });
            }
            break;

        case 'compare_properties':
            if (!params.addresses || !Array.isArray(params.addresses)) {
                validationErrors.push({
                    field: 'addresses',
                    message: 'Addresses array is required for property comparison'
                });
            } else if (params.addresses.length < 2) {
                validationErrors.push({
                    field: 'addresses',
                    message: 'At least 2 addresses are required for comparison'
                });
            } else if (params.addresses.length > 10) {
                validationErrors.push({
                    field: 'addresses',
                    message: 'Maximum 10 addresses allowed for comparison'
                });
            }
            break;
    }

    // Validate coordinates if provided
    if (params.latitude || params.longitude) {
        const lat = parseFloat(params.latitude);
        const lng = parseFloat(params.longitude);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            validationErrors.push({
                field: 'latitude',
                message: 'Latitude must be a number between -90 and 90'
            });
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            validationErrors.push({
                field: 'longitude',
                message: 'Longitude must be a number between -180 and 180'
            });
        }
    }

    // Validate risk types if provided
    if (params.riskTypes) {
        const validRiskTypes = [
            'flood', 'wildfire', 'hurricane', 'tornado', 'earthquake', 
            'heat', 'drought', 'hail', 'all'
        ];
        const requestedTypes = Array.isArray(params.riskTypes) 
            ? params.riskTypes 
            : params.riskTypes.split(',').map(t => t.trim());

        for (const riskType of requestedTypes) {
            if (!validRiskTypes.includes(riskType)) {
                validationErrors.push({
                    field: 'riskTypes',
                    message: `Invalid risk type: ${riskType}. Valid types: ${validRiskTypes.join(', ')}`
                });
            }
        }
    }

    if (validationErrors.length > 0) {
        throw new ValidationError('Request validation failed', validationErrors);
    }

    return params;
}

/**
 * Extract subscription context from request
 * @param {Object} event - Parsed event
 * @returns {Object} Subscription context
 */
function extractSubscriptionContext(event) {
    const context = {
        subscriptionTier: 'free',
        userId: null,
        apiKeyId: null,
        rateLimits: {
            hourly: 10,
            daily: 50
        }
    };

    // Extract from JWT claims (Cognito)
    if (event.requestContext?.authorizer?.claims) {
        const claims = event.requestContext.authorizer.claims;
        context.subscriptionTier = claims.subscription_tier || 'free';
        context.userId = claims.sub;
    }

    // Extract from API key headers
    if (event.headers?.['x-api-key']) {
        context.apiKeyId = event.headers['x-api-key'];
        // API key subscriptions typically have higher limits
        context.subscriptionTier = event.headers['x-subscription-tier'] || 'professional';
    }

    // Set rate limits based on subscription tier
    const rateLimitMap = {
        free: { hourly: 10, daily: 50 },
        premium: { hourly: 100, daily: 1000 },
        professional: { hourly: 1000, daily: 10000 },
        enterprise: { hourly: 10000, daily: 100000 }
    };

    context.rateLimits = rateLimitMap[context.subscriptionTier] || rateLimitMap.free;

    return context;
}

/**
 * Parse geographic bounds from request
 * @param {Object} params - Request parameters
 * @returns {Object} Geographic bounds
 */
function parseGeographicBounds(params) {
    if (params.bounds) {
        try {
            const bounds = typeof params.bounds === 'string' 
                ? JSON.parse(params.bounds) 
                : params.bounds;

            return {
                north: parseFloat(bounds.north),
                south: parseFloat(bounds.south),
                east: parseFloat(bounds.east),
                west: parseFloat(bounds.west)
            };
        } catch (error) {
            throw new ValidationError('Invalid bounds format', [
                { field: 'bounds', message: 'Bounds must be a valid JSON object with north, south, east, west properties' }
            ]);
        }
    }

    return null;
}

module.exports = {
    parseEvent,
    normalizeObjectKeys,
    validateClimateRequestParams,
    extractSubscriptionContext,
    parseGeographicBounds
};