// getPropertyRisk.js - Seawater Climate Risk Platform
// GET /properties/{address}/risk handler following Tim-Combo patterns

const { wrapHandler } = require('../../helpers/lambdaWrapper');
const { withTrialEnforcement } = require('../../helpers/trialMiddleware');
const { validateRequest } = require('../../helpers/validationUtil');
const { createPropertyRiskResponse, createErrorResponse } = require('../../helpers/responseUtil');
const { NotFoundError, ClimateDataError } = require('../../helpers/errorHandler');
const { 
    findPropertyByAddress, 
    getCurrentRiskAssessment, 
    upsertProperty, 
    upsertRiskAssessment,
    trackApiUsage 
} = require('../../helpers/dbOperations');
const { geocodeAddress } = require('../../helpers/geocodingService');
const { aggregateClimateData } = require('../../helpers/climateDataAggregator');

/**
 * Get climate risk assessment for a specific property
 * Supports both address and coordinate-based queries
 */
async function getPropertyRiskHandler(event, context) {
    const performanceMetrics = {
        external_api_calls: 0,
        cache_hits: 0,
        cache_misses: 0,
        geocoding_time: 0,
        risk_calculation_time: 0,
        database_time: 0
    };

    try {
        // Extract address from path parameters or query parameters
        const address = event.pathParams?.address || 
                       event.queryParams?.address ||
                       decodeURIComponent(event.path?.split('/').pop() || '');
        
        const coordinates = event.queryParams?.latitude && event.queryParams?.longitude ? {
            latitude: parseFloat(event.queryParams.latitude),
            longitude: parseFloat(event.queryParams.longitude)
        } : null;

        // Validate request parameters
        const validatedParams = validateRequest('get_property_risk', {
            address: address || null,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            riskTypes: event.queryParams?.riskTypes || 'all'
        });

        console.log('Processing property risk request:', {
            type: 'property_risk_request',
            timestamp: new Date().toISOString(),
            platform: 'seawater-climate-risk',
            requestId: event.requestContext?.requestId,
            address: validatedParams.address,
            coordinates: coordinates,
            riskTypes: validatedParams.riskTypes
        });

        let propertyData = null;
        let propertyCoordinates = coordinates;

        // Try to find existing property first
        if (validatedParams.address) {
            const dbStart = Date.now();
            propertyData = await findPropertyByAddress(validatedParams.address);
            performanceMetrics.database_time += Date.now() - dbStart;

            if (propertyData) {
                propertyCoordinates = {
                    latitude: propertyData.latitude,
                    longitude: propertyData.longitude
                };
                console.log('Found existing property in database:', {
                    propertyId: propertyData.id,
                    address: propertyData.address,
                    geocodingAccuracy: propertyData.geocoding_accuracy
                });
            }
        }

        // If property not found and we have an address, geocode it
        if (!propertyData && validatedParams.address) {
            console.log('Property not found, geocoding address:', validatedParams.address);
            
            const geocodeStart = Date.now();
            const geocodeResult = await geocodeAddress(validatedParams.address);
            performanceMetrics.geocoding_time = Date.now() - geocodeStart;
            performanceMetrics.external_api_calls++;

            if (!geocodeResult.success) {
                throw new NotFoundError(
                    `Unable to geocode address: ${validatedParams.address}`,
                    'property'
                );
            }

            propertyCoordinates = {
                latitude: geocodeResult.latitude,
                longitude: geocodeResult.longitude
            };

            // Store the new property
            const dbStart = Date.now();
            propertyData = await upsertProperty({
                address: validatedParams.address,
                normalizedAddress: validatedParams.address.toLowerCase().trim(),
                ...geocodeResult,
                geocodingAccuracy: geocodeResult.accuracy,
                geocodingSource: geocodeResult.source
            });
            performanceMetrics.database_time += Date.now() - dbStart;

            console.log('Created new property record:', {
                propertyId: propertyData.id,
                address: propertyData.address,
                coordinates: propertyCoordinates
            });
        }

        if (!propertyCoordinates) {
            throw new NotFoundError(
                'Unable to determine property location',
                'coordinates'
            );
        }

        // Check for existing current risk assessment
        let riskAssessment = null;
        if (propertyData) {
            const dbStart = Date.now();
            riskAssessment = await getCurrentRiskAssessment(propertyData.id);
            performanceMetrics.database_time += Date.now() - dbStart;
        }

        // If no current assessment or it's expired, generate new one
        if (!riskAssessment || new Date(riskAssessment.expires_at) <= new Date()) {
            console.log('Generating new risk assessment:', {
                propertyId: propertyData?.id,
                hasExpiredAssessment: !!riskAssessment,
                expiresAt: riskAssessment?.expires_at
            });

            const riskCalcStart = Date.now();
            const climateRisks = await aggregateClimateData(
                propertyCoordinates.latitude,
                propertyCoordinates.longitude,
                validatedParams.riskTypes
            );
            performanceMetrics.risk_calculation_time = Date.now() - riskCalcStart;
            performanceMetrics.external_api_calls += climateRisks.external_api_calls || 0;
            performanceMetrics.cache_hits += climateRisks.cache_hits || 0;
            performanceMetrics.cache_misses += climateRisks.cache_misses || 0;

            if (!climateRisks.success) {
                throw new ClimateDataError(
                    'Unable to retrieve climate risk data',
                    climateRisks.error_source,
                    true
                );
            }

            // Store the new risk assessment
            if (propertyData) {
                const dbStart = Date.now();
                riskAssessment = await upsertRiskAssessment({
                    propertyId: propertyData.id,
                    ...climateRisks.riskData,
                    assessmentVersion: '1.0',
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                });
                performanceMetrics.database_time += Date.now() - dbStart;
            } else {
                // For coordinate-only requests, return calculated data without storing
                riskAssessment = {
                    ...climateRisks.riskData,
                    assessment_date: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                };
            }

            console.log('Generated new risk assessment:', {
                propertyId: propertyData?.id,
                overallRiskScore: riskAssessment.overall_risk_score,
                primaryRisks: climateRisks.primaryRisks,
                dataSource: climateRisks.sources
            });
        } else {
            console.log('Using existing risk assessment:', {
                propertyId: propertyData.id,
                assessmentDate: riskAssessment.assessment_date,
                expiresAt: riskAssessment.expires_at
            });
        }

        // Track API usage for billing
        if (event.requestContext?.user?.sub || event.requestContext?.apiKey) {
            await trackApiUsage({
                userId: event.requestContext.user?.sub,
                apiKeyId: event.requestContext.apiKey,
                endpoint: '/properties/risk',
                httpMethod: 'GET',
                statusCode: 200,
                propertyCount: 1,
                billableRequest: true,
                cost: 0.001, // $0.001 per property risk request
                userAgent: event.requestContext?.userAgent,
                ipAddress: event.requestContext?.sourceIp
            });
        }

        // Prepare response data
        const responsePropertyData = propertyData || {
            address: validatedParams.address,
            latitude: propertyCoordinates.latitude,
            longitude: propertyCoordinates.longitude,
            geocoding_accuracy: 'coordinate_provided'
        };

        const result = createPropertyRiskResponse(
            responsePropertyData,
            riskAssessment,
            'Property risk assessment retrieved successfully'
        );

        // Add performance metrics to response
        result.body = JSON.parse(result.body);
        result.body.meta.Performance_Metrics = performanceMetrics;
        result.body = JSON.stringify(result.body);

        return result;

    } catch (error) {
        console.error('Error in getPropertyRisk handler:', {
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
                    endpoint: '/properties/risk',
                    httpMethod: 'GET',
                    statusCode: error.statusCode || 500,
                    propertyCount: 1,
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

// Export with trial enforcement middleware
module.exports = {
    handler: withTrialEnforcement(wrapHandler(getPropertyRiskHandler), {
        usageType: 'risk_assessment',
        trackUsage: true,
        requireTrial: true,
        allowPaidUsers: true
    })
};