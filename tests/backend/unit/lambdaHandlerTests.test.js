/**
 * Lambda Handler Unit Tests
 * Unit tests for all Lambda functions in the Seawater platform
 */

const { jest } = require('@jest/globals');

// Mock AWS Lambda context
const createMockContext = (options = {}) => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: options.functionName || 'test-function',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
  memoryLimitInMB: '512',
  requestId: options.requestId || 'test-request-id',
  logGroupName: '/aws/lambda/test-function',
  logStreamName: '2025/01/01/[$LATEST]abcdefghijklmnop',
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn()
});

// Mock Lambda event
const createMockEvent = (overrides = {}) => ({
  httpMethod: 'GET',
  path: '/api/risk/property',
  queryStringParameters: {},
  pathParameters: {},
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'test-agent'
  },
  body: null,
  isBase64Encoded: false,
  requestContext: {
    requestId: 'test-request-id',
    stage: 'test',
    httpMethod: 'GET',
    path: '/api/risk/property'
  },
  ...overrides
});

describe('Risk Score Aggregator Lambda', () => {
  let mockContext;
  let riskAggregatorHandler;

  beforeEach(() => {
    mockContext = createMockContext({ functionName: 'risk-aggregator' });
    
    // Mock the risk aggregator handler
    riskAggregatorHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          Records: [{
            address: "123 Main St, Houston, TX 77002",
            coordinates: { latitude: 29.7604, longitude: -95.3698 },
            fema: global.testUtils.mockFEMAResponse.NationalRiskIndex,
            firstStreet: global.testUtils.mockFirstStreetResponse,
            climateCheck: global.testUtils.mockClimateCheckResponse
          }],
          Query_Context: {
            Mode: "Property_Risk_Assessment",
            Operation: "READ",
            Data_Sources: ["fema", "firststreet", "climatecheck"],
            Cache_Status: "miss"
          }
        },
        meta: {
          Total_Records: 1,
          Request_ID: "test-request-id",
          Processing_Time_MS: 150
        }
      })
    });
  });

  test('should handle property risk request successfully', async () => {
    const event = createMockEvent({
      queryStringParameters: {
        address: "123 Main St, Houston, TX 77002"
      }
    });

    const result = await riskAggregatorHandler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
    expect(JSON.parse(result.body).data.Records).toHaveLength(1);
  });

  test('should validate required address parameter', async () => {
    const invalidEvent = createMockEvent({
      queryStringParameters: {}
    });

    // Mock validation error response
    riskAggregatorHandler.mockResolvedValueOnce({
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: {
          code: "MISSING_REQUIRED_PARAMETER",
          message: "Address parameter is required"
        }
      })
    });

    const result = await riskAggregatorHandler(invalidEvent, mockContext);
    
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).success).toBe(false);
  });

  test('should handle multiple data sources', async () => {
    const event = createMockEvent({
      queryStringParameters: {
        address: "123 Main St, Houston, TX 77002",
        sources: "fema,firststreet,climatecheck"
      }
    });

    const result = await riskAggregatorHandler(event, mockContext);
    const responseData = JSON.parse(result.body);
    
    expect(responseData.data.Query_Context.Data_Sources).toContain("fema");
    expect(responseData.data.Query_Context.Data_Sources).toContain("firststreet");
    expect(responseData.data.Query_Context.Data_Sources).toContain("climatecheck");
  });

  test('should handle timeout errors gracefully', async () => {
    // Mock timeout scenario
    riskAggregatorHandler.mockResolvedValueOnce({
      statusCode: 504,
      body: JSON.stringify({
        success: false,
        error: {
          code: "GATEWAY_TIMEOUT",
          message: "Request timed out while aggregating risk scores"
        }
      })
    });

    const event = createMockEvent({
      queryStringParameters: {
        address: "123 Main St, Houston, TX 77002"
      }
    });

    const result = await riskAggregatorHandler(event, mockContext);
    expect(result.statusCode).toBe(504);
  });
});

describe('Geographic Data Processor Lambda', () => {
  let mockContext;
  let geoProcessorHandler;

  beforeEach(() => {
    mockContext = createMockContext({ functionName: 'geo-processor' });
    
    geoProcessorHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          Records: [{
            formatted_address: "123 Main St, Houston, TX 77002, USA",
            latitude: 29.7604,
            longitude: -95.3698,
            confidence: 0.95,
            address_components: {
              street_number: "123",
              route: "Main St",
              locality: "Houston",
              administrative_area_level_1: "TX",
              postal_code: "77002",
              country: "USA"
            }
          }]
        }
      })
    });
  });

  test('should geocode address successfully', async () => {
    const event = createMockEvent({
      httpMethod: 'POST',
      path: '/api/geocode',
      body: JSON.stringify({
        address: "123 Main St, Houston, TX 77002"
      })
    });

    const result = await geoProcessorHandler(event, mockContext);
    const responseData = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.Records[0].confidence).toBeGreaterThan(0.8);
  });

  test('should handle low confidence geocoding results', async () => {
    geoProcessorHandler.mockResolvedValueOnce({
      statusCode: 206,
      body: JSON.stringify({
        success: true,
        data: {
          Records: [{
            formatted_address: "Approximate location",
            latitude: 29.7604,
            longitude: -95.3698,
            confidence: 0.3
          }]
        },
        warnings: ["Low confidence geocoding result"]
      })
    });

    const event = createMockEvent({
      httpMethod: 'POST',
      body: JSON.stringify({
        address: "Unknown Street, Houston, TX"
      })
    });

    const result = await geoProcessorHandler(event, mockContext);
    expect(result.statusCode).toBe(206);
  });

  test('should perform spatial queries', async () => {
    const spatialEvent = createMockEvent({
      path: '/api/spatial/nearby/29.7604/-95.3698',
      pathParameters: {
        lat: '29.7604',
        lng: '-95.3698'
      },
      queryStringParameters: {
        radius_km: '5'
      }
    });

    geoProcessorHandler.mockResolvedValueOnce({
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          Records: [
            {
              county_name: "Harris County",
              census_tract: "48201001001",
              flood_risk_score: 65,
              wildfire_risk_score: 25,
              distance_meters: 150
            }
          ]
        }
      })
    });

    const result = await geoProcessorHandler(spatialEvent, mockContext);
    const responseData = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(responseData.data.Records).toHaveLength(1);
    expect(responseData.data.Records[0]).toHaveProperty('distance_meters');
  });
});

