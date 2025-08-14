/**
 * Basic Usage Examples - Climate Data Integration Platform
 * Demonstrates how to use the Seawater climate data integration system
 */

const { ClimateDataIntegration } = require('../index');

/**
 * Example 1: Basic Property Risk Assessment
 */
async function basicPropertyAssessment() {
    // Initialize the integration platform
    const climate = new ClimateDataIntegration({
        // Optional Redis for caching
        cache: {
            // redisClient: redisClient, // Provide Redis client if available
            keyPrefix: 'seawater:dev:',
            defaultTTL: 3600
        },
        // MapBox token for geocoding
        mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
        // HTTP client configuration
        http: {
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000
        },
        // Platform options
        enableMonitoring: true,
        rateLimitingEnabled: true,
        fallbackEnabled: true
    });

    try {
        // Get comprehensive risk assessment for an address
        const assessment = await climate.getPropertyRiskAssessment(
            '1600 Pennsylvania Avenue NW, Washington, DC 20500'
        );

        console.log('=== PROPERTY RISK ASSESSMENT ===');
        console.log(`Address: ${assessment.location.address}`);
        console.log(`Coordinates: ${assessment.location.coordinates.latitude}, ${assessment.location.coordinates.longitude}`);
        console.log(`Overall Risk Score: ${assessment.overallRisk.score}/100`);
        console.log(`Risk Level: ${assessment.overallRisk.level}`);
        console.log(`Confidence: ${Math.round(assessment.overallRisk.confidence * 100)}%`);
        console.log(`Data Sources Used: ${assessment.dataSources.join(', ')}`);
        
        console.log('\n=== RISK BREAKDOWN ===');
        for (const [riskType, riskData] of Object.entries(assessment.riskBreakdown)) {
            console.log(`${riskType}: ${riskData.score}/100 (${riskData.level}) - ${Math.round(riskData.confidence * 100)}% confidence`);
        }

        return assessment;

    } catch (error) {
        console.error('Risk assessment failed:', error.message);
        throw error;
    } finally {
        // Clean up resources
        await climate.destroy();
    }
}

/**
 * Example 2: Coordinate-based Risk Assessment
 */
async function coordinateRiskAssessment() {
    const climate = new ClimateDataIntegration({
        mapboxToken: process.env.MAPBOX_ACCESS_TOKEN
    });

    try {
        // San Francisco coordinates (earthquake risk area)
        const latitude = 37.7749;
        const longitude = -122.4194;

        const assessment = await climate.getRiskAssessmentByCoordinates(latitude, longitude);

        console.log('=== COORDINATE RISK ASSESSMENT ===');
        console.log(`Location: ${latitude}, ${longitude}`);
        console.log(`Address Context: ${assessment.location.addressContext}`);
        console.log(`Overall Risk Score: ${assessment.overallRisk.score}/100`);
        console.log(`Primary Risks:`);
        
        for (const [riskType, riskData] of Object.entries(assessment.riskBreakdown)) {
            if (riskData.score > 50) {
                console.log(`  - ${riskType}: ${riskData.score}/100 (${riskData.level})`);
            }
        }

        return assessment;

    } catch (error) {
        console.error('Coordinate assessment failed:', error.message);
        throw error;
    } finally {
        await climate.destroy();
    }
}

/**
 * Example 3: Batch Processing Multiple Addresses
 */
async function batchRiskAssessment() {
    const climate = new ClimateDataIntegration({
        mapboxToken: process.env.MAPBOX_ACCESS_TOKEN
    });

    const addresses = [
        '1600 Pennsylvania Avenue NW, Washington, DC',
        '350 Fifth Avenue, New York, NY 10118', // Empire State Building
        '1 Infinite Loop, Cupertino, CA 95014', // Apple Park
        '1600 Amphitheatre Parkway, Mountain View, CA', // Google
        '410 Terry Avenue North, Seattle, WA 98109' // Amazon
    ];

    try {
        console.log('=== BATCH RISK ASSESSMENT ===');
        console.log(`Processing ${addresses.length} addresses...`);

        const results = await climate.batchRiskAssessment(addresses, {
            batchSize: 3,
            concurrent: 2
        });

        console.log(`\nBatch Summary:`);
        console.log(`Total: ${results.summary.total}`);
        console.log(`Successful: ${results.summary.successful}`);
        console.log(`Failed: ${results.summary.failed}`);
        console.log(`Success Rate: ${results.summary.successRate}%`);

        console.log(`\nResults:`);
        for (const result of results.results) {
            if (result.success) {
                const assessment = result.assessment;
                console.log(`✓ ${result.address}`);
                console.log(`  Score: ${assessment.overallRisk.score}/100 (${assessment.overallRisk.level})`);
                console.log(`  Confidence: ${Math.round(assessment.overallRisk.confidence * 100)}%`);
            } else {
                console.log(`✗ ${result.address} - ${result.error}`);
            }
        }

        return results;

    } catch (error) {
        console.error('Batch assessment failed:', error.message);
        throw error;
    } finally {
        await climate.destroy();
    }
}

/**
 * Example 4: Platform Health and Statistics
 */
