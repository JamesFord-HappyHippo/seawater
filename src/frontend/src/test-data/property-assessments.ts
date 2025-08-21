// Property Assessment Test Data for Seawater Climate Risk Platform
// Comprehensive property risk profiles for major US cities and international locations

import { 
  PropertyRiskData, 
  RiskAssessment, 
  Property, 
  HazardType, 
  RiskLevel,
  PropertyComparison,
  SocialVulnerabilityIndex,
  CommunityResilienceIndex,
  BuildingCodeInfo,
  InsuranceEstimate,
  Professional
} from '../types';

// Major US Cities Property Assessment Data
export const majorUSCityAssessments = {
  // High Risk Coastal Cities
  miami_florida: {
    property: {
      id: "miami_downtown_001",
      address: "1000 Biscayne Blvd, Miami, FL 33132",
      formatted_address: "1000 Biscayne Blvd, Miami, FL 33132, USA",
      coordinates: { latitude: 25.7847, longitude: -80.1878 },
      property_type: "residential" as const,
      year_built: 2019,
      square_feet: 1200,
      bedrooms: 2,
      bathrooms: 2,
      elevation_meters: 2.1
    } as Property,
    risk_assessment: {
      overall_score: 78,
      risk_level: "HIGH" as RiskLevel,
      last_updated: "2024-08-20T15:30:00Z",
      data_freshness: "current" as const,
      confidence_score: 96,
      data_completeness: 98,
      hazards: {
        hurricane: {
          score: 89,
          level: "VERY_HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 92, confidence: 98, data: { annual_frequency: 0.15, wind_speed_category: "Category 3-4" } },
            firststreet: { name: "First Street Foundation", score: 86, confidence: 94 }
          },
          description: "Very high hurricane risk with direct Atlantic exposure",
          recommendations: [
            "Install hurricane shutters or impact-resistant windows",
            "Secure loose outdoor furniture and decorations before storm season",
            "Maintain emergency supplies (water, food, flashlights, battery radio)",
            "Review and practice evacuation plan annually"
          ],
          rating: "Very High",
          expected_annual_loss: 12500,
          expected_annual_loss_rating: "Very High",
          risk_value: 89.2,
          percentile: 95
        },
        coastal_flooding: {
          score: 91,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 94, confidence: 99 },
            firststreet: { name: "First Street Foundation", score: 88, confidence: 96 }
          },
          description: "Extreme coastal flooding risk from storm surge and king tides",
          recommendations: [
            "Flood-proof lower levels of building",
            "Install backflow valves in drainage systems",
            "Consider flood insurance (required for mortgages in high-risk areas)",
            "Elevate utilities and HVAC systems above base flood elevation"
          ],
          projections_30yr: 96
        },
        heat: {
          score: 62,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 58, confidence: 91 },
            climatecheck: { name: "ClimateCheck", score: 66, confidence: 88 }
          },
          description: "High heat risk with urban heat island effects",
          recommendations: [
            "Ensure adequate air conditioning and backup power",
            "Install energy-efficient windows and insulation",
            "Use heat-reflective roofing materials"
          ]
        }
      },
      social_vulnerability: {
        index: 0.45,
        rating: "Moderate",
        percentile: 65,
        level: "Moderate",
        description: "Moderate social vulnerability with mixed income demographics",
        factors: {
          socioeconomic: 0.38,
          household_composition: 0.52,
          minority_language: 0.71,
          housing_transportation: 0.29
        },
        data_available: true
      },
      community_resilience: {
        index: 0.72,
        rating: "High",
        percentile: 78,
        level: "High",
        description: "High community resilience with good emergency services and infrastructure",
        factors: {
          social_institutions: 0.81,
          economic_resilience: 0.69,
          infrastructure: 0.75,
          community_capital: 0.82
        },
        data_available: true
      },
      building_codes: {
        jurisdiction: "Miami-Dade County",
        current_codes: {
          wind: "2020 Florida Building Code (180 mph design)",
          flood: "FEMA standards with local amendments",
          seismic: "Minimal seismic requirements",
          fire: "2021 Florida Fire Prevention Code"
        },
        bcat_score: 8.2,
        enforcement_level: "full",
        last_updated: "2023-12-01"
      }
    } as RiskAssessment,
    insurance_estimate: {
      flood_premium_annual: 2400,
      homeowners_premium_annual: 4800,
      total_premium_annual: 7200,
      coverage_recommendations: {
        flood_coverage: 350000,
        wind_coverage: 500000,
        liability_coverage: 300000
      },
      deductibles: {
        flood: 5000,
        wind: 10000,
        standard: 2500
      },
      providers: [
        { name: "State Farm", premium: 4200, rating: "A++", contact: "1-800-STATE-FARM" },
        { name: "Citizens Property Insurance", premium: 5400, rating: "A", contact: "1-888-685-1555" },
        { name: "Universal Property & Casualty", premium: 4800, rating: "A-", contact: "1-800-558-5571" }
      ]
    } as InsuranceEstimate
  },

  new_orleans_louisiana: {
    property: {
      id: "nola_french_quarter_001",
      address: "1234 Royal Street, New Orleans, LA 70116",
      formatted_address: "1234 Royal Street, New Orleans, LA 70116, USA",
      coordinates: { latitude: 29.9584, longitude: -90.0644 },
      property_type: "residential" as const,
      year_built: 1925,
      square_feet: 1800,
      bedrooms: 3,
      bathrooms: 2,
      elevation_meters: -0.3
    } as Property,
    risk_assessment: {
      overall_score: 82,
      risk_level: "VERY_HIGH" as RiskLevel,
      last_updated: "2024-08-20T16:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 94,
      data_completeness: 96,
      hazards: {
        hurricane: {
          score: 94,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 96, confidence: 98 },
            climatecheck: { name: "ClimateCheck", score: 92, confidence: 91 }
          },
          description: "Extreme hurricane risk with catastrophic storm surge potential",
          expected_annual_loss: 18500,
          rating: "Extreme"
        },
        flood: {
          score: 95,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 98, confidence: 99 },
            firststreet: { name: "First Street Foundation", score: 92, confidence: 97 }
          },
          description: "Extreme flood risk - below sea level with levee dependence",
          recommendations: [
            "Flood insurance is mandatory and critical",
            "Elevate home above base flood elevation if possible",
            "Install sump pump and backup power system",
            "Have flood evacuation plan and supplies ready"
          ]
        },
        riverine_flooding: {
          score: 88,
          level: "VERY_HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 88, confidence: 96 }
          },
          description: "Very high riverine flooding risk from Mississippi River"
        }
      },
      social_vulnerability: {
        index: 0.78,
        rating: "Very High",
        percentile: 89,
        level: "Very High",
        description: "Very high social vulnerability with significant economic and housing challenges",
        factors: {
          socioeconomic: 0.82,
          household_composition: 0.71,
          minority_language: 0.45,
          housing_transportation: 0.89
        },
        data_available: true
      }
    } as RiskAssessment
  },

  // Moderate Risk Inland Cities
  atlanta_georgia: {
    property: {
      id: "atlanta_midtown_001",
      address: "1000 Peachtree Street NE, Atlanta, GA 30309",
      formatted_address: "1000 Peachtree Street NE, Atlanta, GA 30309, USA",
      coordinates: { latitude: 33.7847, longitude: -84.3804 },
      property_type: "residential" as const,
      year_built: 2018,
      square_feet: 2200,
      bedrooms: 3,
      bathrooms: 2.5,
      elevation_meters: 320
    } as Property,
    risk_assessment: {
      overall_score: 45,
      risk_level: "MODERATE" as RiskLevel,
      last_updated: "2024-08-20T14:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 91,
      data_completeness: 93,
      hazards: {
        tornado: {
          score: 58,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 61, confidence: 89 },
            climatecheck: { name: "ClimateCheck", score: 55, confidence: 85 }
          },
          description: "Moderate tornado risk during spring storm season"
        },
        flood: {
          score: 42,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 38, confidence: 92 },
            firststreet: { name: "First Street Foundation", score: 46, confidence: 88 }
          },
          description: "Moderate flood risk from urban runoff and creek systems"
        },
        heat: {
          score: 48,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "ClimateCheck", score: 48, confidence: 86 }
          },
          description: "Moderate heat risk with urban heat island effects"
        },
        hail: {
          score: 52,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 52, confidence: 84 }
          },
          description: "Moderate hail risk during spring and early summer"
        }
      }
    } as RiskAssessment
  },

  denver_colorado: {
    property: {
      id: "denver_downtown_001",
      address: "1700 Lincoln Street, Denver, CO 80203",
      formatted_address: "1700 Lincoln Street, Denver, CO 80203, USA",
      coordinates: { latitude: 39.7392, longitude: -104.9903 },
      property_type: "residential" as const,
      year_built: 2020,
      square_feet: 1900,
      bedrooms: 3,
      bathrooms: 2,
      elevation_meters: 1609
    } as Property,
    risk_assessment: {
      overall_score: 38,
      risk_level: "MODERATE" as RiskLevel,
      last_updated: "2024-08-20T13:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 89,
      data_completeness: 91,
      hazards: {
        hail: {
          score: 78,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 81, confidence: 94 },
            climatecheck: { name: "ClimateCheck", score: 75, confidence: 87 }
          },
          description: "High hail risk - Denver is in 'Hail Alley' with frequent severe storms",
          recommendations: [
            "Install impact-resistant roofing materials",
            "Consider comprehensive auto insurance with hail coverage",
            "Protect windows with storm shutters during severe weather",
            "Move vehicles to covered parking during hail warnings"
          ]
        },
        wildfire: {
          score: 52,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 48, confidence: 86 },
            climatecheck: { name: "ClimateCheck", score: 56, confidence: 82 }
          },
          description: "Moderate wildfire risk from Front Range fire activity"
        },
        winter_weather: {
          score: 45,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 45, confidence: 88 }
          },
          description: "Moderate winter weather risk with occasional blizzards"
        },
        tornado: {
          score: 35,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 35, confidence: 82 }
          },
          description: "Moderate tornado risk on eastern edge of Tornado Alley"
        }
      }
    } as RiskAssessment
  },

  // Low Risk Areas
  portland_oregon: {
    property: {
      id: "portland_downtown_001",
      address: "1000 SW Broadway, Portland, OR 97205",
      formatted_address: "1000 SW Broadway, Portland, OR 97205, USA",
      coordinates: { latitude: 45.5152, longitude: -122.6784 },
      property_type: "residential" as const,
      year_built: 2017,
      square_feet: 1600,
      bedrooms: 2,
      bathrooms: 2,
      elevation_meters: 15
    } as Property,
    risk_assessment: {
      overall_score: 28,
      risk_level: "LOW" as RiskLevel,
      last_updated: "2024-08-20T12:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 87,
      data_completeness: 89,
      hazards: {
        earthquake: {
          score: 65,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 68, confidence: 91 },
            climatecheck: { name: "ClimateCheck", score: 62, confidence: 86 }
          },
          description: "High earthquake risk from Cascadia Subduction Zone",
          recommendations: [
            "Retrofit older buildings for seismic safety",
            "Secure heavy furniture and appliances",
            "Maintain earthquake emergency kit",
            "Know how to shut off utilities"
          ]
        },
        wildfire: {
          score: 25,
          level: "LOW" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 22, confidence: 84 },
            climatecheck: { name: "ClimateCheck", score: 28, confidence: 79 }
          },
          description: "Low wildfire risk in urban core, higher in surrounding hills"
        },
        flood: {
          score: 18,
          level: "LOW" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 15, confidence: 89 },
            firststreet: { name: "First Street Foundation", score: 21, confidence: 83 }
          },
          description: "Low flood risk with good drainage infrastructure"
        }
      }
    } as RiskAssessment
  }
};

