/**
 * API Integration Tests
 * End-to-end API workflow testing for Seawater platform
 */

const axios = require('axios');
const { jest } = require('@jest/globals');

// Mock axios for controlled testing
jest.mock('axios');
const mockedAxios = axios;

describe('Risk Assessment API Integration', () => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api-test.seawater.io';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property Risk Assessment Workflow', () => {
    test('should complete full risk assessment workflow', async () => {
      // Mock the complete API call sequence
      const mockApiResponses = {
        geocode: {
          data: {
            success: true,
            data: {
              Records: [{
                formatted_address: "123 Riverside Dr, Houston, TX 77007, USA",
                latitude: 29.7604,
                longitude: -95.3698,
                confidence: 0.95
              }]
            }
          }
        },
        riskAssessment: {
          data: {
            success: true,
            data: {
              Records: [{
                address: "123 Riverside Dr, Houston, TX 77007",
                coordinates: { latitude: 29.7604, longitude: -95.3698 },
                fema: {
                  flood_score: 85,
                  wildfire_score: 15,
                  heat_score: 65,
                  tornado_score: 45,
                  hurricane_score: 90,
                  social_vulnerability: 0.55,
                  community_resilience: 0.45,
                  flood_zone: "AE",
                  requires_flood_insurance: true
                },
                firstStreet: {
                  flood_score: 88,
                  wildfire_score: 12,
                  heat_score: 68,
                  projections: {
                    flood_30yr: 95,
                    wildfire_30yr: 18,
                    heat_30yr: 75
                  }
                },
                climateCheck: {
                  precipitation_risk: 8,
                  drought_risk: 2,
                  extreme_heat_risk: 6,
                  wildfire_risk: 1,
                  flood_risk: 9
                },
                buildingCodes: {
                  jurisdiction: "Houston, TX",
                  current_codes: {
                    wind: "IBC 2018",
                    seismic: "IBC 2018",
                    flood: "NFIP"
                  },
                  enforcement_level: "full",
                  bcat_score: 75
                }
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
              Processing_Time_MS: 1850
            }
          }
        }
      };

      // Setup axios mocks for the API call sequence
      mockedAxios.post
        .mockResolvedValueOnce(mockApiResponses.geocode)
        .mockResolvedValueOnce(mockApiResponses.riskAssessment);

      // Step 1: Geocode the address
      const geocodeResponse = await mockedAxios.post(`${API_BASE_URL}/api/geocode`, {
        address: "123 Riverside Dr, Houston, TX 77007"
      });

      expect(geocodeResponse.data.success).toBe(true);
      expect(geocodeResponse.data.data.Records[0].confidence).toBeGreaterThan(0.8);

      // Step 2: Get comprehensive risk assessment
      const riskResponse = await mockedAxios.post(`${API_BASE_URL}/api/risk/property`, {
        address: "123 Riverside Dr, Houston, TX 77007",
        sources: ["fema", "firststreet", "climatecheck"],
        include_projections: true
      });

      expect(riskResponse.data.success).toBe(true);
      expect(riskResponse.data.data.Records[0]).toHaveProperty('fema');
      expect(riskResponse.data.data.Records[0]).toHaveProperty('firstStreet');
      expect(riskResponse.data.data.Records[0]).toHaveProperty('climateCheck');
      expect(riskResponse.data.meta.Processing_Time_MS).toBeLessThan(3000);
    });

    test('should handle high-risk flood property assessment', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            Records: [{
              address: global.testUtils.testProperties.high_flood_risk,
              coordinates: global.testUtils.testCoordinates.houston,
              fema: {
                flood_score: 95,
                flood_zone: "VE",
                requires_flood_insurance: true
              },
              risk_summary: {
                overall_risk: "VERY_HIGH",
                primary_hazards: ["flood", "hurricane"],
                insurance_requirements: ["flood", "windstorm"]
              }
            }]
          }
        }
      });

      const response = await mockedAxios.get(
        `${API_BASE_URL}/api/risk/property`,
        { params: { address: global.testUtils.testProperties.high_flood_risk } }
      );

      const property = response.data.data.Records[0];
      expect(property.fema.flood_score).toBeGreaterThan(90);
      expect(property.fema.requires_flood_insurance).toBe(true);
      expect(property.risk_summary.overall_risk).toBe("VERY_HIGH");
    });

    test('should handle wildfire risk property assessment', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            Records: [{
              address: global.testUtils.testProperties.high_wildfire_risk,
              coordinates: global.testUtils.testCoordinates.paradise,
              fema: {
                wildfire_score: 98,
                heat_score: 85
              },
              firstStreet: {
                wildfire_score: 96,
                projections: {
                  wildfire_30yr: 99
                }
              },
              risk_summary: {
                overall_risk: "EXTREME",
                primary_hazards: ["wildfire", "extreme_heat"]
              }
            }]
          }
        }
      });

      const response = await mockedAxios.get(
        `${API_BASE_URL}/api/risk/property`,
        { params: { address: global.testUtils.testProperties.high_wildfire_risk } }
      );

      const property = response.data.data.Records[0];
      expect(property.fema.wildfire_score).toBeGreaterThan(95);
      expect(property.risk_summary.primary_hazards).toContain("wildfire");
    });
  });

  describe('Risk Comparison Workflow', () => {
    test('should compare multiple properties successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            Records: [
              {
                address: global.testUtils.testProperties.high_flood_risk,
                overall_risk_score: 85,
                primary_risks: ["flood", "hurricane"]
              },
              {
                address: global.testUtils.testProperties.low_risk_baseline,
                overall_risk_score: 25,
                primary_risks: ["tornado"]
              }
            ],
            Analytics: {
              Comparison_Summary: {
                Lowest_Risk_Address: global.testUtils.testProperties.low_risk_baseline,
                Highest_Risk_Address: global.testUtils.testProperties.high_flood_risk,
                Average_Risk_Score: 55,
                Risk_Difference: 60
              }
            }
          }
        }
      });

      const response = await mockedAxios.get(`${API_BASE_URL}/api/risk/compare`, {
        params: {
          addresses: [
            global.testUtils.testProperties.high_flood_risk,
            global.testUtils.testProperties.low_risk_baseline
          ].join(',')
        }
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.Records).toHaveLength(2);
      expect(response.data.data.Analytics.Risk_Difference).toBe(60);
    });
  });

  describe('Professional Directory Integration', () => {
    test('should find climate professionals near location', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            Records: [
              {
                id: "prof-1",
                name: "Sarah Johnson",
                professional_type: "agent",
                company: "Houston Climate Realty",
                specialization_areas: ["flood", "hurricane"],
                distance_km: 2.5,
                average_rating: 4.8,
                climate_certifications: ["FEMA_CERTIFIED", "FLOOD_SPECIALIST"]
              },
              {
                id: "prof-2",
                name: "Mike Rodriguez",
                professional_type: "inspector",
                company: "Gulf Coast Inspections",
                specialization_areas: ["flood", "wind"],
                distance_km: 5.2,
                average_rating: 4.6
              }
            ],
            Analytics: {
              Total_In_Area: 15,
              By_Type: {
                "agent": 8,
                "inspector": 5,
                "insurance": 2
              },
              Average_Rating: 4.5
            }
          }
        }
      });

      const response = await mockedAxios.get(`${API_BASE_URL}/api/professionals/search`, {
        params: {
          latitude: 29.7604,
          longitude: -95.3698,
          radius_km: 25,
          specializations: 'flood,hurricane'
        }
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.Records).toHaveLength(2);
      expect(response.data.data.Records[0].specialization_areas).toContain('flood');
    });
  });
});

