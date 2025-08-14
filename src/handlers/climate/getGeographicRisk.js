// getGeographicRisk.js - Seawater Climate Risk Platform
// GET /geographic/risk handler for radius-based searches following Tim-Combo patterns

const { wrapHandler } = require('../../helpers/lambdaWrapper');
const { validateRequest } = require('../../helpers/validationUtil');
const { createGeographicSearchResponse } = require('../../helpers/responseUtil');
const { ClimateDataError, SpatialQueryError } = require('../../helpers/errorHandler');
const { 
    findPropertiesWithinRadius, 
    getCurrentRiskAssessment,
    trackApiUsage 
} = require('../../helpers/dbOperations');
const { getBoundaryData } = require('../../helpers/spatialQueries');
const { getCachedRegionalRiskData, setCachedRegionalRiskData } = require('../../helpers/cacheManager');

/**
 * Get climate risk data for properties within a geographic radius
 * Supports filtering by risk thresholds and property types
 */
async function getGeographicRiskHandler(event, context) {
    const performanceMetrics = {
        spatial_query_time: 0,
        cache_hits: 0,
        cache_misses: 0,
        boundary_lookups: 0,
        properties_found: 0,
        risk_assessments_loaded: 0
    };

    try {
        // Validate request parameters
        const validatedParams = validateRequest('geographic_search', {
            latitude: event.queryParams?.latitude || event.queryParams?.lat,
            longitude: event.queryParams?.longitude || event.queryParams?.lng || event.queryParams?.lon,
            radius: event.queryParams?.radius,
            riskTypes: event.queryParams?.riskTypes || 'all',
            riskThreshold: event.queryParams?.riskThreshold,
            propertyType: event.queryParams?.propertyType,
            page: event.queryParams?.page,
            pageSize: event.queryParams?.pageSize
        });

        const { latitude, longitude, radius } = validatedParams;
        
        console.log('Processing geographic risk search:', {
            type: 'geographic_risk_request',
            timestamp: new Date().toISOString(),
            platform: 'seawater-climate-risk',
            requestId: event.requestContext?.requestId,
            center: `${latitude},${longitude}`,
            radius: radius,
            filters: {
                riskThreshold: validatedParams.riskThreshold,
                propertyType: validatedParams.propertyType,
                riskTypes: validatedParams.riskTypes
            }
        });

        // Check cache for regional risk data
        const cacheKey = `geo_risk_${latitude}_${longitude}_${radius}_${validatedParams.riskThreshold || 'any'}_${validatedParams.propertyType || 'any'}`;
        let cachedResult = null;
        
        try {
            cachedResult = await getCachedRegionalRiskData(cacheKey);
            if (cachedResult) {
                performanceMetrics.cache_hits++;
                console.log('Found cached geographic risk data:', {
                    cacheKey: cacheKey,
                    propertyCount: cachedResult.properties.length
                });
            }
        } catch (cacheError) {
            console.warn('Cache lookup failed, proceeding with database query:', cacheError.message);
        }

        let searchResults = [];
        
        if (!cachedResult) {
            performanceMetrics.cache_misses++;
            
            // Build search filters
            const searchFilters = {};
            
            if (validatedParams.riskThreshold) {
                searchFilters.riskThreshold = parseInt(validatedParams.riskThreshold);
            }
            
            if (validatedParams.propertyType) {
                searchFilters.propertyType = validatedParams.propertyType;
            }

            // Set pagination limit (max 1000 for geographic searches)
            searchFilters.limit = Math.min(validatedParams.pageSize || 100, 1000);

            // Execute spatial query
            console.log('Executing spatial query:', {
                center: `${latitude},${longitude}`,
                radius: radius,
                filters: searchFilters
            });

            const spatialStart = Date.now();
            const properties = await findPropertiesWithinRadius(
                latitude, 
                longitude, 
                radius, 
                searchFilters
            );
            performanceMetrics.spatial_query_time = Date.now() - spatialStart;
            performanceMetrics.properties_found = properties.length;

            if (properties.length === 0) {
                console.log('No properties found in search radius');
                return createGeographicSearchResponse(
                    [],
                    {
                        latitude,
                        longitude,
                        radius,
                        filters: searchFilters
                    },
                    'No properties found within the specified radius'
                );
            }

            console.log(`Found ${properties.length} properties in radius`);

            // Enrich with detailed risk assessments and boundary information
            searchResults = await enrichPropertiesWithRiskData(properties, performanceMetrics);

            // Cache the results for future queries (cache for 1 hour)
            try {
                await setCachedRegionalRiskData(cacheKey, {
                    properties: searchResults,
                    searchParams: {
                        latitude,
                        longitude,
                        radius,
                        filters: searchFilters
                    },
                    timestamp: new Date().toISOString()
                }, 3600);
            } catch (cacheError) {
                console.warn('Failed to cache results:', cacheError.message);
            }
        } else {
            searchResults = cachedResult.properties;
            performanceMetrics.properties_found = searchResults.length;
        }

        // Apply pagination to results
        const paginatedResults = applyPagination(
            searchResults,
            validatedParams.page || 1,
            validatedParams.pageSize || 100
        );

        // Get boundary context for the search area
        const boundaryContext = await getBoundaryContext(
            latitude, 
            longitude, 
            radius, 
            performanceMetrics
        );

        // Generate geographic analytics
        const geographicAnalytics = generateGeographicAnalytics(
            searchResults,
            { latitude, longitude, radius }
        );

        // Track API usage for billing
        if (event.requestContext?.user?.sub || event.requestContext?.apiKey) {
            await trackApiUsage({
                userId: event.requestContext.user?.sub,
                apiKeyId: event.requestContext.apiKey,
                endpoint: '/geographic/risk',
                httpMethod: 'GET',
                statusCode: 200,
                propertyCount: searchResults.length,
                billableRequest: true,
                cost: 0.005 + (0.001 * Math.min(searchResults.length, 100)), // Base cost + per property
                userAgent: event.requestContext?.userAgent,
                ipAddress: event.requestContext?.sourceIp
            });
        }

        const response = createGeographicSearchResponse(
            paginatedResults.properties,
            {
                latitude,
                longitude,
                radius,
                filters: validatedParams
            },
            `Found ${searchResults.length} properties within ${radius}m radius`
        );

        // Add enhanced metadata to response
        const responseBody = JSON.parse(response.body);
        responseBody.meta = {
            ...responseBody.meta,
            Performance_Metrics: performanceMetrics,
            Geographic_Analytics: geographicAnalytics,
            Boundary_Context: boundaryContext,
            Pagination: paginatedResults.pagination,
            cache_status: cachedResult ? 'hit' : 'miss'
        };
        response.body = JSON.stringify(responseBody);

        return response;

    } catch (error) {
        console.error('Error in getGeographicRisk handler:', {
            error: error.message,
            stack: error.stack,
            requestId: event.requestContext?.requestId
        });

        // Track failed usage
        if (event.requestContext?.user?.sub || event.requestContext?.apiKey) {
            try {
                await trackApiUsage({
                    userId: event.requestContext.user?.sub,
                    apiKeyId: event.requestContext.apiKey,
                    endpoint: '/geographic/risk',
                    httpMethod: 'GET',
                    statusCode: error.statusCode || 500,
                    propertyCount: 0,
                    billableRequest: false,
                    cost: 0,
                    userAgent: event.requestContext?.userAgent,
                    ipAddress: event.requestContext?.sourceIp
                });
            } catch (trackingError) {
                console.error('Error tracking failed usage:', trackingError);
            }
        }

        throw error;
    }
}