async function platformHealthCheck() {
    const climate = new ClimateDataIntegration({
        mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
        enableMonitoring: true
    });

    try {
        console.log('=== PLATFORM HEALTH CHECK ===');

        // Test all integrations
        const integrationTests = await climate.testIntegrations();
        
        console.log('Integration Tests:');
        for (const [service, result] of Object.entries(integrationTests)) {
            const status = result.success ? '✓' : '✗';
            console.log(`  ${status} ${service.toUpperCase()}: ${result.message}`);
            if (result.responseTime) {
                console.log(`    Response Time: ${result.responseTime}ms`);
            }
        }

        // Get health status
        const health = await climate.getHealthStatus();
        
        console.log('\nSystem Health:');
        console.log(`Platform Status: ${health.platform.status}`);
        console.log(`Uptime: ${Math.round(health.platform.uptime)}s`);
        
        console.log('\nData Source Status:');
        for (const [sourceId, status] of Object.entries(health.dataSources)) {
            if (status.error) continue;
            console.log(`  ${sourceId}: ${status.healthStatus} (${status.successRate}% success rate)`);
        }

        // Get platform statistics
        const stats = climate.getStats();
        
        console.log('\nPlatform Statistics:');
        console.log(`HTTP Requests: ${stats.httpClient.totalRequests} (${stats.httpClient.successRate}% success)`);
        console.log(`Cache Hit Rate: ${stats.cacheManager.hitRate}%`);
        console.log(`Risk Aggregations: ${stats.riskAggregator.totalAggregations}`);

        return { health, stats };

    } catch (error) {
        console.error('Health check failed:', error.message);
        throw error;
    } finally {
        await climate.destroy();
    }
}

/**
 * Example 5: Environment Configuration
 */
function getEnvironmentConfig() {
    return {
        // Required environment variables
        MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
        NOAA_API_TOKEN: process.env.NOAA_API_TOKEN,
        FIRSTSTREET_API_KEY: process.env.FIRSTSTREET_API_KEY,
        CLIMATECHECK_API_KEY: process.env.CLIMATECHECK_API_KEY,
        GOOGLE_GEOCODING_API_KEY: process.env.GOOGLE_GEOCODING_API_KEY,
        
        // Optional Redis configuration
        REDIS_URL: process.env.REDIS_URL,
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        
        // Database configuration
        DATABASE_URL: process.env.DATABASE_URL,
        
        // Application settings
        NODE_ENV: process.env.NODE_ENV || 'development',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info'
    };
}

/**
 * Example 6: Custom Risk Analysis
 */
async function customRiskAnalysis() {
    const climate = new ClimateDataIntegration({
        mapboxToken: process.env.MAPBOX_ACCESS_TOKEN
    });

    try {
        // Analyze high-risk areas in California (wildfire zones)
        const californiaLocations = [
            'Paradise, CA',
            'Santa Rosa, CA', 
            'Malibu, CA',
            'Big Sur, CA'
        ];

        console.log('=== CALIFORNIA WILDFIRE RISK ANALYSIS ===');

        for (const location of californiaLocations) {
            try {
                const assessment = await climate.getPropertyRiskAssessment(location);
                const wildfireRisk = assessment.riskBreakdown.wildfire_risk;
                
                console.log(`\n${location}:`);
                console.log(`  Overall Risk: ${assessment.overallRisk.score}/100 (${assessment.overallRisk.level})`);
                
                if (wildfireRisk) {
                    console.log(`  Wildfire Risk: ${wildfireRisk.score}/100 (${wildfireRisk.level})`);
                    console.log(`  Confidence: ${Math.round(wildfireRisk.confidence * 100)}%`);
                } else {
                    console.log(`  Wildfire Risk: No data available`);
                }

                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.log(`\n${location}: Error - ${error.message}`);
            }
        }

    } catch (error) {
        console.error('Risk analysis failed:', error.message);
        throw error;
    } finally {
        await climate.destroy();
    }
}

// Export example functions
module.exports = {
    basicPropertyAssessment,
    coordinateRiskAssessment,
    batchRiskAssessment,
    platformHealthCheck,
    getEnvironmentConfig,
    customRiskAnalysis
};

// Run examples if this file is executed directly
if (require.main === module) {
    async function runExamples() {
        console.log('🌊 Seawater Climate Data Integration Examples\n');

        try {
            // Check environment configuration
            const config = getEnvironmentConfig();
            if (!config.MAPBOX_ACCESS_TOKEN) {
                console.error('❌ MAPBOX_ACCESS_TOKEN environment variable is required');
                console.log('Set it with: export MAPBOX_ACCESS_TOKEN=your_token_here');
                return;
            }

            // Run basic example
            console.log('1. Running basic property assessment...');
            await basicPropertyAssessment();
            
            // Add delay between examples
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n2. Running coordinate-based assessment...');
            await coordinateRiskAssessment();
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n3. Running platform health check...');
            await platformHealthCheck();

            console.log('\n✅ All examples completed successfully!');
            console.log('\nTo run batch processing or custom analysis:');
            console.log('- Uncomment the desired example functions');
            console.log('- Ensure you have sufficient API quotas');
            
        } catch (error) {
            console.error('❌ Example failed:', error.message);
            process.exit(1);
        }
    }

    runExamples();
}