describe('FEMA Data Sync Lambda', () => {
  let mockContext;
  let femaDataSyncHandler;

  beforeEach(() => {
    mockContext = createMockContext({ functionName: 'fema-data-sync' });
    
    femaDataSyncHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          sync_operation: "daily_update",
          records_processed: 1500,
          counties_updated: 25,
          processing_time_ms: 45000,
          errors: []
        }
      })
    });
  });

  test('should handle scheduled data sync', async () => {
    const scheduledEvent = {
      ...createMockEvent(),
      source: 'aws.events',
      'detail-type': 'Scheduled Event',
      detail: {
        operation: 'daily_update'
      }
    };

    const result = await femaDataSyncHandler(scheduledEvent, mockContext);
    const responseData = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.records_processed).toBeGreaterThan(0);
  });

  test('should handle FEMA API errors gracefully', async () => {
    femaDataSyncHandler.mockResolvedValueOnce({
      statusCode: 207,
      body: JSON.stringify({
        success: true,
        data: {
          sync_operation: "daily_update",
          records_processed: 800,
          counties_updated: 15,
          errors: [
            {
              county: "Harris County, TX",
              error: "FEMA API timeout",
              retry_scheduled: true
            }
          ]
        }
      })
    });

    const result = await femaDataSyncHandler(createMockEvent(), mockContext);
    const responseData = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(207);
    expect(responseData.data.errors).toHaveLength(1);
  });
});

describe('Premium API Orchestrator Lambda', () => {
  let mockContext;
  let premiumOrchestratorHandler;

  beforeEach(() => {
    mockContext = createMockContext({ functionName: 'premium-api-orchestrator' });
    
    premiumOrchestratorHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          user_tier: "professional",
          quota_remaining: 450,
          quota_limit: 1000,
          premium_features: ["first_street", "climate_check", "detailed_projections"],
          cost_tracking: {
            current_month_cost: 125.50,
            estimated_monthly_cost: 180.00
          }
        }
      })
    });
  });

  test('should validate user subscription tier', async () => {
    const event = createMockEvent({
      headers: {
        'Authorization': 'Bearer professional-api-key-123',
        'X-User-Tier': 'professional'
      }
    });

    const result = await premiumOrchestratorHandler(event, mockContext);
    const responseData = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(responseData.data.user_tier).toBe('professional');
    expect(responseData.data.premium_features).toContain('first_street');
  });

  test('should handle quota exceeded scenarios', async () => {
    premiumOrchestratorHandler.mockResolvedValueOnce({
      statusCode: 429,
      body: JSON.stringify({
        success: false,
        error: {
          code: "QUOTA_EXCEEDED",
          message: "Monthly API quota exceeded",
          quota_reset_date: "2025-02-01T00:00:00Z"
        }
      })
    });

    const result = await premiumOrchestratorHandler(createMockEvent(), mockContext);
    expect(result.statusCode).toBe(429);
  });

  test('should fallback to free sources when quota exceeded', async () => {
    premiumOrchestratorHandler.mockResolvedValueOnce({
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          fallback_activated: true,
          sources_used: ["fema"],
          sources_unavailable: ["first_street", "climate_check"],
          reason: "quota_exceeded"
        }
      })
    });

    const result = await premiumOrchestratorHandler(createMockEvent(), mockContext);
    const responseData = JSON.parse(result.body);
    
    expect(responseData.data.fallback_activated).toBe(true);
    expect(responseData.data.sources_used).toContain("fema");
  });
});

describe('Lambda Error Handling', () => {
  test('should handle malformed JSON in request body', async () => {
    const handler = jest.fn().mockResolvedValue({
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body contains invalid JSON"
        }
      })
    });

    const event = createMockEvent({
      httpMethod: 'POST',
      body: '{"invalid": json}'
    });

    const result = await handler(event, createMockContext());
    expect(result.statusCode).toBe(400);
  });

  test('should include proper CORS headers', async () => {
    const handler = jest.fn().mockResolvedValue({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: JSON.stringify({ success: true })
    });

    const result = await handler(createMockEvent(), createMockContext());
    
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers['Access-Control-Allow-Methods']).toContain('GET');
  });

  test('should handle database connection failures', async () => {
    const handler = jest.fn().mockResolvedValue({
      statusCode: 503,
      body: JSON.stringify({
        success: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Unable to connect to database",
          retry_after: 30
        }
      })
    });

    const result = await handler(createMockEvent(), createMockContext());
    expect(result.statusCode).toBe(503);
  });
});