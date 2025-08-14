/**
 * Artillery Load Test Processor
 * Custom functions and data processing for load testing
 */

const fs = require('fs');
const path = require('path');

// Performance metrics collection
let metrics = {
  requests: 0,
  errors: 0,
  responseTimes: [],
  endpointMetrics: {},
  startTime: Date.now()
};

// Custom functions for Artillery scenarios
module.exports = {
  // Generate realistic test data
  generateTestAddress: function(context, events, done) {
    const addresses = [
      "123 Main St, Houston, TX 77002",
      "456 Ocean Dr, Miami Beach, FL 33139", 
      "789 Market St, San Francisco, CA 94103",
      "321 Congress Ave, Austin, TX 78701",
      "654 Peachtree St, Atlanta, GA 30308",
      "987 Pike St, Seattle, WA 98101",
      "147 State St, Boston, MA 02109",
      "258 Michigan Ave, Chicago, IL 60601",
      "369 Broadway, New York, NY 10013",
      "741 Sunset Blvd, Los Angeles, CA 90028"
    ];
    
    context.vars.test_address = addresses[Math.floor(Math.random() * addresses.length)];
    
    // Add coordinates for the address
    const coordinates = {
      "Houston, TX": { lat: 29.7604, lng: -95.3698 },
      "Miami Beach, FL": { lat: 25.7907, lng: -80.1300 },
      "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
      "Austin, TX": { lat: 30.2672, lng: -97.7431 },
      "Atlanta, GA": { lat: 33.7490, lng: -84.3880 },
      "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
      "Boston, MA": { lat: 42.3601, lng: -71.0589 },
      "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
      "New York, NY": { lat: 40.7128, lng: -74.0060 },
      "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 }
    };
    
    const city = context.vars.test_address.split(', ').slice(1).join(', ');
    const coords = coordinates[city] || { lat: 39.8283, lng: -98.5795 }; // Default to center of US
    
    context.vars.latitude = coords.lat;
    context.vars.longitude = coords.lng;
    
    return done();
  },

  // Simulate user think time based on response complexity
  calculateThinkTime: function(context, events, done) {
    const baseThinkTime = 1000; // 1 second base
    const responseSize = context.vars.$response?.body?.length || 0;
    const complexity = Math.min(responseSize / 1000, 5); // Max 5 seconds additional
    
    context.vars.think_time = baseThinkTime + (complexity * 1000);
    return done();
  },

  // Track custom metrics
  trackMetrics: function(context, events, done) {
    metrics.requests++;
    
    if (context.vars.$response) {
      const responseTime = context.vars.$response.timings?.response || 0;
      const statusCode = context.vars.$response.statusCode;
      const endpoint = context.vars.$response.url?.pathname || 'unknown';
      
      metrics.responseTimes.push(responseTime);
      
      if (statusCode >= 400) {
        metrics.errors++;
      }
      
      // Track per-endpoint metrics
      if (!metrics.endpointMetrics[endpoint]) {
        metrics.endpointMetrics[endpoint] = {
          requests: 0,
          errors: 0,
          responseTimes: [],
          totalTime: 0
        };
      }
      
      metrics.endpointMetrics[endpoint].requests++;
      metrics.endpointMetrics[endpoint].responseTimes.push(responseTime);
      metrics.endpointMetrics[endpoint].totalTime += responseTime;
      
      if (statusCode >= 400) {
        metrics.endpointMetrics[endpoint].errors++;
      }
    }
    
    return done();
  },

  // Generate realistic API key based on scenario
  selectApiKey: function(context, events, done) {
    const scenario = context.scenario?.name || 'basic';
    
    if (scenario.includes('Premium')) {
      context.vars.api_key = 'premium-tier-key-' + Math.floor(Math.random() * 3 + 1);
    } else if (scenario.includes('Professional')) {
      context.vars.api_key = 'professional-tier-key-' + Math.floor(Math.random() * 2 + 1);
    } else {
      context.vars.api_key = 'basic-tier-key-' + Math.floor(Math.random() * 5 + 1);
    }
    
    return done();
  },

  // Simulate realistic search patterns
  generateSearchPattern: function(context, events, done) {
    const patterns = [
      'single_property',
      'comparison',
      'area_analysis',
      'professional_search'
    ];
    
    context.vars.search_pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    // Set pattern-specific parameters
    switch (context.vars.search_pattern) {
      case 'comparison':
        context.vars.address_count = Math.floor(Math.random() * 3) + 2; // 2-4 addresses
        break;
      case 'area_analysis':
        context.vars.radius_km = Math.floor(Math.random() * 20) + 5; // 5-25 km
        break;
      case 'professional_search':
        const profTypes = ['agent', 'inspector', 'insurance'];
        context.vars.professional_type = profTypes[Math.floor(Math.random() * profTypes.length)];
        break;
    }
    
    return done();
  },

  // Validate response quality
  validateResponse: function(context, events, done) {
    if (!context.vars.$response) {
      return done();
    }
    
    const response = context.vars.$response;
    const body = response.body;
    
    try {
      const data = typeof body === 'string' ? JSON.parse(body) : body;
      
      // Validate response structure
      if (data.success === undefined) {
        console.warn('Response missing success field');
      }
      
      if (data.success && !data.data) {
        console.warn('Successful response missing data field');
      }
      
      // Validate risk scores are in expected ranges
      if (data.data?.Records) {
        data.data.Records.forEach(record => {
          if (record.fema) {
            Object.entries(record.fema).forEach(([key, value]) => {
              if (key.endsWith('_score') && (value < 0 || value > 100)) {
                console.warn(`Invalid score range for ${key}: ${value}`);
              }
            });
          }
        });
      }
      
      context.vars.response_valid = true;
    } catch (error) {
      console.warn('Invalid JSON response:', error.message);
      context.vars.response_valid = false;
    }
    
    return done();
  },

  // Handle rate limiting gracefully
  handleRateLimit: function(context, events, done) {
    if (context.vars.$response?.statusCode === 429) {
      const retryAfter = context.vars.$response.headers['retry-after'] || 60;
      context.vars.wait_time = Math.min(parseInt(retryAfter) * 1000, 300000); // Max 5 minutes
      
      console.log(`Rate limited, waiting ${context.vars.wait_time}ms`);
    }
    
    return done();
  },

  // Generate final performance report
  generateReport: function(context, events, done) {
    const duration = Date.now() - metrics.startTime;
    const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    const errorRate = (metrics.errors / metrics.requests) * 100;
    
    // Calculate percentiles
    const sortedTimes = metrics.responseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    const report = {
      summary: {
        duration_ms: duration,
        total_requests: metrics.requests,
        total_errors: metrics.errors,
        error_rate_percent: errorRate.toFixed(2),
        requests_per_second: (metrics.requests / (duration / 1000)).toFixed(2),
        avg_response_time_ms: avgResponseTime.toFixed(2),
        p50_ms: p50,
        p95_ms: p95,
        p99_ms: p99
      },
      endpoints: {}
    };
    
    // Generate per-endpoint reports
    Object.entries(metrics.endpointMetrics).forEach(([endpoint, data]) => {
      const endpointErrorRate = (data.errors / data.requests) * 100;
      const avgTime = data.totalTime / data.requests;
      
      report.endpoints[endpoint] = {
        requests: data.requests,
        errors: data.errors,
        error_rate_percent: endpointErrorRate.toFixed(2),
        avg_response_time_ms: avgTime.toFixed(2)
      };
    });
    
    // Write report to file
    const reportPath = path.join(__dirname, '../../test-results/performance-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n=== PERFORMANCE TEST REPORT ===');
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Total Requests: ${metrics.requests}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Requests/sec: ${(metrics.requests / (duration / 1000)).toFixed(2)}`);
    console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`P95 Response Time: ${p95}ms`);
    console.log(`P99 Response Time: ${p99}ms`);
    console.log('================================\n');
    
    return done();
  },

  // Memory leak detection
  checkMemoryUsage: function(context, events, done) {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    
    context.vars.memory_heap_used_mb = heapUsedMB;
    context.vars.memory_heap_total_mb = heapTotalMB;
    
    // Warn if memory usage is high
    if (heapUsedMB > 500) {
      console.warn(`High memory usage detected: ${heapUsedMB}MB`);
    }
    
    return done();
  }
};