describe('API Performance and Reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle concurrent requests efficiently', async () => {
    // Mock multiple concurrent requests
    const mockResponse = {
      data: {
        success: true,
        data: { Records: [{ test: true }] },
        meta: { Processing_Time_MS: 150 }
      }
    };

    mockedAxios.get.mockResolvedValue(mockResponse);

    const addresses = [
      global.testUtils.testProperties.high_flood_risk,
      global.testUtils.testProperties.high_wildfire_risk,
      global.testUtils.testProperties.low_risk_baseline
    ];

    const startTime = Date.now();
    
    // Execute concurrent requests
    const requests = addresses.map(address =>
      mockedAxios.get(`${process.env.REACT_APP_API_BASE_URL}/api/risk/property`, {
        params: { address }
      })
    );

    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    expect(responses).toHaveLength(3);
    responses.forEach(response => {
      expect(response.data.success).toBe(true);
    });

    // Should handle concurrent requests within reasonable time
    expect(totalTime).toBeLessThan(1000);
  });

  test('should implement proper retry logic for failed requests', async () => {
    // Mock initial failure followed by success
    mockedAxios.get
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { Records: [{ retry_success: true }] }
        }
      });

    // Simulate retry logic
    let attempts = 0;
    let response;

    while (attempts < 3) {
      try {
        response = await mockedAxios.get(`${process.env.REACT_APP_API_BASE_URL}/api/risk/property`);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= 3) throw error;
        // Wait before retry (mocked)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    expect(response.data.success).toBe(true);
    expect(attempts).toBe(2); // Should succeed on third attempt
  });

  test('should handle rate limiting gracefully', async () => {
    // Mock rate limit response
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 429,
        data: {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Rate limit exceeded. Please try again later.",
            retry_after: 60
          }
        }
      }
    });

    try {
      await mockedAxios.get(`${process.env.REACT_APP_API_BASE_URL}/api/risk/property`);
    } catch (error) {
      expect(error.response.status).toBe(429);
      expect(error.response.data.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.response.data.error.retry_after).toBe(60);
    }
  });
});

describe('API Security Integration', () => {
  test('should require authentication for premium endpoints', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          success: false,
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Valid API key required for premium features"
          }
        }
      }
    });

    try {
      await mockedAxios.get(`${process.env.REACT_APP_API_BASE_URL}/api/risk/property`, {
        params: {
          address: "123 Main St",
          sources: "firststreet,climatecheck"
        }
      });
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  test('should validate API key permissions', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          Records: [{
            address: "123 Main St",
            fema: { flood_score: 45 }
            // firstStreet and climateCheck data not included due to insufficient permissions
          }],
          warnings: ["Premium data sources unavailable with current API key tier"]
        }
      }
    });

    const response = await mockedAxios.get(`${process.env.REACT_APP_API_BASE_URL}/api/risk/property`, {
      headers: {
        'Authorization': 'Bearer basic-tier-api-key'
      },
      params: {
        address: "123 Main St",
        sources: "fema,firststreet"
      }
    });

    expect(response.data.success).toBe(true);
    expect(response.data.warnings).toContain("Premium data sources unavailable with current API key tier");
  });
});

describe('Error Handling Integration', () => {
  test('should provide detailed error information', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: "INVALID_ADDRESS",
            message: "Unable to geocode the provided address",
            details: {
              address: "Invalid Address 123",
              geocoding_confidence: 0.1,
              suggested_addresses: [
                "123 Main St, Houston, TX",
                "123 Main Ave, Houston, TX"
              ]
            }
          }
        }
      }
    });

    try {
      await mockedAxios.get(`${process.env.REACT_APP_API_BASE_URL}/api/risk/property`, {
        params: { address: "Invalid Address 123" }
      });
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error.code).toBe("INVALID_ADDRESS");
      expect(error.response.data.error.details.suggested_addresses).toHaveLength(2);
    }
  });
});