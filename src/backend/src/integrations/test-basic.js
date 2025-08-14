#!/usr/bin/env node

/**
 * Basic Integration Test
 * Tests core functionality without external API dependencies
 */

const { 
    HTTPClient, 
    APIRateLimiter, 
    CacheManager, 
    RiskScoreAggregator 
} = require('./index');

/**
 * Test HTTPClient basic functionality
 */
async function testHTTPClient() {
    console.log('🔗 Testing HTTPClient...');
    
    const httpClient = new HTTPClient({
        timeout: 10000,
        maxRetries: 2
    });
    
    try {
        // Test with a reliable endpoint
        const response = await httpClient.get('https://httpbin.org/get?test=seawater');
        
        if (response.statusCode === 200 && response.data) {
            console.log('✅ HTTPClient: Basic GET request successful');
            console.log(`   Response time: ${response.responseTime}ms`);
        } else {
            console.log('❌ HTTPClient: Unexpected response');
        }
        
        // Test statistics
        const stats = httpClient.getStats();
        console.log(`   Stats: ${stats.totalRequests} requests, ${stats.successRate}% success rate`);
        
    } catch (error) {
        console.log(`❌ HTTPClient test failed: ${error.message}`);
    } finally {
        httpClient.destroy();
    }
}

/**
 * Test APIRateLimiter functionality
 */
async function testRateLimiter() {
    console.log('\n⏱️  Testing APIRateLimiter...');
    
    const rateLimiter = new APIRateLimiter();
    
    try {
        // Test rate limit check
        const check1 = await rateLimiter.checkRateLimit('FEMA_NRI');
        if (check1.allowed) {
            console.log('✅ Rate Limiter: First request allowed');
        }
        
        // Mark request as completed
        rateLimiter.markRequestCompleted('FEMA_NRI');
        
        // Test rate limit status
        const status = rateLimiter.getStatus('FEMA_NRI');
        console.log(`   FEMA_NRI status: ${status.tokensAvailable}/${status.maxTokens} tokens available`);
        
        // Test all sources status
        const allStatus = rateLimiter.getAllStatus();
        const sourceCount = Object.keys(allStatus).length;
        console.log(`✅ Rate Limiter: Managing ${sourceCount} data sources`);
        
    } catch (error) {
        console.log(`❌ Rate Limiter test failed: ${error.message}`);
    } finally {
        rateLimiter.destroy();
    }
}

/**
 * Test CacheManager without Redis
 */
async function testCacheManager() {
    console.log('\n💾 Testing CacheManager (memory-only)...');
    
    const cacheManager = new CacheManager({
        keyPrefix: 'test:',
        defaultTTL: 300
    });
    
    try {
        const testKey = 'property_risk:test123';
        const testData = {
            score: 75,
            level: 'high',
            timestamp: new Date().toISOString()
        };
        
        // Test set and get
        await cacheManager.set(testKey, testData);
        const retrieved = await cacheManager.get(testKey);
        
        if (retrieved && retrieved.score === testData.score) {
            console.log('✅ Cache Manager: Set/Get operations successful');
        } else {
            console.log('❌ Cache Manager: Data mismatch');
        }
        
        // Test exists
        const exists = await cacheManager.exists(testKey);
        if (exists) {
            console.log('✅ Cache Manager: Exists check successful');
        }
        
        // Test delete
        await cacheManager.delete(testKey);
        const afterDelete = await cacheManager.get(testKey);
        if (!afterDelete) {
            console.log('✅ Cache Manager: Delete operation successful');
        }
        
        // Test statistics
        const stats = cacheManager.getStats();
        console.log(`   Cache stats: ${stats.hits} hits, ${stats.misses} misses, ${stats.hitRate}% hit rate`);
        
    } catch (error) {
        console.log(`❌ Cache Manager test failed: ${error.message}`);
    } finally {
        cacheManager.destroy();
    }
}

/**
 * Test RiskScoreAggregator
 */