// International Location Property Assessments
export const internationalPropertyAssessments = {
  // Europe
  amsterdam_netherlands: {
    property: {
      id: "amsterdam_center_001",
      address: "Prinsengracht 263, 1016 GV Amsterdam, Netherlands",
      formatted_address: "Prinsengracht 263, 1016 GV Amsterdam, Netherlands",
      coordinates: { latitude: 52.3676, longitude: 4.8842 },
      property_type: "residential" as const,
      year_built: 1650,
      square_feet: 1400,
      bedrooms: 2,
      bathrooms: 1,
      elevation_meters: -2
    } as Property,
    risk_assessment: {
      overall_score: 52,
      risk_level: "MODERATE" as RiskLevel,
      last_updated: "2024-08-20T17:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 83,
      data_completeness: 78,
      hazards: {
        flood: {
          score: 68,
          level: "HIGH" as RiskLevel,
          sources: {
            climatecheck: { name: "ClimateCheck EU", score: 72, confidence: 79 }
          },
          description: "High flood risk from sea level rise and canal system - protected by sophisticated flood defenses",
          recommendations: [
            "Monitor flood warning systems",
            "Understand local evacuation procedures",
            "Consider flood-resistant building materials for renovations",
            "Maintain sump pump system"
          ]
        },
        coastal_flooding: {
          score: 58,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "ClimateCheck EU", score: 58, confidence: 76 }
          },
          description: "Moderate coastal flood risk mitigated by Delta Works protection"
        },
        winter_weather: {
          score: 35,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "ClimateCheck EU", score: 35, confidence: 82 }
          },
          description: "Moderate winter weather risk with occasional severe storms"
        }
      }
    } as RiskAssessment
  },

  tokyo_japan: {
    property: {
      id: "tokyo_shibuya_001",
      address: "1-1-1 Shibuya, Shibuya City, Tokyo 150-0002, Japan",
      formatted_address: "1-1-1 Shibuya, Shibuya City, Tokyo 150-0002, Japan",
      coordinates: { latitude: 35.6596, longitude: 139.7006 },
      property_type: "residential" as const,
      year_built: 2019,
      square_feet: 900,
      bedrooms: 2,
      bathrooms: 1,
      elevation_meters: 25
    } as Property,
    risk_assessment: {
      overall_score: 72,
      risk_level: "HIGH" as RiskLevel,
      last_updated: "2024-08-20T18:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 91,
      data_completeness: 88,
      hazards: {
        earthquake: {
          score: 92,
          level: "EXTREME" as RiskLevel,
          sources: {
            climatecheck: { name: "Japan Meteorological Agency", score: 94, confidence: 97 }
          },
          description: "Extreme earthquake risk - Tokyo is on multiple active fault lines",
          recommendations: [
            "Ensure building meets latest seismic building codes",
            "Secure all furniture and heavy objects",
            "Maintain emergency supplies for 7+ days",
            "Practice earthquake drills regularly",
            "Know location of nearest evacuation centers"
          ]
        },
        tsunami: {
          score: 65,
          level: "HIGH" as RiskLevel,
          sources: {
            climatecheck: { name: "Japan Meteorological Agency", score: 65, confidence: 89 }
          },
          description: "High tsunami risk from offshore megathrust earthquakes"
        },
        typhoon: {
          score: 58,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "Japan Meteorological Agency", score: 58, confidence: 85 }
          },
          description: "Moderate typhoon risk during August-October season"
        },
        flood: {
          score: 45,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "Tokyo Metropolitan Government", score: 45, confidence: 82 }
          },
          description: "Moderate flood risk from heavy rainfall and urban runoff"
        }
      }
    } as RiskAssessment
  },

  // Asia-Pacific
  sydney_australia: {
    property: {
      id: "sydney_harbor_001",
      address: "123 George Street, Sydney NSW 2000, Australia",
      formatted_address: "123 George Street, Sydney NSW 2000, Australia",
      coordinates: { latitude: -33.8688, longitude: 151.2093 },
      property_type: "residential" as const,
      year_built: 2016,
      square_feet: 1100,
      bedrooms: 2,
      bathrooms: 2,
      elevation_meters: 12
    } as Property,
    risk_assessment: {
      overall_score: 42,
      risk_level: "MODERATE" as RiskLevel,
      last_updated: "2024-08-20T19:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 86,
      data_completeness: 84,
      hazards: {
        wildfire: {
          score: 58,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "NSW Rural Fire Service", score: 62, confidence: 88 }
          },
          description: "Moderate wildfire risk during summer bushfire season",
          recommendations: [
            "Monitor fire danger ratings during summer",
            "Clear vegetation around property",
            "Have bushfire evacuation plan",
            "Install ember guards on building openings"
          ]
        },
        flood: {
          score: 35,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "Bureau of Meteorology", score: 35, confidence: 81 }
          },
          description: "Moderate flood risk from heavy rainfall events"
        },
        heat: {
          score: 48,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "Bureau of Meteorology", score: 48, confidence: 83 }
          },
          description: "Moderate heat risk during summer months"
        },
        coastal_flooding: {
          score: 32,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "Coastal Studies Unit", score: 32, confidence: 79 }
          },
          description: "Moderate coastal flooding risk from storm surge and king tides"
        }
      }
    } as RiskAssessment
  }
};

