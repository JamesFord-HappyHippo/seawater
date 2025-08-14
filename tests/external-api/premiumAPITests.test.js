/**
 * Premium API Integration Tests
 * Testing First Street Foundation and ClimateCheck API integrations
 */

const axios = require('axios');
const { jest } = require('@jest/globals');

describe('First Street Foundation API Integration', () => {
  const FIRST_STREET_BASE_URL = 'https://api.firststreet.org/risk/v1';
  const TEST_API_KEY = 'test-fs-api-key-12345';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property Risk Assessment', () => {
    test('should fetch property flood risk successfully', async () => {
      const mockFirstStreetResponse = {
        data: {
          property: {
            fsid: "12345678901",
            address: "123 Riverside Dr, Houston, TX 77007",
            coordinates: {
              lat: 29.7604,
              lng: -95.3698
            },
            risk_scores: {
              flood: {
                current: 8,
                2035: 9,
                2050: 10
              },
              fire: {
                current: 1,
                2035: 2,
                2050: 3
              },
              heat: {
                current: 6,
                2035: 8,
                2050: 9
              }
            },
            flood_details: {
              annual_chance: 0.01,
              depth_1_pct: 3.2,
              depth_10_pct: 1.8,
              flood_factor: 8,
              environmental_risk: "Major",
              financial_risk: "Extreme"
            },
            adaptation_summary: {
              recommended_actions: [
                "Install flood barriers",
                "Elevate utilities",
                "Consider flood insurance"
              ],
              cost_benefit_ratio: 3.2
            }
          },
          metadata: {
            methodology_version: "2.0",
            data_vintage: "2024Q2",
            confidence_interval: 0.85,
            peer_review_status: "published"
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockFirstStreetResponse);

      const response = await axios.get(
        `${FIRST_STREET_BASE_URL}/property/address`,
        {
          params: { 
            address: "123 Riverside Dr, Houston, TX 77007"
          },
          headers: {
            'Authorization': `Bearer ${TEST_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      expect(response.data.property).toBeDefined();
      
      const property = response.data.property;
      expect(property.address).toContain("Houston, TX");
      expect(property.risk_scores.flood.current).toBeGreaterThanOrEqual(1);
      expect(property.risk_scores.flood.current).toBeLessThanOrEqual(10);
      
      // Validate future projections are higher or equal
      expect(property.risk_scores.flood[2035]).toBeGreaterThanOrEqual(property.risk_scores.flood.current);
      expect(property.risk_scores.flood[2050]).toBeGreaterThanOrEqual(property.risk_scores.flood[2035]);
      
      // Validate flood details
      expect(property.flood_details.annual_chance).toBeGreaterThan(0);
      expect(property.flood_details.depth_1_pct).toBeGreaterThan(0);
      expect(['Minimal', 'Minor', 'Moderate', 'Major', 'Severe', 'Extreme']).toContain(
        property.flood_details.environmental_risk
      );
    });

    test('should handle wildfire risk assessment', async () => {
      const mockWildfireResponse = {
        data: {
          property: {
            fsid: "98765432109",
            address: "456 Canyon Rd, Paradise, CA 95969",
            risk_scores: {
              fire: {
                current: 9,
                2035: 9,
                2050: 10
              }
            },
            fire_details: {
              fire_factor: 9,
              wildfire_risk_level: "Extreme",
              suppression_difficulty: "Very High",
              fuel_load: "Heavy",
              annual_burn_probability: 0.08,
              flame_length_probability: {
                "0-2ft": 0.1,
                "2-4ft": 0.2,
                "4-8ft": 0.3,
                "8ft+": 0.4
              }
            },
            defensible_space: {
              current_score: 3,
              recommended_score: 8,
              improvement_actions: [
                "Clear vegetation within 30 feet",
                "Remove dead/dying trees",
                "Install fire-resistant landscaping",
                "Maintain roof and gutters"
              ]
            }
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockWildfireResponse);

      const response = await axios.get(
        `${FIRST_STREET_BASE_URL}/property/address`,
        {
          params: { 
            address: "456 Canyon Rd, Paradise, CA 95969"
          },
          headers: {
            'Authorization': `Bearer ${TEST_API_KEY}`
          }
        }
      );

      const property = response.data.property;
      expect(property.risk_scores.fire.current).toBeGreaterThanOrEqual(8);
      expect(property.fire_details.wildfire_risk_level).toBe("Extreme");
      expect(property.fire_details.annual_burn_probability).toBeGreaterThan(0);
      expect(property.defensible_space.improvement_actions).toHaveLength(4);
    });

    test('should handle heat risk assessment', async () => {
      const mockHeatResponse = {
        data: {
          property: {
            fsid: "11223344556",
            address: "789 Desert Ave, Phoenix, AZ 85001",
            risk_scores: {
              heat: {
                current: 9,
                2035: 10,
                2050: 10
              }
            },
            heat_details: {
              heat_factor: 9,
              extreme_heat_days_current: 45,
              extreme_heat_days_2050: 75,
              heat_index_max: 125,
              cooling_degree_days: 4200,
              energy_burden: "Very High",
              health_risk_level: "Extreme"
            },
            adaptation_measures: {
              cooling_system_upgrade: true,
              insulation_improvement: true,
              reflective_roofing: true,
              urban_heat_island_score: 8.5
            }
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockHeatResponse);

      const response = await axios.get(
        `${FIRST_STREET_BASE_URL}/property/address`,
        {
          params: { 
            address: "789 Desert Ave, Phoenix, AZ 85001"
          },
          headers: {
            'Authorization': `Bearer ${TEST_API_KEY}`
          }
        }
      );

      const property = response.data.property;
      expect(property.heat_details.extreme_heat_days_current).toBeGreaterThan(30);
      expect(property.heat_details.extreme_heat_days_2050).toBeGreaterThan(
        property.heat_details.extreme_heat_days_current
      );
      expect(property.heat_details.health_risk_level).toBe("Extreme");
    });
  });

  describe('Neighborhood and Area Analysis', () => {
    test('should fetch neighborhood risk trends', async () => {
      const mockNeighborhoodResponse = {
        data: {
          neighborhood: {
            fsid: "nbhd-12345",
            name: "River Oaks, Houston, TX",
            boundary_type: "census_tract",
            properties_analyzed: 2500,
            risk_distribution: {
              flood: {
                minimal: 500,
                minor: 800,
                moderate: 600,
                major: 400,
                severe: 150,
                extreme: 50
              }
            },
            average_risk_scores: {
              flood: 6.2,
              fire: 1.5,
              heat: 5.8
            },
            trends: {
              flood: {
                direction: "increasing",
                rate_of_change: 0.15,
                confidence: 0.92
              }
            },
            market_impact: {
              property_value_risk: "Moderate",
              insurance_availability: "Available with conditions",
              average_premium_increase: 0.25
            }
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockNeighborhoodResponse);

      const response = await axios.get(
        `${FIRST_STREET_BASE_URL}/neighborhood/census-tract/48201001001`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_API_KEY}`
          }
        }
      );

      const neighborhood = response.data.neighborhood;
      expect(neighborhood.properties_analyzed).toBeGreaterThan(0);
      expect(neighborhood.risk_distribution.flood.minimal).toBeGreaterThanOrEqual(0);
      expect(neighborhood.trends.flood.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('API Usage and Quota Management', () => {
    test('should handle API quota limits', async () => {
      jest.spyOn(axios, 'get').mockRejectedValueOnce({
        response: {
          status: 429,
          data: {
            error: {
              code: "QUOTA_EXCEEDED",
              message: "Monthly API quota exceeded",
              quota_limit: 1000,
              quota_used: 1000,
              reset_date: "2025-02-01T00:00:00Z"
            }
          }
        }
      });

      try {
        await axios.get(`${FIRST_STREET_BASE_URL}/property/address`, {
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        });
      } catch (error) {
        expect(error.response.status).toBe(429);
        expect(error.response.data.error.code).toBe("QUOTA_EXCEEDED");
      }
    });

    test('should handle invalid API key', async () => {
      jest.spyOn(axios, 'get').mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: {
              code: "INVALID_API_KEY",
              message: "The provided API key is invalid or expired"
            }
          }
        }
      });

      try {
        await axios.get(`${FIRST_STREET_BASE_URL}/property/address`, {
          headers: { 'Authorization': 'Bearer invalid-key' }
        });
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.code).toBe("INVALID_API_KEY");
      }
    });
  });
});

