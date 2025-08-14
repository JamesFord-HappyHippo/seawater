// validationUtil.js - Seawater Climate Risk Platform
// Request parameter validation following Tim-Combo patterns

const { ValidationError } = require('./errorHandler');

/**
 * Address validation
 */
function validateAddress(address) {
    if (!address || typeof address !== 'string') {
        throw new ValidationError('Invalid address', [
            { field: 'address', message: 'Address must be a non-empty string' }
        ]);
    }

    const trimmedAddress = address.trim();
    if (trimmedAddress.length < 5) {
        throw new ValidationError('Invalid address', [
            { field: 'address', message: 'Address must be at least 5 characters long' }
        ]);
    }

    if (trimmedAddress.length > 500) {
        throw new ValidationError('Invalid address', [
            { field: 'address', message: 'Address must be less than 500 characters' }
        ]);
    }

    // Basic address format validation
    const addressPattern = /^[a-zA-Z0-9\s,.\-#/]+$/;
    if (!addressPattern.test(trimmedAddress)) {
        throw new ValidationError('Invalid address format', [
            { field: 'address', message: 'Address contains invalid characters' }
        ]);
    }

    return trimmedAddress;
}

/**
 * Coordinates validation
 */
function validateCoordinates(latitude, longitude) {
    const validationErrors = [];

    // Validate latitude
    const lat = parseFloat(latitude);
    if (isNaN(lat)) {
        validationErrors.push({
            field: 'latitude',
            message: 'Latitude must be a valid number'
        });
    } else if (lat < -90 || lat > 90) {
        validationErrors.push({
            field: 'latitude',
            message: 'Latitude must be between -90 and 90 degrees'
        });
    }

    // Validate longitude
    const lng = parseFloat(longitude);
    if (isNaN(lng)) {
        validationErrors.push({
            field: 'longitude',
            message: 'Longitude must be a valid number'
        });
    } else if (lng < -180 || lng > 180) {
        validationErrors.push({
            field: 'longitude',
            message: 'Longitude must be between -180 and 180 degrees'
        });
    }

    if (validationErrors.length > 0) {
        throw new ValidationError('Invalid coordinates', validationErrors);
    }

    return { latitude: lat, longitude: lng };
}

/**
 * Radius validation for geographic searches
 */
function validateRadius(radius, maxRadius = 50000) {
    const numericRadius = parseFloat(radius);
    
    if (isNaN(numericRadius)) {
        throw new ValidationError('Invalid radius', [
            { field: 'radius', message: 'Radius must be a valid number' }
        ]);
    }

    if (numericRadius <= 0) {
        throw new ValidationError('Invalid radius', [
            { field: 'radius', message: 'Radius must be greater than 0' }
        ]);
    }

    if (numericRadius > maxRadius) {
        throw new ValidationError('Invalid radius', [
            { field: 'radius', message: `Radius must be less than or equal to ${maxRadius} meters` }
        ]);
    }

    return numericRadius;
}

/**
 * Risk types validation
 */
function validateRiskTypes(riskTypes) {
    const validRiskTypes = [
        'flood', 'wildfire', 'hurricane', 'tornado', 'earthquake',
        'heat', 'drought', 'hail', 'all'
    ];

    let typesToValidate = [];
    
    if (typeof riskTypes === 'string') {
        typesToValidate = riskTypes.split(',').map(type => type.trim().toLowerCase());
    } else if (Array.isArray(riskTypes)) {
        typesToValidate = riskTypes.map(type => String(type).trim().toLowerCase());
    } else {
        throw new ValidationError('Invalid risk types', [
            { field: 'riskTypes', message: 'Risk types must be a string or array' }
        ]);
    }

    const invalidTypes = typesToValidate.filter(type => !validRiskTypes.includes(type));
    if (invalidTypes.length > 0) {
        throw new ValidationError('Invalid risk types', [
            { 
                field: 'riskTypes', 
                message: `Invalid risk types: ${invalidTypes.join(', ')}. Valid types: ${validRiskTypes.join(', ')}` 
            }
        ]);
    }

    return typesToValidate;
}

/**
 * Risk score validation (0-100 scale)
 */
function validateRiskScore(score, fieldName = 'riskScore') {
    if (score === null || score === undefined) {
        return null;
    }

    const numericScore = parseInt(score);
    if (isNaN(numericScore)) {
        throw new ValidationError(`Invalid ${fieldName}`, [
            { field: fieldName, message: `${fieldName} must be a valid number` }
        ]);
    }

    if (numericScore < 0 || numericScore > 100) {
        throw new ValidationError(`Invalid ${fieldName}`, [
            { field: fieldName, message: `${fieldName} must be between 0 and 100` }
        ]);
    }

    return numericScore;
}

/**
 * Property type validation
 */
function validatePropertyType(propertyType) {
    if (!propertyType) {
        return null;
    }

    const validTypes = [
        'residential', 'commercial', 'industrial', 'agricultural',
        'mixed_use', 'institutional', 'recreational', 'vacant'
    ];

    const normalizedType = String(propertyType).toLowerCase().trim();
    if (!validTypes.includes(normalizedType)) {
        throw new ValidationError('Invalid property type', [
            { 
                field: 'propertyType', 
                message: `Invalid property type: ${propertyType}. Valid types: ${validTypes.join(', ')}` 
            }
        ]);
    }

    return normalizedType;
}

/**
 * Subscription tier validation
 */
function validateSubscriptionTier(tier) {
    const validTiers = ['free', 'premium', 'professional', 'enterprise'];
    
    if (!tier) {
        return 'free';
    }

    const normalizedTier = String(tier).toLowerCase().trim();
    if (!validTiers.includes(normalizedTier)) {
        throw new ValidationError('Invalid subscription tier', [
            { 
                field: 'subscriptionTier', 
                message: `Invalid subscription tier: ${tier}. Valid tiers: ${validTiers.join(', ')}` 
            }
        ]);
    }

    return normalizedTier;
}

/**
 * Bulk addresses validation
 */
function validateBulkAddresses(addresses, maxCount = 100) {
    if (!Array.isArray(addresses)) {
        throw new ValidationError('Invalid addresses', [
            { field: 'addresses', message: 'Addresses must be an array' }
        ]);
    }

    if (addresses.length === 0) {
        throw new ValidationError('Invalid addresses', [
            { field: 'addresses', message: 'At least one address is required' }
        ]);
    }

    if (addresses.length > maxCount) {
        throw new ValidationError('Too many addresses', [
            { field: 'addresses', message: `Maximum ${maxCount} addresses allowed per request` }
        ]);
    }

    const validatedAddresses = [];
    const validationErrors = [];

    addresses.forEach((address, index) => {
        try {
            const validatedAddress = validateAddress(address);
            validatedAddresses.push(validatedAddress);
        } catch (error) {
            validationErrors.push({
                field: `addresses[${index}]`,
                message: error.message
            });
        }
    });

    if (validationErrors.length > 0) {
        throw new ValidationError('Address validation failed', validationErrors);
    }

    return validatedAddresses;
}

/**
 * Date range validation
 */
function validateDateRange(startDate, endDate) {
    const validationErrors = [];

    let start = null;
    let end = null;

    if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
            validationErrors.push({
                field: 'startDate',
                message: 'Start date must be a valid date'
            });
        }
    }

    if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
            validationErrors.push({
                field: 'endDate',
                message: 'End date must be a valid date'
            });
        }
    }

    if (start && end && start > end) {
        validationErrors.push({
            field: 'dateRange',
            message: 'Start date must be before end date'
        });
    }

    // Check if date range is not too far in the past or future
    if (start) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        if (start < oneYearAgo) {
            validationErrors.push({
                field: 'startDate',
                message: 'Start date cannot be more than one year ago'
            });
        }
    }

    if (validationErrors.length > 0) {
        throw new ValidationError('Date range validation failed', validationErrors);
    }

    return { startDate: start, endDate: end };
}