// Edge Case Scenarios - Extreme Risk Locations
export const extremeRiskProperties = {
  death_valley_california: {
    property: {
      id: "death_valley_furnace_001",
      address: "Furnace Creek, Death Valley, CA 92328",
      formatted_address: "Furnace Creek, Death Valley, CA 92328, USA",
      coordinates: { latitude: 36.4641, longitude: -116.8706 },
      property_type: "commercial" as const,
      elevation_meters: -86
    } as Property,
    risk_assessment: {
      overall_score: 95,
      risk_level: "EXTREME" as RiskLevel,
      last_updated: "2024-08-20T20:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 88,
      data_completeness: 85,
      hazards: {
        heat: {
          score: 99,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 99, confidence: 95 },
            climatecheck: { name: "ClimateCheck", score: 99, confidence: 91 }
          },
          description: "Extreme heat risk - hottest place on Earth with summer temperatures exceeding 125°F",
          recommendations: [
            "Avoid summer visits (May-September)",
            "Carry emergency water supplies at all times",
            "Never travel alone in remote areas",
            "Have satellite communication device",
            "Vehicle must be in perfect mechanical condition"
          ]
        },
        drought: {
          score: 98,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 98, confidence: 93 }
          },
          description: "Extreme drought conditions - less than 2 inches annual rainfall"
        }
      }
    } as RiskAssessment
  },

  florida_keys_extreme: {
    property: {
      id: "key_west_extreme_001",
      address: "1 Whitehead Street, Key West, FL 33040",
      formatted_address: "1 Whitehead Street, Key West, FL 33040, USA",
      coordinates: { latitude: 24.5465, longitude: -81.8015 },
      property_type: "residential" as const,
      elevation_meters: 0.9
    } as Property,
    risk_assessment: {
      overall_score: 88,
      risk_level: "VERY_HIGH" as RiskLevel,
      last_updated: "2024-08-20T21:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 97,
      data_completeness: 99,
      hazards: {
        hurricane: {
          score: 96,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 98, confidence: 99 },
            firststreet: { name: "First Street Foundation", score: 94, confidence: 96 }
          },
          description: "Extreme hurricane risk - isolated location with no evacuation during storms",
          projections_30yr: 98
        },
        coastal_flooding: {
          score: 94,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 96, confidence: 99 },
            firststreet: { name: "First Street Foundation", score: 92, confidence: 97 }
          },
          description: "Extreme coastal flooding - entire area at or near sea level"
        }
      }
    } as RiskAssessment
  }
};