/**
 * Enrich properties with detailed risk assessment data
 */
async function enrichPropertiesWithRiskData(properties, performanceMetrics) {
    const enrichedProperties = [];

    for (const property of properties) {
        try {
            // Get current risk assessment if not already included
            let riskAssessment = null;
            if (property.overall_risk_score !== undefined) {
                // Risk data already included from the spatial query
                riskAssessment = {
                    overall_risk_score: property.overall_risk_score,
                    flood_risk_score: property.flood_risk_score,
                    wildfire_risk_score: property.wildfire_risk_score,
                    hurricane_risk_score: property.hurricane_risk_score,
                    earthquake_risk_score: property.earthquake_risk_score
                };
            } else {
                // Load risk assessment separately
                riskAssessment = await getCurrentRiskAssessment(property.id);
                performanceMetrics.risk_assessments_loaded++;
            }

            if (riskAssessment) {
                enrichedProperties.push({
                    property: {
                        id: property.id,
                        address: property.address,
                        normalized_address: property.normalized_address,
                        latitude: property.latitude,
                        longitude: property.longitude,
                        city: property.city,
                        state: property.state,
                        zip_code: property.zip_code,
                        property_type: property.property_type,
                        distance_meters: Math.round(property.distance_meters)
                    },
                    risk_assessment: riskAssessment,
                    location_context: {
                        distance_from_center: Math.round(property.distance_meters),
                        relative_position: getRelativePosition(property.distance_meters)
                    }
                });
            }
        } catch (enrichError) {
            console.warn(`Failed to enrich property ${property.id}:`, enrichError.message);
            // Include property without full risk data
            enrichedProperties.push({
                property: {
                    id: property.id,
                    address: property.address,
                    latitude: property.latitude,
                    longitude: property.longitude,
                    distance_meters: Math.round(property.distance_meters)
                },
                risk_assessment: null,
                error: 'Risk data unavailable'
            });
        }
    }

    return enrichedProperties;
}