/**
 * Pagination parameters validation
 */
function validatePagination(page, pageSize, maxPageSize = 100) {
    const validationErrors = [];

    // Validate page
    let pageNum = 1;
    if (page !== undefined && page !== null) {
        pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            validationErrors.push({
                field: 'page',
                message: 'Page must be a positive integer'
            });
        }
    }

    // Validate page size
    let pageSizeNum = 20; // Default page size
    if (pageSize !== undefined && pageSize !== null) {
        pageSizeNum = parseInt(pageSize);
        if (isNaN(pageSizeNum) || pageSizeNum < 1) {
            validationErrors.push({
                field: 'pageSize',
                message: 'Page size must be a positive integer'
            });
        } else if (pageSizeNum > maxPageSize) {
            validationErrors.push({
                field: 'pageSize',
                message: `Page size cannot exceed ${maxPageSize}`
            });
        }
    }

    if (validationErrors.length > 0) {
        throw new ValidationError('Pagination validation failed', validationErrors);
    }

    return { page: pageNum, pageSize: pageSizeNum };
}

/**
 * API key validation
 */
function validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new ValidationError('Invalid API key', [
            { field: 'apiKey', message: 'API key must be a non-empty string' }
        ]);
    }

    const trimmedKey = apiKey.trim();
    
    // Basic format validation (adjust pattern based on your API key format)
    const apiKeyPattern = /^[a-zA-Z0-9_-]{32,}$/;
    if (!apiKeyPattern.test(trimmedKey)) {
        throw new ValidationError('Invalid API key format', [
            { field: 'apiKey', message: 'API key format is invalid' }
        ]);
    }

    return trimmedKey;
}

