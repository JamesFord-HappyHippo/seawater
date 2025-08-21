#!/usr/bin/env node

// Test FEMA integration with real ArcGIS REST API
const FemaDataClient = require('./src/helpers/externalClients/femaDataClient.js');

async function testFemaIntegration() {
    console.log('🌊 Testing FEMA National Risk Index Integration');
    console.log('===============================================\n');

    const femaClient = new FemaDataClient();

    // Test connection first
    console.log('1. Testing FEMA API connection...');
    try {
        const connectionTest = await femaClient.testConnection();
        if (connectionTest.success) {
            console.log('✅ FEMA API connection successful');
            console.log(`   Service: ${connectionTest.service_name || 'National Risk Index Counties'}`);
            console.log(`   Data source: ${connectionTest.data_source}\n`);
        } else {
            console.log('❌ FEMA API connection failed:', connectionTest.error);
            return;
        }
    } catch (error) {
        console.log('❌ FEMA API connection failed:', error.message);
        return;
    }

    // Test real data retrieval for known high-risk location (Houston, TX)
    console.log('2. Testing real data retrieval for Houston, TX (known flood risk area)...');
    try {
        const houstonLat = 29.7604;
        const houstonLng = -95.3698;
        
        console.log(`   Coordinates: ${houstonLat}, ${houstonLng}`);
        
        const riskData = await femaClient.getRiskByCoordinates(houstonLat, houstonLng);
        
        if (riskData.success && riskData.data) {
            console.log('✅ Real FEMA data retrieved successfully!');
            console.log(`   Data source: ${riskData.source}`);
            console.log(`   Cached: ${riskData.cached}`);
            console.log(`   Overall risk rating: ${riskData.data.overall_risk_rating}`);
            console.log(`   Overall risk score: ${riskData.data.overall_risk_score}`);
            console.log(`   Flood risk rating: ${riskData.data.flood_risk_rating}`);
            console.log(`   Flood risk score: ${riskData.data.flood_risk_score}`);
            console.log(`   County: ${riskData.data.county_name}, ${riskData.data.state_name}`);
            console.log(`   Data available: ${riskData.data.data_available}\n`);
            
            // Verify this is real data (not simulated)
            if (riskData.data.data_available && riskData.data.county_name) {
                console.log('🎉 SUCCESS: Real FEMA data integration is working!');
                console.log('   - Data is coming from FEMA ArcGIS REST services');
                console.log('   - County-level risk data is available');
                console.log('   - No more simulated data for this location');
            } else {
                console.log('⚠️  WARNING: Data may still be simulated or incomplete');
            }
        } else {
            console.log('❌ Failed to retrieve FEMA data:', riskData.data || 'Unknown error');
        }
    } catch (error) {
        console.log('❌ Error testing FEMA data retrieval:', error.message);
        console.log('   Stack trace:', error.stack);
    }

    // Test low-risk location (Denver, CO - mountainous, lower flood risk)
    console.log('\n3. Testing data retrieval for Denver, CO (lower flood risk area)...');
    try {
        const denverLat = 39.7392;
        const denverLng = -104.9903;
        
        console.log(`   Coordinates: ${denverLat}, ${denverLng}`);
        
        const riskData = await femaClient.getRiskByCoordinates(denverLat, denverLng);
        
        if (riskData.success && riskData.data) {
            console.log('✅ Denver FEMA data retrieved successfully!');
            console.log(`   Overall risk rating: ${riskData.data.overall_risk_rating}`);
            console.log(`   Flood risk rating: ${riskData.data.flood_risk_rating}`);
            console.log(`   County: ${riskData.data.county_name}, ${riskData.data.state_name}\n`);
        } else {
            console.log('❌ Failed to retrieve Denver FEMA data');
        }
    } catch (error) {
        console.log('❌ Error testing Denver data retrieval:', error.message);
    }

    console.log('===============================================');
    console.log('🌊 FEMA Integration Test Complete');
}

// Run the test
testFemaIntegration().catch(error => {
    console.error('Fatal error in FEMA integration test:', error);
    process.exit(1);
});