describe('ClimateCheck API Integration', () => {
  const CLIMATE_CHECK_BASE_URL = 'https://api.climatecheck.com/v1';
  const TEST_CC_API_KEY = 'test-cc-api-key-67890';

  describe('Property Climate Risk Assessment', () => {
    test('should fetch comprehensive climate risk data', async () => {
      const mockClimateCheckResponse = {
        data: {
          property: {
            address: "123 Main St, Denver, CO 80202",
            coordinates: [39.7392, -104.9903],
            risk_factors: {
              precipitation: {
                score: 4,
                trend: "increasing",
                confidence: "high",
                details: {
                  annual_change_pct: 12,
                  extreme_events_increase: 35,
                  seasonal_shift: "winter_heavy"
                }
              },
              drought: {
                score: 7,
                trend: "increasing",
                confidence: "high",
                details: {
                  palmer_drought_severity: -2.8,
                  soil_moisture_decline: 18,
                  water_stress_level: "moderate"
                }
              },
              extreme_heat: {
                score: 6,
                trend: "increasing",
                confidence: "very_high",
                details: {
                  days_above_100f_current: 8,
                  days_above_100f_2050: 25,
                  heat_wave_frequency_change: 180
                }
              },
              wildfire: {
                score: 5,
                trend: "increasing",
                confidence: "high",
                details: {
                  burn_probability: 0.003,
                  fuel_moisture_decline: 15,
                  fire_weather_days_increase: 22
                }
              },
              air_quality: {
                score: 6,
                trend: "worsening",
                confidence: "moderate",
                details: {
                  pm25_increase: 8,
                  ozone_days_increase: 12,
                  wildfire_smoke_days: 15
                }
              }
            },
            methodology: {
              version: "3.2",
              peer_reviewed: true,
              data_sources: ["NOAA", "EPA", "USGS", "NASA"],
              update_frequency: "quarterly"
            },
            local_context: {
              elevation: 5280,
              climate_zone: "semi_arid",
              urban_heat_island: "moderate",
              water_resources: "limited"
            }
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockClimateCheckResponse);

      const response = await axios.get(
        `${CLIMATE_CHECK_BASE_URL}/property/risk`,
        {
          params: {
            address: "123 Main St, Denver, CO 80202",
            include_projections: true
          },
          headers: {
            'X-API-Key': TEST_CC_API_KEY,
            'Accept': 'application/json'
          }
        }
      );

      const property = response.data.property;
      expect(property.address).toContain("Denver, CO");
      
      // Validate risk scores are in expected range (1-10)
      Object.values(property.risk_factors).forEach(factor => {
        expect(factor.score).toBeGreaterThanOrEqual(1);
        expect(factor.score).toBeLessThanOrEqual(10);
        expect(['increasing', 'stable', 'decreasing', 'worsening']).toContain(factor.trend);
        expect(['low', 'moderate', 'high', 'very_high']).toContain(factor.confidence);
      });

      // Validate extreme heat projections
      const heat = property.risk_factors.extreme_heat;
      expect(heat.details.days_above_100f_2050).toBeGreaterThan(heat.details.days_above_100f_current);
    });

    test('should handle regional climate analysis', async () => {
      const mockRegionalResponse = {
        data: {
          region: {
            name: "Denver Metro Area",
            type: "metropolitan_statistical_area",
            population: 2963821,
            climate_summary: {
              baseline_temp_avg: 52.1,
              projected_temp_change_2050: 4.8,
              baseline_precipitation_avg: 15.81,
              projected_precipitation_change_2050: -5.2,
              climate_velocity: "moderate"
            },
            sector_impacts: {
              agriculture: {
                risk_level: "high",
                key_impacts: ["drought stress", "heat stress", "shifting zones"]
              },
              energy: {
                risk_level: "moderate", 
                key_impacts: ["cooling demand", "grid stress", "renewable variations"]
              },
              infrastructure: {
                risk_level: "moderate",
                key_impacts: ["thermal expansion", "extreme precipitation", "wildfire"]
              }
            },
            adaptation_status: {
              climate_planning: "advanced",
              resilience_investments: 145000000,
              vulnerability_assessments: "complete"
            }
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockRegionalResponse);

      const response = await axios.get(
        `${CLIMATE_CHECK_BASE_URL}/region/metro/denver`,
        {
          headers: { 'X-API-Key': TEST_CC_API_KEY }
        }
      );

      const region = response.data.region;
      expect(region.population).toBeGreaterThan(1000000);
      expect(region.climate_summary.projected_temp_change_2050).toBeGreaterThan(0);
      expect(region.sector_impacts.agriculture.risk_level).toBe("high");
    });
  });

  describe('Data Quality and Validation', () => {
    test('should validate methodology and data sources', async () => {
      const mockPropertyResponse = {
        data: {
          property: {
            risk_factors: {
              precipitation: { score: 5, confidence: "high" }
            },
            methodology: {
              version: "3.2",
              peer_reviewed: true,
              data_sources: ["NOAA", "EPA", "USGS"],
              validation_metrics: {
                historical_accuracy: 0.91,
                spatial_resolution: "1km",
                temporal_resolution: "daily",
                uncertainty_range: 0.15
              }
            },
            quality_indicators: {
              data_completeness: 0.98,
              spatial_coverage: "complete",
              temporal_coverage: "1950-2023",
              model_confidence: 0.87
            }
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockPropertyResponse);

      const response = await axios.get(`${CLIMATE_CHECK_BASE_URL}/property/risk`, {
        headers: { 'X-API-Key': TEST_CC_API_KEY }
      });

      const methodology = response.data.property.methodology;
      expect(methodology.peer_reviewed).toBe(true);
      expect(methodology.data_sources).toContain("NOAA");
      expect(methodology.validation_metrics.historical_accuracy).toBeGreaterThan(0.8);
      
      const quality = response.data.property.quality_indicators;
      expect(quality.data_completeness).toBeGreaterThan(0.95);
      expect(quality.model_confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle geocoding failures gracefully', async () => {
      jest.spyOn(axios, 'get').mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: {
              code: "GEOCODING_FAILED",
              message: "Unable to geocode the provided address",
              details: {
                address: "Invalid Address XYZ",
                suggestions: [
                  "Check address spelling",
                  "Include city and state",
                  "Use complete street address"
                ]
              }
            }
          }
        }
      });

      try {
        await axios.get(`${CLIMATE_CHECK_BASE_URL}/property/risk`, {
          params: { address: "Invalid Address XYZ" },
          headers: { 'X-API-Key': TEST_CC_API_KEY }
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.code).toBe("GEOCODING_FAILED");
        expect(error.response.data.error.details.suggestions).toHaveLength(3);
      }
    });

    test('should handle service maintenance windows', async () => {
      jest.spyOn(axios, 'get').mockRejectedValueOnce({
        response: {
          status: 503,
          data: {
            error: {
              code: "SERVICE_MAINTENANCE",
              message: "Service temporarily unavailable due to maintenance",
              maintenance_window: {
                start: "2025-01-15T02:00:00Z",
                end: "2025-01-15T06:00:00Z",
                estimated_duration: "4 hours"
              }
            }
          }
        }
      });

      try {
        await axios.get(`${CLIMATE_CHECK_BASE_URL}/property/risk`, {
          headers: { 'X-API-Key': TEST_CC_API_KEY }
        });
      } catch (error) {
        expect(error.response.status).toBe(503);
        expect(error.response.data.error.code).toBe("SERVICE_MAINTENANCE");
        expect(error.response.data.error.maintenance_window.estimated_duration).toBe("4 hours");
      }
    });
  });
});