/**
 * Climate projection scenario validation
 */
function validateClimateScenario(scenario) {
    if (!scenario) {
        return null;
    }

    const validScenarios = ['rcp26', 'rcp45', 'rcp60', 'rcp85'];
    const normalizedScenario = String(scenario).toLowerCase().trim();

    if (!validScenarios.includes(normalizedScenario)) {
        throw new ValidationError('Invalid climate scenario', [
            { 
                field: 'scenario', 
                message: `Invalid climate scenario: ${scenario}. Valid scenarios: ${validScenarios.join(', ')}` 
            }
        ]);
    }

    return normalizedScenario;
}

/**
 * Comprehensive request validation for different endpoints
 */
function validateRequest(operation, params) {
    try {
        switch (operation) {
            case 'get_property_risk':
                return validateGetPropertyRiskRequest(params);
            case 'geographic_search':
                return validateGeographicSearchRequest(params);
            case 'bulk_analysis':
                return validateBulkAnalysisRequest(params);
            case 'compare_properties':
                return validateComparePropertiesRequest(params);
            default:
                throw new ValidationError('Unknown operation', [
                    { field: 'operation', message: `Unknown operation: ${operation}` }
                ]);
        }
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError('Request validation failed', [
            { field: 'request', message: error.message }
        ]);
    }
}

function validateGetPropertyRiskRequest(params) {
    const validated = { ...params };

    if (params.address) {
        validated.address = validateAddress(params.address);
    } else if (params.latitude && params.longitude) {
        const coords = validateCoordinates(params.latitude, params.longitude);
        validated.latitude = coords.latitude;
        validated.longitude = coords.longitude;
    } else {
        throw new ValidationError('Missing required parameters', [
            { field: 'address_or_coordinates', message: 'Either address or coordinates (latitude and longitude) are required' }
        ]);
    }

    if (params.riskTypes) {
        validated.riskTypes = validateRiskTypes(params.riskTypes);
    }

    return validated;
}

function validateGeographicSearchRequest(params) {
    const validated = { ...params };

    const coords = validateCoordinates(params.latitude, params.longitude);
    validated.latitude = coords.latitude;
    validated.longitude = coords.longitude;

    validated.radius = validateRadius(params.radius);

    if (params.riskTypes) {
        validated.riskTypes = validateRiskTypes(params.riskTypes);
    }

    if (params.propertyType) {
        validated.propertyType = validatePropertyType(params.propertyType);
    }

    if (params.page || params.pageSize) {
        const pagination = validatePagination(params.page, params.pageSize);
        validated.page = pagination.page;
        validated.pageSize = pagination.pageSize;
    }

    return validated;
}

function validateBulkAnalysisRequest(params) {
    const validated = { ...params };

    validated.addresses = validateBulkAddresses(params.addresses);

    if (params.riskTypes) {
        validated.riskTypes = validateRiskTypes(params.riskTypes);
    }

    return validated;
}

function validateComparePropertiesRequest(params) {
    const validated = { ...params };

    validated.addresses = validateBulkAddresses(params.addresses, 10); // Max 10 for comparison

    if (validated.addresses.length < 2) {
        throw new ValidationError('Insufficient addresses', [
            { field: 'addresses', message: 'At least 2 addresses are required for comparison' }
        ]);
    }

    if (params.riskTypes) {
        validated.riskTypes = validateRiskTypes(params.riskTypes);
    }

    return validated;
}

module.exports = {
    validateAddress,
    validateCoordinates,
    validateRadius,
    validateRiskTypes,
    validateRiskScore,
    validatePropertyType,
    validateSubscriptionTier,
    validateBulkAddresses,
    validateDateRange,
    validatePagination,
    validateApiKey,
    validateClimateScenario,
    validateRequest
};