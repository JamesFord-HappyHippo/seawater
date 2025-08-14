// bulkPropertyRisk.js - Seawater Climate Risk Platform
// POST /properties/bulk-analysis handler for professional tier following Tim-Combo patterns

const { wrapHandler } = require('../../helpers/lambdaWrapper');
const { validateRequest } = require('../../helpers/validationUtil');
const { createBulkAnalysisResponse } = require('../../helpers/responseUtil');
const { ClimateDataError, SubscriptionError } = require('../../helpers/errorHandler');
const { 
    findPropertyByAddress, 
    getCurrentRiskAssessment, 
    upsertProperty, 
    upsertRiskAssessment,
    trackApiUsage 
} = require('../../helpers/dbOperations');
const { geocodeAddress, batchGeocodeAddresses } = require('../../helpers/geocodingService');
const { aggregateClimateData, batchAggregateClimateData } = require('../../helpers/climateDataAggregator');

/**
 * Bulk climate risk analysis for multiple properties
 * Professional tier feature supporting up to 100 properties per request
 */
async function bulkPropertyRiskHandler(event, context) {
    const performanceMetrics = {
        external_api_calls: 0,
        cache_hits: 0,
        cache_misses: 0,
        geocoding_time: 0,
        risk_calculation_time: 0,
        database_time: 0,
        properties_requested: 0,
        properties_processed: 0,
        new_assessments_generated: 0,
        batch_operations: 0
    };

    try {
        // Check subscription tier access
        const subscriptionTier = event.requestContext?.subscriptionTier || 'free';
        if (!['professional', 'enterprise'].includes(subscriptionTier)) {
            throw new SubscriptionError(
                'Bulk analysis requires Professional or Enterprise subscription',
                subscriptionTier,
                'bulk_analysis'
            );
        }

        // Determine max addresses based on subscription tier
        const maxAddresses = subscriptionTier === 'enterprise' ? 1000 : 100;

        // Validate request parameters
        const validatedParams = validateRequest('bulk_analysis', {
            addresses: event.body?.addresses,
            riskTypes: event.body?.riskTypes || event.queryParams?.riskTypes || 'all'
        });

        if (validatedParams.addresses.length > maxAddresses) {
            throw new SubscriptionError(
                `Maximum ${maxAddresses} addresses allowed for ${subscriptionTier} tier`,
                subscriptionTier,
                'bulk_analysis'
            );
        }

        performanceMetrics.properties_requested = validatedParams.addresses.length;

        console.log('Processing bulk property risk analysis:', {
            type: 'bulk_analysis_request',
            timestamp: new Date().toISOString(),
            platform: 'seawater-climate-risk',
            requestId: event.requestContext?.requestId,
            addressCount: validatedParams.addresses.length,
            subscriptionTier: subscriptionTier,
            riskTypes: validatedParams.riskTypes
        });

        const analysisResults = [];
        const processingErrors = [];

        // Batch processing configuration
        const batchSize = subscriptionTier === 'enterprise' ? 50 : 25;
        const batches = [];
        
        for (let i = 0; i < validatedParams.addresses.length; i += batchSize) {
            batches.push(validatedParams.addresses.slice(i, i + batchSize));
        }

        console.log(`Processing ${batches.length} batches of up to ${batchSize} addresses each`);

        // Process batches sequentially to manage API rate limits
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            performanceMetrics.batch_operations++;

            console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} addresses`);

            try {
                const batchResults = await processBatch(
                    batch, 
                    batchIndex, 
                    validatedParams.riskTypes, 
                    performanceMetrics
                );

                analysisResults.push(...batchResults.successes);
                processingErrors.push(...batchResults.errors);

                // Add small delay between batches to respect rate limits
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (batchError) {
                console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
                
                // Add all addresses in failed batch to errors
                batch.forEach((address, addressIndex) => {
                    processingErrors.push({
                        address: address,
                        error: `Batch processing failed: ${batchError.message}`,
                        batch: batchIndex + 1,
                        index: (batchIndex * batchSize) + addressIndex
                    });
                });
            }
        }

        performanceMetrics.properties_processed = analysisResults.length;

        console.log('Bulk analysis completed:', {
            total_requested: validatedParams.addresses.length,
            successful_analyses: analysisResults.length,
            failed_analyses: processingErrors.length,
            batches_processed: performanceMetrics.batch_operations
        });

        // Generate bulk analysis summary
        const bulkAnalytics = generateBulkAnalytics(analysisResults, validatedParams.addresses.length);

        // Track API usage for billing
        if (event.requestContext?.user?.sub || event.requestContext?.apiKey) {
            const baseCost = subscriptionTier === 'enterprise' ? 0.05 : 0.10;
            const perPropertyCost = subscriptionTier === 'enterprise' ? 0.002 : 0.005;
            
            await trackApiUsage({
                userId: event.requestContext.user?.sub,
                apiKeyId: event.requestContext.apiKey,
                endpoint: '/properties/bulk-analysis',
                httpMethod: 'POST',
                statusCode: 200,
                propertyCount: analysisResults.length,
                billableRequest: true,
                cost: baseCost + (perPropertyCost * analysisResults.length),
                userAgent: event.requestContext?.userAgent,
                ipAddress: event.requestContext?.sourceIp
            });
        }

        return createBulkAnalysisResponse(
            analysisResults,
            'Bulk property risk analysis completed'
        );

    } catch (error) {
        console.error('Error in bulkPropertyRisk handler:', {
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
                    endpoint: '/properties/bulk-analysis',
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
 * Process a batch of addresses
 */
async function processBatch(addresses, batchIndex, riskTypes, performanceMetrics) {
    const batchResults = {
        successes: [],
        errors: []
    };

    // Step 1: Check for existing properties in database
    const dbStart = Date.now();
    const existingProperties = new Map();
    
    for (const address of addresses) {
        try {
            const property = await findPropertyByAddress(address);
            if (property) {
                existingProperties.set(address, property);
            }
        } catch (dbError) {
            console.warn(`Database lookup failed for ${address}:`, dbError.message);
        }
    }
    
    performanceMetrics.database_time += Date.now() - dbStart;

    // Step 2: Batch geocode addresses that need geocoding
    const addressesToGeocode = addresses.filter(addr => !existingProperties.has(addr));
    let geocodeResults = new Map();

    if (addressesToGeocode.length > 0) {
        console.log(`Batch geocoding ${addressesToGeocode.length} addresses`);
        
        const geocodeStart = Date.now();
        try {
            const batchGeocodeResult = await batchGeocodeAddresses(addressesToGeocode);
            performanceMetrics.geocoding_time += Date.now() - geocodeStart;
            performanceMetrics.external_api_calls += batchGeocodeResult.api_calls || 0;

            if (batchGeocodeResult.success) {
                geocodeResults = new Map(batchGeocodeResult.results.map(result => [
                    result.address, result
                ]));
            }
        } catch (geocodeError) {
            console.error('Batch geocoding failed:', geocodeError);
            // Fall back to individual geocoding
            for (const address of addressesToGeocode) {
                try {
                    const individual = await geocodeAddress(address);
                    performanceMetrics.external_api_calls++;
                    if (individual.success) {
                        geocodeResults.set(address, individual);
                    }
                } catch (individualError) {
                    console.warn(`Individual geocoding failed for ${address}:`, individualError.message);
                }
            }
            performanceMetrics.geocoding_time += Date.now() - geocodeStart;
        }
    }

    // Step 3: Create property records for successfully geocoded addresses
    const propertyCreationPromises = [];
    
    for (const [address, geocodeResult] of geocodeResults) {
        if (geocodeResult.success) {
            propertyCreationPromises.push(
                upsertProperty({
                    address: address,
                    normalizedAddress: address.toLowerCase().trim(),
                    ...geocodeResult,
                    geocodingAccuracy: geocodeResult.accuracy,
                    geocodingSource: geocodeResult.source
                }).then(property => {
                    existingProperties.set(address, property);
                    return property;
                }).catch(error => {
                    console.error(`Failed to create property for ${address}:`, error);
                    return null;
                })
            );
        }
    }

    if (propertyCreationPromises.length > 0) {
        const dbStart2 = Date.now();
        await Promise.all(propertyCreationPromises);
        performanceMetrics.database_time += Date.now() - dbStart2;
    }

    // Step 4: Collect coordinates for climate data fetching
    const coordinatesForRiskCalc = [];
    const addressToPropertyMap = new Map();

    for (const address of addresses) {
        const property = existingProperties.get(address);
        if (property) {
            coordinatesForRiskCalc.push({
                latitude: property.latitude,
                longitude: property.longitude,
                address: address,
                propertyId: property.id
            });
            addressToPropertyMap.set(address, property);
        } else {
            batchResults.errors.push({
                address: address,
                error: 'Unable to geocode or locate property',
                batch: batchIndex + 1
            });
        }
    }

    // Step 5: Batch fetch climate data
    if (coordinatesForRiskCalc.length > 0) {
        console.log(`Batch fetching climate data for ${coordinatesForRiskCalc.length} properties`);
        
        const riskCalcStart = Date.now();
        try {
            const batchClimateResult = await batchAggregateClimateData(coordinatesForRiskCalc, riskTypes);
            performanceMetrics.risk_calculation_time += Date.now() - riskCalcStart;
            performanceMetrics.external_api_calls += batchClimateResult.external_api_calls || 0;
            performanceMetrics.cache_hits += batchClimateResult.cache_hits || 0;
            performanceMetrics.cache_misses += batchClimateResult.cache_misses || 0;

            // Step 6: Store risk assessments and prepare results
            const riskAssessmentPromises = [];

            for (const result of batchClimateResult.results) {
                if (result.success) {
                    const property = addressToPropertyMap.get(result.address);
                    
                    // Store risk assessment
                    riskAssessmentPromises.push(
                        upsertRiskAssessment({
                            propertyId: property.id,
                            ...result.riskData,
                            assessmentVersion: '1.0',
                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                        }).then(riskAssessment => {
                            performanceMetrics.new_assessments_generated++;
                            
                            batchResults.successes.push({
                                address: result.address,
                                property: {
                                    id: property.id,
                                    address: property.address,
                                    latitude: property.latitude,
                                    longitude: property.longitude,
                                    city: property.city,
                                    state: property.state,
                                    zip_code: property.zip_code
                                },
                                risk_assessment: riskAssessment,
                                batch: batchIndex + 1,
                                processing_time_ms: Date.now() - riskCalcStart
                            });
                        }).catch(error => {
                            console.error(`Failed to store risk assessment for ${result.address}:`, error);
                            batchResults.errors.push({
                                address: result.address,
                                error: `Failed to store risk assessment: ${error.message}`,
                                batch: batchIndex + 1
                            });
                        })
                    );
                } else {
                    batchResults.errors.push({
                        address: result.address,
                        error: `Climate data error: ${result.error}`,
                        batch: batchIndex + 1
                    });
                }
            }

            if (riskAssessmentPromises.length > 0) {
                const dbStart3 = Date.now();
                await Promise.all(riskAssessmentPromises);
                performanceMetrics.database_time += Date.now() - dbStart3;
            }

        } catch (batchClimateError) {
            console.error('Batch climate data fetch failed:', batchClimateError);
            
            // Add all properties to errors
            for (const coord of coordinatesForRiskCalc) {
                batchResults.errors.push({
                    address: coord.address,
                    error: `Climate data batch error: ${batchClimateError.message}`,
                    batch: batchIndex + 1
                });
            }
        }
    }

    return batchResults;
}

/**
 * Generate analytics for bulk analysis results
 */
function generateBulkAnalytics(results, totalRequested) {
    if (results.length === 0) {
        return {
            total_requested: totalRequested,
            successful_analyses: 0,
            failed_analyses: totalRequested,
            success_rate: 0
        };
    }

    const riskScores = results.map(r => r.risk_assessment.overall_risk_score);
    const states = results.map(r => r.property.state).filter(s => s);

    const analytics = {
        total_requested: totalRequested,
        successful_analyses: results.length,
        failed_analyses: totalRequested - results.length,
        success_rate: Math.round((results.length / totalRequested) * 100),
        risk_summary: {
            average_risk_score: Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length),
            min_risk_score: Math.min(...riskScores),
            max_risk_score: Math.max(...riskScores),
            risk_distribution: {
                very_high_risk: riskScores.filter(score => score >= 80).length,
                high_risk: riskScores.filter(score => score >= 60 && score < 80).length,
                moderate_risk: riskScores.filter(score => score >= 40 && score < 60).length,
                low_risk: riskScores.filter(score => score < 40).length
            }
        }
    };

    if (states.length > 0) {
        analytics.geographic_distribution = states.reduce((counts, state) => {
            counts[state] = (counts[state] || 0) + 1;
            return counts;
        }, {});
    }

    return analytics;
}

module.exports = {
    handler: wrapHandler(bulkPropertyRiskHandler)
};