// errorHandler.js - Seawater Climate Risk Platform
// Unified error handling following Tim-Combo patterns

const { createErrorResponse } = require('./responseUtil');

// Base error classes following Tim-Combo patterns
class ValidationError extends Error {
    constructor(message, details = []) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

class NotFoundError extends Error {
    constructor(message, resource = null) {
        super(message);
        this.name = 'NotFoundError';
        this.resource = resource;
    }
}

class DatabaseError extends Error {
    constructor(message, code = null, constraint = null) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.constraint = constraint;
    }
}

class JsonValidationError extends ValidationError {
    constructor(message, schema = null, errors = []) {
        super(message, errors);
        this.name = 'JsonValidationError';
        this.schema = schema;
    }
}

// Climate platform specific error classes
class GeocodeError extends Error {
    constructor(message, address = null, provider = null) {
        super(message);
        this.name = 'GeocodeError';
        this.address = address;
        this.provider = provider;
        this.retryable = true;
    }
}

class ClimateDataError extends Error {
    constructor(message, dataSource = null, retryable = true) {
        super(message);
        this.name = 'ClimateDataError';
        this.dataSource = dataSource;
        this.retryable = retryable;
    }
}

class RateLimitError extends Error {
    constructor(message, source = null, resetTime = null) {
        super(message);
        this.name = 'RateLimitError';
        this.source = source;
        this.resetTime = resetTime;
        this.retryable = true;
        this.rateLimited = true;
    }
}

class SubscriptionError extends Error {
    constructor(message, tier = null, feature = null) {
        super(message);
        this.name = 'SubscriptionError';
        this.tier = tier;
        this.feature = feature;
        this.retryable = false;
    }
}

class SpatialQueryError extends Error {
    constructor(message, queryType = null, coordinates = null) {
        super(message);
        this.name = 'SpatialQueryError';
        this.queryType = queryType;
        this.coordinates = coordinates;
    }
}

class DataSourceError extends Error {
    constructor(message, source = null, status = null) {
        super(message);
        this.name = 'DataSourceError';
        this.source = source;
        this.status = status;
        this.retryable = status >= 500 || status === 429;
    }
}

class CacheError extends Error {
    constructor(message, operation = null) {
        super(message);
        this.name = 'CacheError';
        this.operation = operation;
        this.retryable = true;
    }
}

