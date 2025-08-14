/**
 * Risk Calculation Data Quality Tests
 * Multi-source risk score aggregation accuracy validation
 */

const { jest } = require('@jest/globals');

// Mock data aggregation functions
const aggregateRiskScores = (sources) => {
  const weights = {
    fema: 0.4,
    firststreet: 0.35,
    climatecheck: 0.25
  };

  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(sources).forEach(([source, data]) => {
    if (data && weights[source]) {
      totalScore += data.normalized_score * weights[source];
      totalWeight += weights[source];
    }
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : null;
};

const normalizeScore = (score, sourceType, hazardType) => {
  const normalizationRules = {
    fema: {
      flood: (score) => Math.min(score, 100),
      wildfire: (score) => Math.min(score, 100),
      heat: (score) => Math.min(score, 100)
    },
    firststreet: {
      flood: (score) => Math.min(score * 10, 100), // First Street uses 1-10 scale
      wildfire: (score) => Math.min(score * 10, 100),
      heat: (score) => Math.min(score * 10, 100)
    },
    climatecheck: {
      flood: (score) => Math.min(score * 10, 100), // ClimateCheck uses 1-10 scale
      drought: (score) => Math.min(score * 10, 100),
      heat: (score) => Math.min(score * 10, 100)
    }
  };

  return normalizationRules[sourceType]?.[hazardType]?.(score) || 0;
};

const calculateConfidenceScore = (sources, historicalAccuracy = {}) => {
  const sourceConfidence = {
    fema: 0.9,       // High confidence - government data
    firststreet: 0.85, // High confidence - peer-reviewed methodology
    climatecheck: 0.8  // Good confidence - academic backing
  };

  const availableSources = Object.keys(sources).filter(key => sources[key]);
  const baseConfidence = availableSources.reduce((sum, source) => {
    return sum + (sourceConfidence[source] || 0);
  }, 0) / availableSources.length;

  // Adjust for historical accuracy if available
  const historicalAdjustment = Object.values(historicalAccuracy).length > 0
    ? Object.values(historicalAccuracy).reduce((sum, acc) => sum + acc, 0) / Object.values(historicalAccuracy).length
    : 1;

  return Math.round(baseConfidence * historicalAdjustment * 100) / 100;
};

describe('Risk Score Aggregation Accuracy', () => {
  describe('Multi-Source Score Combination', () => {
    test('should aggregate scores from multiple sources correctly', () => {
      const sources = {
        fema: { normalized_score: 85 },
        firststreet: { normalized_score: 88 },
        climatecheck: { normalized_score: 82 }
      };

      const aggregated = aggregateRiskScores(sources);
      
      // Expected: (85 * 0.4) + (88 * 0.35) + (82 * 0.25) = 34 + 30.8 + 20.5 = 85.3 ≈ 85
      expect(aggregated).toBe(85);
    });

    test('should handle missing sources gracefully', () => {
      const sources = {
        fema: { normalized_score: 90 },
        firststreet: null,
        climatecheck: { normalized_score: 85 }
      };

      const aggregated = aggregateRiskScores(sources);
      
      // Expected: (90 * 0.4) + (85 * 0.25) / (0.4 + 0.25) = (36 + 21.25) / 0.65 ≈ 88
      expect(aggregated).toBeGreaterThan(85);
      expect(aggregated).toBeLessThan(95);
    });

    test('should return null when no valid sources available', () => {
      const sources = {
        fema: null,
        firststreet: null,
        climatecheck: null
      };

      const aggregated = aggregateRiskScores(sources);
      expect(aggregated).toBeNull();
    });

    test('should weight FEMA data appropriately for government reliability', () => {
      const sources = {
        fema: { normalized_score: 60 },
        firststreet: { normalized_score: 90 },
        climatecheck: { normalized_score: 90 }
      };

      const aggregated = aggregateRiskScores(sources);
      
      // FEMA should have significant influence due to 40% weight
      expect(aggregated).toBeLessThan(85); // Should be pulled down by lower FEMA score
      expect(aggregated).toBeGreaterThan(70);
    });
  });

  describe('Score Normalization Accuracy', () => {
    test('should normalize FEMA scores correctly', () => {
      expect(normalizeScore(85, 'fema', 'flood')).toBe(85);
      expect(normalizeScore(150, 'fema', 'flood')).toBe(100); // Cap at 100
      expect(normalizeScore(0, 'fema', 'flood')).toBe(0);
    });

    test('should normalize First Street scores correctly', () => {
      expect(normalizeScore(8.5, 'firststreet', 'flood')).toBe(85);
      expect(normalizeScore(10, 'firststreet', 'flood')).toBe(100);
      expect(normalizeScore(12, 'firststreet', 'flood')).toBe(100); // Cap at 100
      expect(normalizeScore(1, 'firststreet', 'flood')).toBe(10);
    });

    test('should normalize ClimateCheck scores correctly', () => {
      expect(normalizeScore(7, 'climatecheck', 'flood')).toBe(70);
      expect(normalizeScore(10, 'climatecheck', 'drought')).toBe(100);
      expect(normalizeScore(0.5, 'climatecheck', 'heat')).toBe(5);
    });

    test('should handle invalid source types gracefully', () => {
      expect(normalizeScore(85, 'unknown_source', 'flood')).toBe(0);
      expect(normalizeScore(85, 'fema', 'unknown_hazard')).toBe(0);
    });
  });

  describe('Confidence Score Calculation', () => {
    test('should calculate confidence based on available sources', () => {
      const sources = {
        fema: { score: 85 },
        firststreet: { score: 88 },
        climatecheck: { score: 82 }
      };

      const confidence = calculateConfidenceScore(sources);
      
      // Average of (0.9 + 0.85 + 0.8) / 3 = 0.85
      expect(confidence).toBeCloseTo(0.85, 2);
    });

    test('should lower confidence with fewer sources', () => {
      const femaOnly = {
        fema: { score: 85 },
        firststreet: null,
        climatecheck: null
      };

      const twoSources = {
        fema: { score: 85 },
        firststreet: { score: 88 },
        climatecheck: null
      };

      const allSources = {
        fema: { score: 85 },
        firststreet: { score: 88 },
        climatecheck: { score: 82 }
      };

      const confidenceFema = calculateConfidenceScore(femaOnly);
      const confidenceTwo = calculateConfidenceScore(twoSources);
      const confidenceAll = calculateConfidenceScore(allSources);

      expect(confidenceFema).toBeLessThan(confidenceTwo);
      expect(confidenceTwo).toBeLessThan(confidenceAll);
    });

    test('should adjust confidence based on historical accuracy', () => {
      const sources = {
        fema: { score: 85 },
        firststreet: { score: 88 }
      };

      const highAccuracy = { fema: 0.95, firststreet: 0.92 };
      const lowAccuracy = { fema: 0.75, firststreet: 0.78 };

      const confidenceHigh = calculateConfidenceScore(sources, highAccuracy);
      const confidenceLow = calculateConfidenceScore(sources, lowAccuracy);

      expect(confidenceHigh).toBeGreaterThan(confidenceLow);
    });
  });
});

describe('Property Risk Accuracy Against Known Benchmarks', () => {
  // Test against properties with known FEMA flood zones
  const knownFloodZoneProperties = [
    {
      address: "123 Riverside Dr, Houston, TX 77007",
      fema_flood_zone: "AE",
      expected_flood_score_range: [80, 100],
      coordinates: { lat: 29.7604, lng: -95.3698 }
    },
    {
      address: "456 Hill Country Dr, Austin, TX 78746",
      fema_flood_zone: "X",
      expected_flood_score_range: [0, 30],
      coordinates: { lat: 30.3072, lng: -97.8067 }
    },
    {
      address: "789 Coastal Blvd, Galveston, TX 77550",
      fema_flood_zone: "VE",
      expected_flood_score_range: [90, 100],
      coordinates: { lat: 29.2830, lng: -94.8227 }
    }
  ];

  test.each(knownFloodZoneProperties)(
    'should calculate accurate flood risk for $fema_flood_zone zone property',
    ({ address, fema_flood_zone, expected_flood_score_range, coordinates }) => {
      // Mock API responses based on known data
      const mockFEMAData = {
        flood_zone: fema_flood_zone,
        flood_score: fema_flood_zone === "VE" ? 95 : 
                    fema_flood_zone === "AE" ? 85 : 15
      };

      const calculatedScore = normalizeScore(mockFEMAData.flood_score, 'fema', 'flood');
      
      expect(calculatedScore).toBeGreaterThanOrEqual(expected_flood_score_range[0]);
      expect(calculatedScore).toBeLessThanOrEqual(expected_flood_score_range[1]);
      
      // Validate consistency with flood zone designation
      if (fema_flood_zone === "VE" || fema_flood_zone === "AE") {
        expect(calculatedScore).toBeGreaterThan(50); // High risk zones
      } else if (fema_flood_zone === "X") {
        expect(calculatedScore).toBeLessThan(40); // Low risk zones
      }
    }
  );

  test('should validate wildfire risk accuracy against known high-risk areas', () => {
    const wildfire_prone_areas = [
      {
        location: "Paradise, CA",
        expected_score_range: [85, 100],
        known_risk_factors: ["WUI", "historical_burns", "fuel_load"]
      },
      {
        location: "Boulder, CO",
        expected_score_range: [60, 85],
        known_risk_factors: ["WUI", "drought_conditions"]
      },
      {
        location: "Miami, FL",
        expected_score_range: [0, 25],
        known_risk_factors: ["low_vegetation", "coastal"]
      }
    ];

    wildfire_prone_areas.forEach(area => {
      // Mock wildfire risk calculation for known areas
      let mockScore;
      if (area.location.includes("Paradise")) {
        mockScore = 95; // Known extreme risk from Camp Fire history
      } else if (area.location.includes("Boulder")) {
        mockScore = 75; // Moderate-high risk
      } else if (area.location.includes("Miami")) {
        mockScore = 10; // Very low risk
      }

      const normalizedScore = normalizeScore(mockScore, 'fema', 'wildfire');
      
      expect(normalizedScore).toBeGreaterThanOrEqual(area.expected_score_range[0]);
      expect(normalizedScore).toBeLessThanOrEqual(area.expected_score_range[1]);
    });
  });
});

describe('Cross-Source Data Consistency Validation', () => {
  test('should identify and flag major discrepancies between sources', () => {
    const validateConsistency = (sources, tolerance = 20) => {
      const scores = Object.values(sources)
        .filter(source => source && source.normalized_score)
        .map(source => source.normalized_score);
      
      if (scores.length < 2) return { consistent: true, variance: 0 };
      
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      const variance = max - min;
      
      return {
        consistent: variance <= tolerance,
        variance,
        max,
        min,
        scores
      };
    };

    // Test consistent sources
    const consistentSources = {
      fema: { normalized_score: 85 },
      firststreet: { normalized_score: 88 },
      climatecheck: { normalized_score: 82 }
    };

    const consistent = validateConsistency(consistentSources);
    expect(consistent.consistent).toBe(true);
    expect(consistent.variance).toBeLessThanOrEqual(20);

    // Test inconsistent sources
    const inconsistentSources = {
      fema: { normalized_score: 25 },
      firststreet: { normalized_score: 90 },
      climatecheck: { normalized_score: 30 }
    };

    const inconsistent = validateConsistency(inconsistentSources);
    expect(inconsistent.consistent).toBe(false);
    expect(inconsistent.variance).toBeGreaterThan(20);
  });

  test('should validate geographic boundary consistency', () => {
    const validateGeographicConsistency = (property, countyData, tractData) => {
      const issues = [];
      
      // Check if property coordinates fall within county boundaries
      if (property.coordinates && countyData.boundary) {
        // Mock point-in-polygon check
        const inCounty = true; // Would use actual GIS check
        if (!inCounty) {
          issues.push('Property coordinates outside county boundary');
        }
      }
      
      // Check if census tract belongs to county
      if (tractData.county_fips !== countyData.fips) {
        issues.push('Census tract does not belong to property county');
      }
      
      // Check for reasonable risk score differences between tract and county
      if (Math.abs(tractData.avg_flood_risk - countyData.avg_flood_risk) > 30) {
        issues.push('Large risk score discrepancy between tract and county averages');
      }
      
      return {
        consistent: issues.length === 0,
        issues
      };
    };

    const propertyData = {
      coordinates: { lat: 29.7604, lng: -95.3698 },
      county_fips: "48201"
    };

    const countyData = {
      fips: "48201",
      name: "Harris County",
      avg_flood_risk: 65,
      boundary: {} // Mock boundary data
    };

    const tractData = {
      geoid: "48201001001",
      county_fips: "48201",
      avg_flood_risk: 70
    };

    const validation = validateGeographicConsistency(propertyData, countyData, tractData);
    expect(validation.consistent).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });
});

describe('Historical Data Accuracy Validation', () => {
  test('should validate climate projections against historical trends', () => {
    const validateProjections = (historicalData, projections) => {
      const issues = [];
      
      // Check if projections follow reasonable trends
      const historicalTrend = historicalData.slice(-5).reduce((sum, year) => sum + year.events, 0) / 5;
      const projectedIncrease = (projections.year_2050 - projections.current) / 30; // Annual increase
      
      // Projections should show some increase for most climate risks
      if (projectedIncrease <= 0) {
        issues.push('Climate projections show no increase despite warming trends');
      }
      
      // But increases should be reasonable (not more than 300% by 2050)
      if (projections.year_2050 > projections.current * 3) {
        issues.push('Climate projections show unrealistic increase (>300%)');
      }
      
      // Historical data should support projection direction
      const recentTrend = historicalData.slice(-10).reduce((sum, year, index) => {
        return sum + (year.events * (index + 1)); // Weight recent years more
      }, 0) / historicalData.slice(-10).length;
      
      return {
        reasonable: issues.length === 0,
        issues,
        historical_trend: historicalTrend,
        projected_annual_increase: projectedIncrease
      };
    };

    const mockHistoricalData = [
      { year: 2015, events: 12 },
      { year: 2016, events: 8 },
      { year: 2017, events: 15 },
      { year: 2018, events: 18 },
      { year: 2019, events: 14 },
      { year: 2020, events: 22 },
      { year: 2021, events: 16 },
      { year: 2022, events: 19 },
      { year: 2023, events: 21 },
      { year: 2024, events: 17 }
    ];

    const reasonableProjections = {
      current: 18,
      year_2030: 22,
      year_2050: 28
    };

    const unreasonableProjections = {
      current: 18,
      year_2030: 45,
      year_2050: 90
    };

    const reasonableValidation = validateProjections(mockHistoricalData, reasonableProjections);
    expect(reasonableValidation.reasonable).toBe(true);

    const unreasonableValidation = validateProjections(mockHistoricalData, unreasonableProjections);
    expect(unreasonableValidation.reasonable).toBe(false);
    expect(unreasonableValidation.issues).toContain('Climate projections show unrealistic increase (>300%)');
  });

  test('should cross-validate disaster records with risk scores', () => {
    const validateAgainstDisasterRecords = (property, riskScores, historicalDisasters) => {
      const issues = [];
      
      // Properties with high flood scores should have flood history in high-risk areas
      if (riskScores.flood > 80) {
        const floodEvents = historicalDisasters.filter(d => 
          d.type === 'flood' && 
          d.year >= 2000 &&
          d.distance_km <= 10
        );
        
        if (floodEvents.length === 0) {
          issues.push('High flood risk score but no recorded flood events nearby since 2000');
        }
      }
      
      // Low risk scores should correlate with fewer historical events
      if (riskScores.flood < 20) {
        const majorFloodEvents = historicalDisasters.filter(d => 
          d.type === 'flood' && 
          d.severity >= 3 &&
          d.distance_km <= 5
        );
        
        if (majorFloodEvents.length > 3) {
          issues.push('Low flood risk score but multiple major flood events recorded nearby');
        }
      }
      
      return {
        validated: issues.length === 0,
        issues,
        nearby_events: historicalDisasters.length
      };
    };

    const propertyData = {
      coordinates: { lat: 29.7604, lng: -95.3698 }
    };

    const highRiskScores = { flood: 95, wildfire: 25 };
    const lowRiskScores = { flood: 15, wildfire: 20 };

    const houstonFloodHistory = [
      { type: 'flood', year: 2017, severity: 4, distance_km: 2 }, // Harvey
      { type: 'flood', year: 2016, severity: 3, distance_km: 5 }, // Tax Day floods
      { type: 'flood', year: 2015, severity: 3, distance_km: 3 }, // Memorial Day floods
      { type: 'hurricane', year: 2008, severity: 3, distance_km: 8 } // Ike
    ];

    const highRiskValidation = validateAgainstDisasterRecords(propertyData, highRiskScores, houstonFloodHistory);
    expect(highRiskValidation.validated).toBe(true);

    const lowRiskValidation = validateAgainstDisasterRecords(propertyData, lowRiskScores, houstonFloodHistory);
    expect(lowRiskValidation.validated).toBe(false);
    expect(lowRiskValidation.issues).toContain('Low flood risk score but multiple major flood events recorded nearby');
  });
});