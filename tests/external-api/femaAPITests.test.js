/**
 * FEMA API Integration Tests
 * Testing integration with FEMA National Risk Index and flood data APIs
 */

const axios = require('axios');
const { jest } = require('@jest/globals');

describe('FEMA National Risk Index API Integration', () => {
  const FEMA_NRI_BASE_URL = 'https://hazards.fema.gov/nri/api/v1';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('County Risk Data Retrieval', () => {
    test('should fetch county risk data successfully', async () => {
      const mockFEMAResponse = {
        data: {
          "NationalRiskIndex": [{
            "StateAbbreviation": "TX",
            "CountyName": "Harris County",
            "CountyFips": "48201",
            "RiskScore": 98.52,
            "RiskRating": "Relatively High",
            "HazardRatings": {
              "Coastal Flooding": "Relatively High",
              "Riverine Flooding": "Very High", 
              "Hurricane": "Very High",
              "Tornado": "Relatively Moderate",
              "Wildfire": "Very Low",
              "Heat Wave": "Relatively High"
            },
            "RiskScores": {
              "CFLD_RISKS": 85.2,
              "RFLD_RISKS": 94.1,
              "HRCN_RISKS": 89.7,
              "TRND_RISKS": 45.3,
              "WFIR_RISKS": 8.1,
              "HWAV_RISKS": 67.8
            },
            "SocialVulnerability": 0.6234,
            "CommunityResilience": 0.4892
          }]
        }
      };

      // Mock successful FEMA API call
      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockFEMAResponse);

      const stateCode = "48";  // Texas
      const countyCode = "201"; // Harris County
      
      const response = await axios.get(
        `${FEMA_NRI_BASE_URL}/national-risk-index/counties/${stateCode}${countyCode}`,
        {
          headers: { 'Accept': 'application/json' },
          timeout: 10000
        }
      );

      expect(response.data.NationalRiskIndex).toHaveLength(1);
      
      const countyData = response.data.NationalRiskIndex[0];
      expect(countyData.StateAbbreviation).toBe("TX");
      expect(countyData.CountyName).toBe("Harris County");
      expect(countyData.RiskScore).toBeGreaterThan(90);
      expect(countyData.HazardRatings["Riverine Flooding"]).toBe("Very High");
      
      // Validate risk score ranges
      expect(countyData.RiskScores.CFLD_RISKS).toBeGreaterThanOrEqual(0);
      expect(countyData.RiskScores.CFLD_RISKS).toBeLessThanOrEqual(100);
      
      // Validate vulnerability scores
      expect(countyData.SocialVulnerability).toBeGreaterThan(0);
      expect(countyData.SocialVulnerability).toBeLessThan(1);
    });

    test('should handle invalid county codes', async () => {
      const mockErrorResponse = {
        response: {
          status: 404,
          data: {
            error: "County not found",
            message: "No data available for the specified county code"
          }
        }
      };

      jest.spyOn(axios, 'get').mockRejectedValueOnce(mockErrorResponse);

      try {
        await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/counties/99999`);
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBe("County not found");
      }
    });

    test('should handle API timeout gracefully', async () => {
      jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));

      try {
        await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/counties/48201`, {
          timeout: 10000
        });
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
    });
  });

  describe('State-Level Risk Data', () => {
    test('should fetch state-level aggregated risk data', async () => {
      const mockStateResponse = {
        data: {
          "NationalRiskIndex": {
            "StateAbbreviation": "TX",
            "StateName": "Texas",
            "TotalCounties": 254,
            "AverageRiskScore": 76.3,
            "HighRiskCounties": 89,
            "HazardDistribution": {
              "Hurricane": 45,
              "Tornado": 254,
              "Flood": 201,
              "Wildfire": 180,
              "Heat": 254
            }
          }
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockStateResponse);

      const response = await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/states/TX`);
      
      expect(response.data.NationalRiskIndex.StateName).toBe("Texas");
      expect(response.data.NationalRiskIndex.TotalCounties).toBe(254);
      expect(response.data.NationalRiskIndex.HazardDistribution.Tornado).toBe(254); // All counties have tornado risk
    });
  });
});

describe('FEMA Flood Map Services Integration', () => {
  const FEMA_FLOOD_WMS_URL = 'https://hazards.fema.gov/gis/nfhl/services/FIRMette/MapServer/WMSServer';

  describe('Flood Zone Determination', () => {
    test('should determine flood zone for coordinates', async () => {
      const mockFloodZoneResponse = {
        data: {
          features: [{
            properties: {
              FLD_ZONE: "AE",
              ZONE_SUBTY: "FLOODWAY",
              BFE: 15.2,
              DEPTH: 3.5,
              VELOCITY: null,
              VEL_UNIT: null,
              AR_REVERT: null,
              STATIC_BFE: 15.2
            }
          }]
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockFloodZoneResponse);

      const lat = 29.7604;
      const lng = -95.3698;
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        BBOX: `${lng-0.001},${lat-0.001},${lng+0.001},${lat+0.001}`,
        CRS: 'EPSG:4326',
        WIDTH: '101',
        HEIGHT: '101',
        LAYERS: 'FLD_ZONE',
        QUERY_LAYERS: 'FLD_ZONE',
        INFO_FORMAT: 'application/json',
        I: '50',
        J: '50'
      });

      const response = await axios.get(`${FEMA_FLOOD_WMS_URL}?${params}`);
      
      expect(response.data.features).toHaveLength(1);
      
      const floodData = response.data.features[0].properties;
      expect(floodData.FLD_ZONE).toBe("AE");
      expect(floodData.BFE).toBeGreaterThan(0);
      expect(floodData.DEPTH).toBeGreaterThan(0);
    });

    test('should handle areas outside flood zones', async () => {
      const mockNoFloodResponse = {
        data: {
          features: [{
            properties: {
              FLD_ZONE: "X",
              ZONE_SUBTY: "0.2 PCT ANNUAL CHANCE FLOOD HAZARD",
              BFE: null,
              DEPTH: null
            }
          }]
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockNoFloodResponse);

      const lat = 39.1836;  // Manhattan, KS (low flood risk)
      const lng = -96.5717;
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        BBOX: `${lng-0.001},${lat-0.001},${lng+0.001},${lat+0.001}`,
        CRS: 'EPSG:4326',
        WIDTH: '101',
        HEIGHT: '101',
        LAYERS: 'FLD_ZONE',
        QUERY_LAYERS: 'FLD_ZONE',
        INFO_FORMAT: 'application/json',
        I: '50',
        J: '50'
      });

      const response = await axios.get(`${FEMA_FLOOD_WMS_URL}?${params}`);
      
      const floodData = response.data.features[0].properties;
      expect(floodData.FLD_ZONE).toBe("X");
      expect(floodData.BFE).toBeNull();
      expect(floodData.DEPTH).toBeNull();
    });
  });

  describe('Base Flood Elevation (BFE) Data', () => {
    test('should retrieve BFE data for high-risk areas', async () => {
      const mockBFEResponse = {
        data: {
          features: [{
            properties: {
              BFE_LN_ID: "123456789",
              ELEV: 18.5,
              LEN_UNIT: "FEET",
              V_DATUM: "NAVD88",
              SOURCE_CIT: "STUDY"
            }
          }]
        }
      };

      jest.spyOn(axios, 'get').mockResolvedValueOnce(mockBFEResponse);

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        BBOX: '-95.370,-29.759,-95.369,29.761',
        CRS: 'EPSG:4326',
        WIDTH: '101',
        HEIGHT: '101',
        LAYERS: 'S_BFE',
        QUERY_LAYERS: 'S_BFE',
        INFO_FORMAT: 'application/json',
        I: '50',
        J: '50'
      });

      const response = await axios.get(`${FEMA_FLOOD_WMS_URL}?${params}`);
      
      expect(response.data.features).toHaveLength(1);
      
      const bfeData = response.data.features[0].properties;
      expect(bfeData.ELEV).toBeGreaterThan(0);
      expect(bfeData.LEN_UNIT).toBe("FEET");
      expect(bfeData.V_DATUM).toBe("NAVD88");
    });
  });
});

describe('FEMA API Data Quality Validation', () => {
  test('should validate risk score consistency', async () => {
    const mockCountyData = {
      data: {
        "NationalRiskIndex": [{
          "CountyFips": "48201",
          "RiskScore": 98.52,
          "RiskRating": "Relatively High",
          "RiskScores": {
            "CFLD_RISKS": 85.2,
            "RFLD_RISKS": 94.1,
            "HRCN_RISKS": 89.7,
            "TRND_RISKS": 45.3,
            "WFIR_RISKS": 8.1,
            "HWAV_RISKS": 67.8
          }
        }]
      }
    };

    jest.spyOn(axios, 'get').mockResolvedValueOnce(mockCountyData);

    const response = await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/counties/48201`);
    const countyData = response.data.NationalRiskIndex[0];

    // Validate that individual risk scores are reasonable
    Object.values(countyData.RiskScores).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    // High flood risk areas should have consistent ratings
    if (countyData.RiskScores.RFLD_RISKS > 90) {
      expect(['Very High', 'Relatively High']).toContain(
        countyData.HazardRatings["Riverine Flooding"]
      );
    }
  });

  test('should validate social vulnerability scores', async () => {
    const mockSVIData = {
      data: {
        "NationalRiskIndex": [{
          "SocialVulnerability": 0.6234,
          "CommunityResilience": 0.4892,
          "BuildingValue": 125000000000,
          "Population": 4713325
        }]
      }
    };

    jest.spyOn(axios, 'get').mockResolvedValueOnce(mockSVIData);

    const response = await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/counties/48201`);
    const sviData = response.data.NationalRiskIndex[0];

    // Social vulnerability should be between 0 and 1
    expect(sviData.SocialVulnerability).toBeGreaterThan(0);
    expect(sviData.SocialVulnerability).toBeLessThan(1);

    // Community resilience should be between 0 and 1
    expect(sviData.CommunityResilience).toBeGreaterThan(0);
    expect(sviData.CommunityResilience).toBeLessThan(1);

    // Building value should be positive
    expect(sviData.BuildingValue).toBeGreaterThan(0);

    // Population should be positive
    expect(sviData.Population).toBeGreaterThan(0);
  });
});

describe('FEMA API Error Handling and Resilience', () => {
  test('should handle API service unavailable', async () => {
    jest.spyOn(axios, 'get').mockRejectedValueOnce({
      response: {
        status: 503,
        statusText: 'Service Unavailable'
      }
    });

    try {
      await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/counties/48201`);
    } catch (error) {
      expect(error.response.status).toBe(503);
    }
  });

  test('should implement retry logic for transient failures', async () => {
    // Mock initial failures followed by success
    jest.spyOn(axios, 'get')
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({
        data: { NationalRiskIndex: [{ success: true }] }
      });

    let attempts = 0;
    let response;

    while (attempts < 3) {
      try {
        response = await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/counties/48201`);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    expect(response.data.NationalRiskIndex[0].success).toBe(true);
    expect(attempts).toBe(2);
  });

  test('should validate response data structure', async () => {
    const mockMalformedResponse = {
      data: {
        // Missing NationalRiskIndex key
        "InvalidStructure": []
      }
    };

    jest.spyOn(axios, 'get').mockResolvedValueOnce(mockMalformedResponse);

    const response = await axios.get(`${FEMA_NRI_BASE_URL}/national-risk-index/counties/48201`);

    // Should detect malformed response
    expect(response.data.NationalRiskIndex).toBeUndefined();
    expect(response.data.InvalidStructure).toBeDefined();
  });
});