// Main error handler following Tim-Combo patterns
function handleError(error) {
    console.error('Seawater Error Handler:', {
        timestamp: new Date().toISOString(),
        platform: 'seawater-climate-risk',
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5), // Limit stack trace in logs
            code: error.code,
            details: error.details
        }
    });

    // Handle validation errors
    if (error instanceof ValidationError) {
        return createErrorResponse(400, error.message, {
            type: error.name,
            details: error.details,
            source: 'validation'
        });
    }

    // Handle not found errors
    if (error instanceof NotFoundError) {
        return createErrorResponse(404, error.message, {
            type: error.name,
            resource: error.resource,
            source: 'api'
        });
    }

    // Handle database errors
    if (error instanceof DatabaseError) {
        // Handle specific PostgreSQL error codes
        switch (error.code) {
            case '23505': // unique_violation
                return createErrorResponse(409, 'Duplicate record found', {
                    type: 'UniqueConstraintViolation',
                    constraint: error.constraint,
                    source: 'database'
                });
            case '23503': // foreign_key_violation
                return createErrorResponse(409, 'Referenced record not found', {
                    type: 'ForeignKeyViolation',
                    constraint: error.constraint,
                    source: 'database'
                });
            case '23514': // check_violation
                return createErrorResponse(400, 'Data validation failed', {
                    type: 'CheckConstraintViolation',
                    constraint: error.constraint,
                    source: 'database'
                });
            default:
                return createErrorResponse(500, 'A database error occurred', {
                    type: error.name,
                    code: error.code,
                    source: 'database',
                    retryable: true
                });
        }
    }

    // Handle JSON validation errors
    if (error instanceof JsonValidationError) {
        return createErrorResponse(400, error.message, {
            type: error.name,
            schema: error.schema,
            errors: error.details,
            source: 'validation'
        });
    }

    // Handle geocoding errors
    if (error instanceof GeocodeError) {
        return createErrorResponse(400, error.message, {
            type: error.name,
            address: error.address,
            provider: error.provider,
            retryable: error.retryable,
            source: 'geocoding'
        });
    }

    // Handle climate data errors
    if (error instanceof ClimateDataError) {
        return createErrorResponse(502, error.message, {
            type: error.name,
            dataSource: error.dataSource,
            retryable: error.retryable,
            source: 'external_api'
        });
    }

    // Handle rate limiting errors
    if (error instanceof RateLimitError) {
        return createErrorResponse(429, error.message, {
            type: error.name,
            source: error.source || 'rate_limiter',
            retryable: error.retryable,
            rateLimited: true,
            resetTime: error.resetTime
        });
    }

    // Handle subscription errors
    if (error instanceof SubscriptionError) {
        return createErrorResponse(403, error.message, {
            type: error.name,
            tier: error.tier,
            feature: error.feature,
            retryable: false,
            source: 'subscription'
        });
    }

    // Handle spatial query errors
    if (error instanceof SpatialQueryError) {
        return createErrorResponse(400, error.message, {
            type: error.name,
            queryType: error.queryType,
            coordinates: error.coordinates,
            source: 'spatial_query'
        });
    }

    // Handle data source errors
    if (error instanceof DataSourceError) {
        const statusCode = error.status >= 400 && error.status < 500 ? 400 : 502;
        return createErrorResponse(statusCode, error.message, {
            type: error.name,
            dataSource: error.source,
            originalStatus: error.status,
            retryable: error.retryable,
            source: 'external_api'
        });
    }

    // Handle cache errors (continue without cache)
    if (error instanceof CacheError) {
        console.warn('Cache error occurred, continuing without cache:', error.message);
        return createErrorResponse(500, 'Temporary service degradation', {
            type: error.name,
            operation: error.operation,
            retryable: true,
            source: 'cache'
        });
    }

    // Handle JavaScript built-in errors
    if (error instanceof TypeError || error instanceof ReferenceError) {
        return createErrorResponse(500, 'An application error occurred', {
            type: error.name,
            message: error.message,
            source: 'application'
        });
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
        return createErrorResponse(504, 'Request timed out', {
            type: 'TimeoutError',
            retryable: true,
            source: 'timeout'
        });
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        return createErrorResponse(502, 'Network error occurred', {
            type: 'NetworkError',
            code: error.code,
            retryable: true,
            source: 'network'
        });
    }

    // Handle AWS SDK errors
    if (error.name && error.name.includes('AWS')) {
        return createErrorResponse(502, 'AWS service error', {
            type: error.name,
            code: error.code,
            retryable: error.retryable || true,
            source: 'aws'
        });
    }

    // Handle unexpected errors
    return createErrorResponse(500, 'An unexpected error occurred', {
        type: 'UnexpectedError',
        message: error.message,
        source: 'unknown'
    });
}

// Helper function to determine if an error is retryable
function isRetryableError(error) {
    if (error.retryable !== undefined) {
        return error.retryable;
    }

    // Default retry logic
    if (error instanceof ClimateDataError) return true;
    if (error instanceof RateLimitError) return true;
    if (error instanceof CacheError) return true;
    if (error instanceof GeocodeError) return true;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ECONNRESET') return true;
    if (error.status >= 500) return true;
    if (error.status === 429) return true;

    return false;
}

// Helper function to create standardized error details for external APIs
function createExternalApiError(source, status, message, responseData = null) {
    return new DataSourceError(
        `${source} API error: ${message}`,
        source,
        status
    );
}

// Helper function to validate coordinates
function validateCoordinates(lat, lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
        throw new ValidationError('Invalid coordinates provided', [
            { field: 'coordinates', message: 'Latitude and longitude must be valid numbers' }
        ]);
    }

    if (latitude < -90 || latitude > 90) {
        throw new ValidationError('Invalid latitude', [
            { field: 'latitude', message: 'Latitude must be between -90 and 90' }
        ]);
    }

    if (longitude < -180 || longitude > 180) {
        throw new ValidationError('Invalid longitude', [
            { field: 'longitude', message: 'Longitude must be between -180 and 180' }
        ]);
    }

    return { latitude, longitude };
}

// Helper function to validate risk scores
function validateRiskScore(score, fieldName) {
    if (score === null || score === undefined) {
        return score;
    }

    const numericScore = parseInt(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
        throw new ValidationError(`Invalid ${fieldName}`, [
            { field: fieldName, message: `${fieldName} must be a number between 0 and 100` }
        ]);
    }

    return numericScore;
}

module.exports = {
    handleError,
    isRetryableError,
    createExternalApiError,
    validateCoordinates,
    validateRiskScore,
    // Error classes
    ValidationError,
    NotFoundError,
    DatabaseError,
    JsonValidationError,
    GeocodeError,
    ClimateDataError,
    RateLimitError,
    SubscriptionError,
    SpatialQueryError,
    DataSourceError,
    CacheError
};