/**
 * Get boundary context for the search area
 */
async function getBoundaryContext(latitude, longitude, radius, performanceMetrics) {
    try {
        const boundaryStart = Date.now();
        const boundaries = await getBoundaryData(latitude, longitude, radius);
        performanceMetrics.boundary_lookups = Date.now() - boundaryStart;

        return {
            counties: boundaries.counties || [],
            flood_zones: boundaries.floodZones || [],
            wildfire_zones: boundaries.wildfireZones || [],
            administrative_areas: boundaries.administrativeAreas || []
        };
    } catch (boundaryError) {
        console.warn('Failed to get boundary context:', boundaryError.message);
        return {
            counties: [],
            flood_zones: [],
            wildfire_zones: [],
            administrative_areas: [],
            error: 'Boundary data unavailable'
        };
    }
}

/**
 * Generate analytics for geographic search results
 */
function generateGeographicAnalytics(properties, searchParams) {
    if (properties.length === 0) {
        return {};
    }

    const riskScores = properties
        .map(p => p.risk_assessment?.overall_risk_score)
        .filter(score => score !== undefined);

    const distances = properties.map(p => p.property.distance_meters);

    const analytics = {
        spatial_distribution: {
            center_point: `${searchParams.latitude},${searchParams.longitude}`,
            search_radius_meters: searchParams.radius,
            average_distance_from_center: Math.round(
                distances.reduce((sum, dist) => sum + dist, 0) / distances.length
            ),
            furthest_property_distance: Math.max(...distances),
            closest_property_distance: Math.min(...distances)
        }
    };

    if (riskScores.length > 0) {
        analytics.risk_distribution = {
            average_risk_score: Math.round(
                riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
            ),
            min_risk_score: Math.min(...riskScores),
            max_risk_score: Math.max(...riskScores),
            high_risk_properties: riskScores.filter(score => score >= 70).length,
            moderate_risk_properties: riskScores.filter(score => score >= 40 && score < 70).length,
            low_risk_properties: riskScores.filter(score => score < 40).length
        };

        // Risk concentration analysis
        const riskByDistance = properties
            .filter(p => p.risk_assessment?.overall_risk_score)
            .map(p => ({
                distance: p.property.distance_meters,
                risk: p.risk_assessment.overall_risk_score
            }));

        if (riskByDistance.length > 0) {
            const closeProperties = riskByDistance.filter(p => p.distance < searchParams.radius * 0.5);
            const farProperties = riskByDistance.filter(p => p.distance >= searchParams.radius * 0.5);

            if (closeProperties.length > 0 && farProperties.length > 0) {
                const closeAvgRisk = closeProperties.reduce((sum, p) => sum + p.risk, 0) / closeProperties.length;
                const farAvgRisk = farProperties.reduce((sum, p) => sum + p.risk, 0) / farProperties.length;

                analytics.risk_concentration = {
                    inner_radius_avg_risk: Math.round(closeAvgRisk),
                    outer_radius_avg_risk: Math.round(farAvgRisk),
                    risk_gradient: Math.round(closeAvgRisk - farAvgRisk) // Positive = higher risk near center
                };
            }
        }
    }

    // Geographic clustering
    const states = properties.map(p => p.property.state).filter(s => s);
    if (states.length > 0) {
        analytics.geographic_clustering = states.reduce((counts, state) => {
            counts[state] = (counts[state] || 0) + 1;
            return counts;
        }, {});
    }

    return analytics;
}

/**
 * Apply pagination to search results
 */
function applyPagination(properties, page, pageSize) {
    const totalRecords = properties.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRecords);
    
    const paginatedProperties = properties.slice(startIndex, endIndex);

    return {
        properties: paginatedProperties,
        pagination: {
            current_page: page,
            page_size: pageSize,
            total_records: totalRecords,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_previous: page > 1,
            start_index: startIndex + 1,
            end_index: endIndex
        }
    };
}

/**
 * Get relative position description based on distance
 */
function getRelativePosition(distanceMeters) {
    if (distanceMeters < 100) return 'very_close';
    if (distanceMeters < 500) return 'close';
    if (distanceMeters < 1000) return 'nearby';
    if (distanceMeters < 5000) return 'moderate_distance';
    return 'far';
}

module.exports = {
    handler: wrapHandler(getGeographicRiskHandler)
};