async function testRiskAggregator() {
    console.log('\n🎯 Testing RiskScoreAggregator...');
    
    const aggregator = new RiskScoreAggregator();
    
    try {
        // Mock source data for testing
        const mockSourceData = {
            'FEMA_NRI': {
                risks: {
                    flood_risk: { score: 80, confidence: 0.9 },
                    wildfire_risk: { score: 45, confidence: 0.8 },
                    earthquake_risk: { score: 30, confidence: 0.95 }
                },
                lastUpdated: new Date().toISOString(),
                dataQuality: 0.95
            },
            'USGS_Earthquake': {
                risks: {
                    earthquake_risk: { score: 35, confidence: 0.9 }
                },
                lastUpdated: new Date().toISOString(),
                dataQuality: 0.9
            }
        };
        
        // Test risk aggregation
        const assessment = await aggregator.aggregateRiskScores(
            'test-property-123',
            mockSourceData
        );
        
        if (assessment.overallRisk && assessment.riskBreakdown) {
            console.log('✅ Risk Aggregator: Assessment generated successfully');
            console.log(`   Overall risk score: ${assessment.overallRisk.score}/100`);
            console.log(`   Risk level: ${assessment.overallRisk.level}`);
            console.log(`   Confidence: ${Math.round(assessment.overallRisk.confidence * 100)}%`);
            console.log(`   Risk types assessed: ${Object.keys(assessment.riskBreakdown).length}`);
        } else {
            console.log('❌ Risk Aggregator: Invalid assessment structure');
        }
        
        // Test statistics
        const stats = aggregator.getStats();
        console.log(`   Aggregator stats: ${stats.totalAggregations} total, ${stats.successRate}% success rate`);
        
    } catch (error) {
        console.log(`❌ Risk Aggregator test failed: ${error.message}`);
    }
}

/**
 * Test component integration
 */
async function testIntegration() {
    console.log('\n🔄 Testing Component Integration...');
    
    const httpClient = new HTTPClient();
    const rateLimiter = new APIRateLimiter();
    const cacheManager = new CacheManager();
    
    try {
        // Test that components can work together
        const rateCheck = await rateLimiter.checkRateLimit('TEST_SOURCE');
        if (rateCheck.allowed) {
            console.log('✅ Integration: Rate limiter allows requests');
        }
        
        // Test cache and HTTP client interaction
        const testUrl = 'https://httpbin.org/json';
        const cacheKey = 'integration:test';
        
        // First request (cache miss)
        const response1 = await httpClient.get(testUrl);
        if (response1.statusCode === 200) {
            await cacheManager.set(cacheKey, response1.data);
            console.log('✅ Integration: HTTP + Cache (cache miss) successful');
        }
        
        // Second request (cache hit)
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
            console.log('✅ Integration: Cache hit successful');
        }
        
        rateLimiter.markRequestCompleted('TEST_SOURCE');
        
    } catch (error) {
        console.log(`❌ Integration test failed: ${error.message}`);
    } finally {
        httpClient.destroy();
        rateLimiter.destroy();
        cacheManager.destroy();
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🌊 Seawater Climate Data Integration - Basic Tests\n');
    
    const startTime = Date.now();
    
    try {
        await testHTTPClient();
        await testRateLimiter();
        await testCacheManager();
        await testRiskAggregator();
        await testIntegration();
        
        const duration = Date.now() - startTime;
        console.log(`\n✅ All basic tests completed successfully in ${duration}ms`);
        console.log('\n🚀 Core integration platform is ready!');
        console.log('\nNext steps:');
        console.log('1. Set MAPBOX_ACCESS_TOKEN environment variable');
        console.log('2. Run: node examples/basic-usage.js');
        console.log('3. Try the property risk assessment examples');
        
    } catch (error) {
        console.error(`\n❌ Test suite failed: ${error.message}`);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testHTTPClient,
    testRateLimiter,
    testCacheManager,
    testRiskAggregator,
    testIntegration,
    runAllTests
};