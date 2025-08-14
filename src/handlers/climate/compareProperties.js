// compareProperties.js - Seawater Climate Risk Platform
// POST /properties/compare handler following Tim-Combo patterns

const { wrapHandler } = require('../../helpers/lambdaWrapper');
const { validateRequest } = require('../../helpers/validationUtil');
const { createSuccessResponse } = require('../../helpers/responseUtil');
const { ClimateDataError, NotFoundError } = require('../../helpers/errorHandler');
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
 * Compare climate risks across multiple properties
 * Supports 2-10 properties for detailed comparison
 */
async function comparePropertiesHandler(event, context) {
    const performanceMetrics = {
        external_api_calls: 0,
        cache_hits: 0,
        cache_misses: 0,
        geocoding_time: 0,
        risk_calculation_time: 0,
        database_time: 0,
        properties_processed: 0,
        new_assessments_generated: 0
    };

    try {
        // Validate request parameters
        const validatedParams = validateRequest('compare_properties', {
            addresses: event.body?.addresses,
            riskTypes: event.body?.riskTypes || event.queryParams?.riskTypes || 'all'
        });

        console.log('Processing property comparison request:', {
            type: 'property_comparison_request',
            timestamp: new Date().toISOString(),
            platform: 'seawater-climate-risk',
            requestId: event.requestContext?.requestId,
            addressCount: validatedParams.addresses.length,
            riskTypes: validatedParams.riskTypes
        });

        const propertyComparisons = [];
        const processingErrors = [];

        // Process each address
        for (let i = 0; i < validatedParams.addresses.length; i++) {
            const address = validatedParams.addresses[i];
            
            try {
                console.log(`Processing property ${i + 1}/${validatedParams.addresses.length}:`, address);

                let propertyData = null;
                let propertyCoordinates = null;

                // Try to find existing property
                const dbStart = Date.now();
                propertyData = await findPropertyByAddress(address);
                performanceMetrics.database_time += Date.now() - dbStart;

                if (propertyData) {
                    propertyCoordinates = {
                        latitude: propertyData.latitude,
                        longitude: propertyData.longitude
                    };
                    console.log(`Found existing property ${i + 1}:`, {
                        propertyId: propertyData.id,
                        address: propertyData.address
                    });
                } else {
                    // Geocode the address
                    console.log(`Geocoding property ${i + 1}:`, address);
                    
                    const geocodeStart = Date.now();
                    const geocodeResult = await geocodeAddress(address);
                    performanceMetrics.geocoding_time += Date.now() - geocodeStart;
                    performanceMetrics.external_api_calls++;

                    if (!geocodeResult.success) {
                        processingErrors.push({
                            address: address,
                            error: `Unable to geocode address: ${geocodeResult.error}`,
                            index: i
                        });
                        continue;
                    }

                    propertyCoordinates = {
                        latitude: geocodeResult.latitude,
                        longitude: geocodeResult.longitude
                    };

                    // Store the new property
                    const dbStart2 = Date.now();
                    propertyData = await upsertProperty({
                        address: address,
                        normalizedAddress: address.toLowerCase().trim(),
                        ...geocodeResult,
                        geocodingAccuracy: geocodeResult.accuracy,
                        geocodingSource: geocodeResult.source
                    });
                    performanceMetrics.database_time += Date.now() - dbStart2;

                    console.log(`Created new property ${i + 1}:`, {
                        propertyId: propertyData.id,
                        address: propertyData.address
                    });
                }

                // Check for existing current risk assessment
                const dbStart3 = Date.now();
                let riskAssessment = await getCurrentRiskAssessment(propertyData.id);
                performanceMetrics.database_time += Date.now() - dbStart3;

                // If no current assessment or it's expired, generate new one
                if (!riskAssessment || new Date(riskAssessment.expires_at) <= new Date()) {
                    console.log(`Generating new risk assessment for property ${i + 1}`);

                    const riskCalcStart = Date.now();
                    const climateRisks = await aggregateClimateData(
                        propertyCoordinates.latitude,
                        propertyCoordinates.longitude,
                        validatedParams.riskTypes
                    );
                    performanceMetrics.risk_calculation_time += Date.now() - riskCalcStart;
                    performanceMetrics.external_api_calls += climateRisks.external_api_calls || 0;
                    performanceMetrics.cache_hits += climateRisks.cache_hits || 0;
                    performanceMetrics.cache_misses += climateRisks.cache_misses || 0;
                    performanceMetrics.new_assessments_generated++;

                    if (!climateRisks.success) {
                        processingErrors.push({
                            address: address,
                            error: `Unable to retrieve climate risk data: ${climateRisks.error}`,
                            index: i
                        });
                        continue;
                    }

                    // Store the new risk assessment
                    const dbStart4 = Date.now();
                    riskAssessment = await upsertRiskAssessment({
                        propertyId: propertyData.id,
                        ...climateRisks.riskData,
                        assessmentVersion: '1.0',
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                    });
                    performanceMetrics.database_time += Date.now() - dbStart4;

                    console.log(`Generated new risk assessment for property ${i + 1}:`, {
                        propertyId: propertyData.id,
                        overallRiskScore: riskAssessment.overall_risk_score
                    });
                } else {
                    console.log(`Using existing risk assessment for property ${i + 1}`);
                }

                // Add to comparison results
                propertyComparisons.push({
                    property: {
                        id: propertyData.id,
                        address: propertyData.address,
                        normalized_address: propertyData.normalized_address,
                        latitude: propertyData.latitude,
                        longitude: propertyData.longitude,
                        city: propertyData.city,
                        state: propertyData.state,
                        zip_code: propertyData.zip_code,
                        property_type: propertyData.property_type,
                        geocoding_accuracy: propertyData.geocoding_accuracy
                    },
                    risk_assessment: {
                        overall_risk_score: riskAssessment.overall_risk_score,
                        risk_category: riskAssessment.risk_category,
                        flood_risk_score: riskAssessment.flood_risk_score,
                        wildfire_risk_score: riskAssessment.wildfire_risk_score,
                        hurricane_risk_score: riskAssessment.hurricane_risk_score,
                        tornado_risk_score: riskAssessment.tornado_risk_score,
                        earthquake_risk_score: riskAssessment.earthquake_risk_score,
                        heat_risk_score: riskAssessment.heat_risk_score,
                        drought_risk_score: riskAssessment.drought_risk_score,
                        hail_risk_score: riskAssessment.hail_risk_score,
                        fema_flood_zone: riskAssessment.fema_flood_zone,
                        confidence_score: riskAssessment.confidence_score,
                        assessment_date: riskAssessment.assessment_date,
                        expires_at: riskAssessment.expires_at
                    },
                    comparison_rank: 0 // Will be calculated below
                });

                performanceMetrics.properties_processed++;

            } catch (propertyError) {
                console.error(`Error processing property ${i + 1}:`, {
                    address: address,
                    error: propertyError.message
                });

                processingErrors.push({
                    address: address,
                    error: propertyError.message,
                    index: i
                });
            }
        }

        // Calculate comparison rankings
        if (propertyComparisons.length > 0) {
            // Sort by overall risk score (descending) and assign ranks
            const sortedByRisk = [...propertyComparisons].sort((a, b) => 
                b.risk_assessment.overall_risk_score - a.risk_assessment.overall_risk_score
            );

            sortedByRisk.forEach((property, index) => {
                const originalProperty = propertyComparisons.find(p => 
                    p.property.id === property.property.id
                );
                if (originalProperty) {
                    originalProperty.comparison_rank = index + 1;
                }
            });
        }

        // Generate comparison analytics
        const comparisonAnalytics = generateComparisonAnalytics(propertyComparisons);

        // Track API usage for billing
        if (event.requestContext?.user?.sub || event.requestContext?.apiKey) {
            await trackApiUsage({
                userId: event.requestContext.user?.sub,
                apiKeyId: event.requestContext.apiKey,
                endpoint: '/properties/compare',
                httpMethod: 'POST',
                statusCode: 200,
                propertyCount: propertyComparisons.length,
                billableRequest: true,
                cost: 0.002 * propertyComparisons.length, // $0.002 per property comparison
                userAgent: event.requestContext?.userAgent,
                ipAddress: event.requestContext?.sourceIp
            });
        }

        return createSuccessResponse(
            propertyComparisons,
            'Property comparison completed successfully',
            {
                Analytics: {
                    total_requested: validatedParams.addresses.length,
                    successfully_processed: propertyComparisons.length,
                    failed_properties: processingErrors.length,
                    ...comparisonAnalytics,
                    processing_errors: processingErrors
                },
                Performance_Metrics: performanceMetrics,
                search_type: 'property_comparison',
                risk_types: validatedParams.riskTypes
            }
        );

    } catch (error) {
        console.error('Error in compareProperties handler:', {
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
                    endpoint: '/properties/compare',
                    httpMethod: 'POST',
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
 * Generate analytics for property comparison
 */
function generateComparisonAnalytics(properties) {
    if (properties.length === 0) {
        return {};
    }

    const riskScores = properties.map(p => p.risk_assessment.overall_risk_score);
    const floodScores = properties.map(p => p.risk_assessment.flood_risk_score);
    const wildfireScores = properties.map(p => p.risk_assessment.wildfire_risk_score);

    const analytics = {
        highest_risk_property: properties.find(p => p.comparison_rank === 1)?.property.address,
        lowest_risk_property: properties.find(p => 
            p.comparison_rank === Math.max(...properties.map(p => p.comparison_rank))
        )?.property.address,
        risk_score_range: {
            min: Math.min(...riskScores),
            max: Math.max(...riskScores),
            average: Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length)
        },
        risk_distribution: {
            very_high_risk: properties.filter(p => p.risk_assessment.overall_risk_score >= 80).length,
            high_risk: properties.filter(p => p.risk_assessment.overall_risk_score >= 60 && p.risk_assessment.overall_risk_score < 80).length,
            moderate_risk: properties.filter(p => p.risk_assessment.overall_risk_score >= 40 && p.risk_assessment.overall_risk_score < 60).length,
            low_risk: properties.filter(p => p.risk_assessment.overall_risk_score < 40).length
        },
        primary_risk_types: {
            flood_dominated: floodScores.filter(score => score >= 60).length,
            wildfire_dominated: wildfireScores.filter(score => score >= 60).length
        }
    };

    // Geographic distribution
    const states = properties.map(p => p.property.state).filter(s => s);
    if (states.length > 0) {
        const stateCounts = states.reduce((counts, state) => {
            counts[state] = (counts[state] || 0) + 1;
            return counts;
        }, {});
        analytics.geographic_distribution = stateCounts;
    }

    return analytics;
}

module.exports = {
    handler: wrapHandler(comparePropertiesHandler)
};