// Property Comparison Test Data
export const propertyComparisonData: PropertyComparison = {
  properties: [
    {
      property: majorUSCityAssessments.miami_florida.property,
      risk_assessment: majorUSCityAssessments.miami_florida.risk_assessment,
      rank: 4
    },
    {
      property: majorUSCityAssessments.atlanta_georgia.property,
      risk_assessment: majorUSCityAssessments.atlanta_georgia.risk_assessment,
      rank: 2
    },
    {
      property: majorUSCityAssessments.denver_colorado.property,
      risk_assessment: majorUSCityAssessments.denver_colorado.risk_assessment,
      rank: 1
    },
    {
      property: majorUSCityAssessments.portland_oregon.property,
      risk_assessment: majorUSCityAssessments.portland_oregon.risk_assessment,
      rank: 3
    }
  ],
  analytics: {
    lowest_risk: "Denver, Colorado",
    highest_risk: "Miami, Florida",
    average_score: 47.25,
    risk_range: 50
  }
};

// Professional Services Test Data
export const professionalServicesData: Professional[] = [
  {
    id: "prof_001",
    type: "inspector",
    name: "Sarah Johnson",
    company: "Comprehensive Property Inspections LLC",
    email: "sarah@cpinspections.com",
    phone: "(555) 123-4567",
    distance_km: 2.3,
    specializations: ["flood damage assessment", "hurricane preparedness", "structural engineering"],
    certifications: ["ASHI Certified Inspector", "ICC Residential Inspector", "FEMA Flood Damage Assessor"],
    rating: 4.8,
    review_count: 127,
    verified: true,
    service_areas: ["Miami-Dade County", "Broward County", "Palm Beach County"],
    bio: "Licensed inspector with 15 years experience in South Florida climate risk assessment",
    website: "https://cpinspections.com",
    license_number: "HI-8901"
  },
  {
    id: "prof_002",
    type: "insurance_agent",
    name: "Michael Rodriguez",
    company: "Coastal Risk Insurance Solutions",
    email: "mrodriguez@coastalrisk.com",
    phone: "(555) 234-5678",
    distance_km: 1.8,
    specializations: ["flood insurance", "hurricane coverage", "high-risk properties"],
    certifications: ["Licensed Property & Casualty Agent", "NFIP Certified", "CIC Designation"],
    rating: 4.9,
    review_count: 203,
    verified: true,
    service_areas: ["Southeast Florida", "Florida Keys"],
    bio: "Specializing in complex flood and hurricane insurance for coastal properties",
    license_number: "P-4567891"
  },
  {
    id: "prof_003",
    type: "contractor",
    name: "David Chen",
    company: "Storm-Safe Construction",
    email: "dchen@stormsafe.com",
    phone: "(555) 345-6789",
    distance_km: 5.1,
    specializations: ["hurricane shutters", "flood mitigation", "impact windows", "elevated foundations"],
    certifications: ["Licensed General Contractor", "IBHS Fortified Builder", "FEMA Mitigation Specialist"],
    rating: 4.7,
    review_count: 89,
    verified: true,
    service_areas: ["Miami-Dade County", "Monroe County"],
    bio: "Expert in climate-resilient construction and retrofitting for extreme weather protection",
    license_number: "CGC-1234567"
  }
];

export const propertyAssessments = {
  majorUSCities: majorUSCityAssessments,
  international: internationalPropertyAssessments,
  extremeRisk: extremeRiskProperties,
  comparisons: propertyComparisonData,
  professionals: professionalServicesData
};