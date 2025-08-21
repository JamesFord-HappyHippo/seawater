// Travel Scenario Test Data for Seawater Climate Risk Platform
// Realistic travel planning and relocation scenarios with comprehensive climate risk data

import { 
  PropertyRiskData, 
  RiskAssessment, 
  HazardType, 
  RiskLevel, 
  Property, 
  Coordinates,
  NOAAWeatherContext,
  HistoricalEvent
} from '../types';

// Sicily Travel Planning Scenarios
export const sicilyTravelScenarios = {
  // Summer vacation planning (high heat and wildfire risk season)
  palermo_summer_2024: {
    location: "Palermo, Sicily, Italy",
    travel_dates: {
      start: "2024-07-15",
      end: "2024-07-29"
    },
    property: {
      id: "sicily_palermo_001",
      address: "Via Roma 123, Palermo, Sicily, Italy",
      formatted_address: "Via Roma 123, 90133 Palermo PA, Italy",
      coordinates: { latitude: 38.1157, longitude: 13.3613 },
      property_type: "commercial" as const,
      elevation_meters: 14
    } as Property,
    risk_assessment: {
      overall_score: 72,
      risk_level: "HIGH" as RiskLevel,
      last_updated: "2024-07-10T10:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 88,
      data_completeness: 92,
      hazards: {
        heat: {
          score: 85,
          level: "VERY_HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA", score: 82, confidence: 85 },
            climatecheck: { name: "ClimateCheck", score: 88, confidence: 90 }
          },
          description: "Extreme heat risk during summer months with temperatures exceeding 40°C",
          recommendations: [
            "Avoid outdoor activities during 11 AM - 4 PM",
            "Stay hydrated with 3-4 liters of water daily",
            "Use air conditioning or cooling centers",
            "Wear light-colored, loose-fitting clothing"
          ],
          weather_adjusted_score: 89,
          weather_adjustment_factors: {
            historical_frequency: 1.15,
            seasonal_factor: 1.25,
            climate_trend: 1.08,
            current_conditions: 1.12
          }
        },
        wildfire: {
          score: 68,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA", score: 65, confidence: 78 },
            climatecheck: { name: "ClimateCheck", score: 71, confidence: 82 }
          },
          description: "Elevated wildfire risk due to dry conditions and Mediterranean vegetation",
          recommendations: [
            "Monitor local fire warnings daily",
            "Avoid hiking in remote areas during high-risk days",
            "Keep vehicle windows closed in smoky areas",
            "Have evacuation route planned from accommodation"
          ]
        },
        flood: {
          score: 25,
          level: "LOW" as RiskLevel,
          sources: {
            fema: { name: "FEMA", score: 22, confidence: 85 }
          },
          description: "Low flood risk during summer months"
        },
        earthquake: {
          score: 45,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA", score: 45, confidence: 92 }
          },
          description: "Moderate seismic activity in Sicily region"
        }
      }
    } as RiskAssessment,
    travel_context: {
      season: "summer",
      peak_tourist_season: true,
      local_alerts: [
        {
          type: "heat" as HazardType,
          severity: "high",
          description: "Heat wave warning issued for July 15-20",
          advisory: "Avoid prolonged sun exposure, seek shade during midday hours"
        }
      ],
      recommended_precautions: [
        "Book accommodations with air conditioning",
        "Travel during early morning or evening hours",
        "Carry portable fans and cooling towels",
        "Research local emergency services contact information"
      ]
    }
  },

  catania_spring_2024: {
    location: "Catania, Sicily, Italy",
    travel_dates: {
      start: "2024-04-10",
      end: "2024-04-17"
    },
    property: {
      id: "sicily_catania_001",
      address: "Via Etnea 250, Catania, Sicily, Italy",
      formatted_address: "Via Etnea 250, 95124 Catania CT, Italy",
      coordinates: { latitude: 37.5079, longitude: 15.0830 },
      property_type: "commercial" as const,
      elevation_meters: 56
    } as Property,
    risk_assessment: {
      overall_score: 55,
      risk_level: "MODERATE" as RiskLevel,
      last_updated: "2024-04-05T14:30:00Z",
      data_freshness: "current" as const,
      confidence_score: 91,
      data_completeness: 95,
      hazards: {
        volcanic_activity: {
          score: 78,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA", score: 78, confidence: 95 }
          },
          description: "Mount Etna volcanic activity monitoring - elevated risk of ash and minor eruptions",
          recommendations: [
            "Monitor volcanic activity bulletins daily",
            "Carry dust masks for potential ashfall",
            "Keep windows closed during ash events",
            "Avoid hiking on Etna during elevated activity periods"
          ]
        },
        earthquake: {
          score: 52,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA", score: 52, confidence: 93 }
          },
          description: "Moderate seismic risk associated with volcanic region"
        },
        heat: {
          score: 35,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "ClimateCheck", score: 35, confidence: 88 }
          },
          description: "Mild spring temperatures, comfortable for travel"
        }
      }
    } as RiskAssessment,
    travel_context: {
      season: "spring",
      peak_tourist_season: false,
      local_alerts: [],
      recommended_precautions: [
        "Check Etna activity status before day trips",
        "Pack light layers for variable spring weather",
        "Download volcanic activity monitoring apps"
      ]
    }
  }
};

// Austin Relocation Scenarios
export const austinRelocationScenarios = {
  comprehensive_assessment: {
    location: "Austin, Texas, USA",
    relocation_context: {
      family_size: 4,
      budget_range: "$400,000-$600,000",
      job_industry: "technology",
      timeline: "6 months",
      priorities: ["school_districts", "climate_safety", "job_market", "cost_of_living"]
    },
    neighborhoods: [
      {
        name: "Cedar Park",
        property: {
          id: "austin_cedar_park_001",
          address: "1234 Hill Country Blvd, Cedar Park, TX 78613",
          formatted_address: "1234 Hill Country Blvd, Cedar Park, TX 78613, USA",
          coordinates: { latitude: 30.5052, longitude: -97.8203 },
          property_type: "residential" as const,
          year_built: 2018,
          square_feet: 2400,
          bedrooms: 4,
          bathrooms: 3,
          elevation_meters: 271
        } as Property,
        risk_assessment: {
          overall_score: 42,
          risk_level: "MODERATE" as RiskLevel,
          last_updated: "2024-08-15T09:00:00Z",
          data_freshness: "current" as const,
          confidence_score: 92,
          data_completeness: 96,
          hazards: {
            flood: {
              score: 28,
              level: "LOW" as RiskLevel,
              sources: {
                fema: { name: "FEMA NRI", score: 25, confidence: 95, data: { zone: "X", elevation_above_floodplain: 45 } },
                firststreet: { name: "First Street Foundation", score: 31, confidence: 89 }
              },
              description: "Low flood risk area, elevated above major floodplains",
              recommendations: ["Standard homeowner's insurance sufficient", "Monitor flash flood warnings during heavy rain"]
            },
            tornado: {
              score: 65,
              level: "HIGH" as RiskLevel,
              sources: {
                fema: { name: "FEMA NRI", score: 68, confidence: 91 },
                climatecheck: { name: "ClimateCheck", score: 62, confidence: 87 }
              },
              description: "Central Texas tornado alley - moderate to high spring/early summer risk",
              recommendations: [
                "Install safe room or identify interior room on lowest floor",
                "Have emergency weather radio",
                "Practice tornado drills with family",
                "Keep emergency supplies in safe area"
              ]
            },
            heat: {
              score: 58,
              level: "MODERATE" as RiskLevel,
              sources: {
                fema: { name: "FEMA NRI", score: 55, confidence: 88 },
                climatecheck: { name: "ClimateCheck", score: 61, confidence: 85 }
              },
              description: "Hot summers with 100°F+ days, manageable with proper preparation",
              recommendations: [
                "Ensure robust HVAC system and backup power",
                "Install energy-efficient windows and insulation",
                "Plan outdoor activities for early morning/evening"
              ]
            },
            drought: {
              score: 48,
              level: "MODERATE" as RiskLevel,
              sources: {
                fema: { name: "FEMA NRI", score: 48, confidence: 82 }
              },
              description: "Periodic drought conditions affecting landscaping and water restrictions"
            },
            hail: {
              score: 72,
              level: "HIGH" as RiskLevel,
              sources: {
                fema: { name: "FEMA NRI", score: 75, confidence: 93 }
              },
              description: "High hail risk during spring storm season",
              recommendations: [
                "Impact-resistant roofing materials recommended",
                "Comprehensive homeowner's insurance with hail coverage",
                "Covered parking for vehicles during storm season"
              ]
            }
          }
        } as RiskAssessment,
        neighborhood_context: {
          school_rating: 9,
          crime_index: "low",
          commute_to_downtown: "25-35 minutes",
          median_home_price: 485000,
          cost_of_living_index: 108,
          family_friendliness: "excellent"
        }
      },
      {
        name: "Mueller",
        property: {
          id: "austin_mueller_001",
          address: "5678 Mueller Blvd, Austin, TX 78723",
          formatted_address: "5678 Mueller Blvd, Austin, TX 78723, USA",
          coordinates: { latitude: 30.2946, longitude: -97.7094 },
          property_type: "residential" as const,
          year_built: 2020,
          square_feet: 2200,
          bedrooms: 3,
          bathrooms: 2.5,
          elevation_meters: 152
        } as Property,
        risk_assessment: {
          overall_score: 38,
          risk_level: "MODERATE" as RiskLevel,
          last_updated: "2024-08-15T09:00:00Z",
          data_freshness: "current" as const,
          confidence_score: 94,
          data_completeness: 97,
          hazards: {
            flood: {
              score: 45,
              level: "MODERATE" as RiskLevel,
              sources: {
                fema: { name: "FEMA NRI", score: 42, confidence: 96 },
                firststreet: { name: "First Street Foundation", score: 48, confidence: 91 }
              },
              description: "Moderate flood risk from urban drainage, improved infrastructure in newer development",
              recommendations: [
                "Consider flood insurance",
                "Elevate utilities and HVAC above potential flood levels",
                "Install sump pump system"
              ]
            },
            tornado: {
              score: 63,
              level: "HIGH" as RiskLevel,
              sources: {
                fema: { name: "FEMA NRI", score: 63, confidence: 91 }
              },
              description: "Similar tornado risk as other Austin areas"
            },
            heat: {
              score: 52,
              level: "MODERATE" as RiskLevel,
              sources: {
                climatecheck: { name: "ClimateCheck", score: 52, confidence: 87 }
              },
              description: "Urban heat island effect in central Austin location"
            }
          }
        } as RiskAssessment,
        neighborhood_context: {
          school_rating: 8,
          crime_index: "low",
          commute_to_downtown: "10-15 minutes",
          median_home_price: 520000,
          cost_of_living_index: 115,
          family_friendliness: "excellent"
        }
      }
    ]
  }
};

// Miami Vacation Rental Scenarios
export const miamiVacationRentalScenarios = {
  south_beach_condo: {
    location: "South Beach, Miami, Florida, USA",
    rental_context: {
      property_type: "vacation_rental",
      rental_duration: "1 week",
      guest_count: 6,
      budget_per_night: 400,
      season: "winter"
    },
    property: {
      id: "miami_south_beach_001",
      address: "101 Ocean Drive, Miami Beach, FL 33139",
      formatted_address: "101 Ocean Drive, Miami Beach, FL 33139, USA",
      coordinates: { latitude: 25.7617, longitude: -80.1918 },
      property_type: "residential" as const,
      year_built: 2015,
      square_feet: 1800,
      bedrooms: 3,
      bathrooms: 2,
      elevation_meters: 1.2
    } as Property,
    risk_assessment: {
      overall_score: 68,
      risk_level: "HIGH" as RiskLevel,
      last_updated: "2024-08-20T11:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 95,
      data_completeness: 98,
      hazards: {
        hurricane: {
          score: 82,
          level: "VERY_HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 85, confidence: 97 },
            firststreet: { name: "First Street Foundation", score: 79, confidence: 94 }
          },
          description: "Very high hurricane risk - direct Atlantic exposure, elevation near sea level",
          recommendations: [
            "Purchase comprehensive travel insurance with hurricane coverage",
            "Monitor hurricane forecasts 7-14 days before travel",
            "Have evacuation plan ready",
            "Book cancellable accommodations during hurricane season (June-November)"
          ],
          projections_30yr: 91
        },
        coastal_flooding: {
          score: 89,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 92, confidence: 98 },
            firststreet: { name: "First Street Foundation", score: 86, confidence: 95 }
          },
          description: "Extreme coastal flooding risk from storm surge and sea level rise",
          recommendations: [
            "Avoid ground floor accommodations",
            "Choose buildings with flood-resistant design",
            "Monitor tidal flooding forecasts during king tides",
            "Keep important documents in waterproof container"
          ]
        },
        heat: {
          score: 45,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "ClimateCheck", score: 45, confidence: 88 }
          },
          description: "Moderate heat risk, mitigated by coastal location during winter visit"
        }
      },
      seasonal_variations: {
        winter: {
          hazards: [
            { hazard: "hurricane" as HazardType, score: 15, level: "LOW" as RiskLevel },
            { hazard: "coastal_flooding" as HazardType, score: 72, level: "HIGH" as RiskLevel }
          ],
          average_risk: 35,
          high_risk_count: 1
        },
        summer: {
          hazards: [
            { hazard: "hurricane" as HazardType, score: 95, level: "EXTREME" as RiskLevel },
            { hazard: "coastal_flooding" as HazardType, score: 89, level: "EXTREME" as RiskLevel },
            { hazard: "heat" as HazardType, score: 72, level: "HIGH" as RiskLevel }
          ],
          average_risk: 85,
          high_risk_count: 3
        },
        spring: {
          hazards: [
            { hazard: "hurricane" as HazardType, score: 25, level: "LOW" as RiskLevel },
            { hazard: "coastal_flooding" as HazardType, score: 78, level: "HIGH" as RiskLevel }
          ],
          average_risk: 42,
          high_risk_count: 1
        },
        fall: {
          hazards: [
            { hazard: "hurricane" as HazardType, score: 88, level: "VERY_HIGH" as RiskLevel },
            { hazard: "coastal_flooding" as HazardType, score: 85, level: "VERY_HIGH" as RiskLevel }
          ],
          average_risk: 78,
          high_risk_count: 2
        }
      }
    } as RiskAssessment,
    rental_considerations: {
      cancellation_policy: "flexible",
      insurance_recommended: true,
      booking_window: "book_early_hurricane_season",
      alternative_dates: ["2024-01-15 to 2024-01-22", "2024-03-10 to 2024-03-17"]
    }
  }
};

// California Wildfire Travel Risk Scenarios
export const californiaWildfireScenarios = {
  napa_valley_wine_tour: {
    location: "Napa Valley, California, USA",
    travel_context: {
      activity: "wine_tour",
      travel_dates: {
        start: "2024-09-15",
        end: "2024-09-20"
      },
      season: "fire_season_peak"
    },
    property: {
      id: "napa_valley_001",
      address: "1234 Silverado Trail, Napa, CA 94558",
      formatted_address: "1234 Silverado Trail, Napa, CA 94558, USA",
      coordinates: { latitude: 38.2975, longitude: -122.2869 },
      property_type: "commercial" as const,
      elevation_meters: 67
    } as Property,
    risk_assessment: {
      overall_score: 78,
      risk_level: "HIGH" as RiskLevel,
      last_updated: "2024-09-10T08:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 94,
      data_completeness: 96,
      hazards: {
        wildfire: {
          score: 92,
          level: "EXTREME" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 90, confidence: 96 },
            climatecheck: { name: "ClimateCheck", score: 94, confidence: 93 }
          },
          description: "Extreme wildfire risk during September peak fire season",
          recommendations: [
            "Monitor CAL FIRE and local fire department alerts daily",
            "Have multiple evacuation routes planned",
            "Keep vehicle fueled and ready for evacuation",
            "Pack emergency 'go bag' with essentials",
            "Download emergency alert apps (Zonehaven, Alert Marin)",
            "Consider travel insurance with natural disaster coverage"
          ],
          weather_adjusted_score: 96,
          weather_adjustment_factors: {
            historical_frequency: 1.12,
            seasonal_factor: 1.35,
            climate_trend: 1.08,
            current_conditions: 1.18
          }
        },
        earthquake: {
          score: 58,
          level: "MODERATE" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 58, confidence: 91 }
          },
          description: "Moderate earthquake risk in Northern California"
        },
        drought: {
          score: 72,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 72, confidence: 89 }
          },
          description: "High drought conditions contributing to fire risk"
        }
      }
    } as RiskAssessment,
    travel_advisories: {
      current_fire_activity: [
        {
          fire_name: "Glass Fire Complex",
          distance_km: 15,
          containment_percent: 25,
          threat_level: "watch"
        }
      ],
      air_quality: {
        aqi: 158,
        category: "unhealthy",
        recommendation: "Limit outdoor activities, especially for sensitive groups"
      },
      road_closures: ["Highway 29 - partial", "Silverado Trail - monitored"],
      evacuation_zones: {
        current_zone: "Zone 3",
        status: "ready",
        description: "Prepare for potential evacuation within 24 hours"
      }
    }
  },

  lake_tahoe_hiking: {
    location: "Lake Tahoe, California/Nevada, USA",
    travel_context: {
      activity: "hiking_camping",
      travel_dates: {
        start: "2024-08-10",
        end: "2024-08-17"
      },
      season: "fire_season"
    },
    property: {
      id: "lake_tahoe_001",
      address: "789 Emerald Bay Rd, South Lake Tahoe, CA 96150",
      formatted_address: "789 Emerald Bay Rd, South Lake Tahoe, CA 96150, USA",
      coordinates: { latitude: 38.9518, longitude: -120.0812 },
      property_type: "residential" as const,
      elevation_meters: 1901
    } as Property,
    risk_assessment: {
      overall_score: 65,
      risk_level: "HIGH" as RiskLevel,
      last_updated: "2024-08-08T12:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 91,
      data_completeness: 94,
      hazards: {
        wildfire: {
          score: 85,
          level: "VERY_HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 82, confidence: 94 },
            climatecheck: { name: "ClimateCheck", score: 88, confidence: 89 }
          },
          description: "Very high wildfire risk in forested mountain terrain",
          recommendations: [
            "Check fire restrictions before hiking (no campfires/smoking)",
            "Stay on designated trails only",
            "Carry emergency beacon or satellite communicator",
            "Inform others of hiking plans and expected return",
            "Monitor weather for lightning and wind conditions"
          ]
        },
        drought: {
          score: 68,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "FEMA NRI", score: 68, confidence: 86 }
          },
          description: "High drought conditions affecting forest moisture levels"
        }
      }
    } as RiskAssessment,
    outdoor_conditions: {
      fire_danger_rating: "extreme",
      fire_restrictions: {
        campfires: "prohibited",
        smoking: "prohibited_except_vehicles",
        fireworks: "prohibited",
        mechanical_equipment: "restricted_hours"
      },
      trail_closures: ["Desolation Wilderness - partial", "Emerald Bay Trail - open with restrictions"],
      recommended_gear: [
        "Fire-resistant clothing",
        "Emergency whistle",
        "First aid kit",
        "Extra water (1 gallon per person per day)",
        "Emergency shelter",
        "GPS device or map and compass"
      ]
    }
  }
};

// Caribbean Hurricane Season Travel Planning
export const caribbeanHurricaneScenarios = {
  barbados_november_2024: {
    location: "Bridgetown, Barbados",
    travel_context: {
      travel_dates: {
        start: "2024-11-10",
        end: "2024-11-17"
      },
      season: "late_hurricane_season",
      travel_type: "honeymoon"
    },
    property: {
      id: "barbados_bridgetown_001",
      address: "Sandy Lane Resort, St. James, Barbados",
      formatted_address: "Sandy Lane Resort, Highway 1, St. James, Barbados",
      coordinates: { latitude: 13.1939, longitude: -59.6165 },
      property_type: "commercial" as const,
      elevation_meters: 5
    } as Property,
    risk_assessment: {
      overall_score: 48,
      risk_level: "MODERATE" as RiskLevel,
      last_updated: "2024-11-05T14:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 89,
      data_completeness: 91,
      hazards: {
        hurricane: {
          score: 65,
          level: "HIGH" as RiskLevel,
          sources: {
            fema: { name: "NOAA/NHC", score: 62, confidence: 93 },
            climatecheck: { name: "ClimateCheck", score: 68, confidence: 86 }
          },
          description: "Moderate hurricane risk in late season - lower than peak but still significant",
          recommendations: [
            "Monitor Atlantic tropical activity weekly",
            "Purchase comprehensive travel insurance",
            "Book flexible accommodation with cancellation options",
            "Pack emergency supplies (flashlight, batteries, water)",
            "Download weather radar and hurricane tracking apps"
          ],
          weather_adjusted_score: 55,
          weather_adjustment_factors: {
            historical_frequency: 0.82,
            seasonal_factor: 0.75,
            climate_trend: 1.05,
            current_conditions: 0.95
          }
        },
        coastal_flooding: {
          score: 42,
          level: "MODERATE" as RiskLevel,
          sources: {
            firststreet: { name: "First Street Foundation", score: 42, confidence: 88 }
          },
          description: "Moderate coastal flooding risk from storm surge and high tides"
        }
      }
    } as RiskAssessment,
    seasonal_context: {
      hurricane_season_status: "late_season",
      historical_november_activity: {
        average_storms: 0.8,
        major_hurricanes_historical: 2,
        last_november_impact: "2010 - Tropical Storm Tomas"
      },
      current_season_summary: {
        named_storms_to_date: 18,
        hurricanes_to_date: 11,
        major_hurricanes_to_date: 5,
        season_activity_level: "above_normal"
      }
    }
  },

  jamaica_august_2024: {
    location: "Montego Bay, Jamaica",
    travel_context: {
      travel_dates: {
        start: "2024-08-15",
        end: "2024-08-25"
      },
      season: "peak_hurricane_season",
      travel_type: "family_vacation"
    },
    property: {
      id: "jamaica_montego_bay_001",
      address: "Doctor's Cave Beach Hotel, Montego Bay, Jamaica",
      formatted_address: "Doctor's Cave Beach Hotel, Gloucester Ave, Montego Bay, Jamaica",
      coordinates: { latitude: 18.4762, longitude: -77.9217 },
      property_type: "commercial" as const,
      elevation_meters: 3
    } as Property,
    risk_assessment: {
      overall_score: 72,
      risk_level: "HIGH" as RiskLevel,
      last_updated: "2024-08-12T10:00:00Z",
      data_freshness: "current" as const,
      confidence_score: 92,
      data_completeness: 95,
      hazards: {
        hurricane: {
          score: 88,
          level: "VERY_HIGH" as RiskLevel,
          sources: {
            fema: { name: "NOAA/NHC", score: 91, confidence: 96 },
            climatecheck: { name: "ClimateCheck", score: 85, confidence: 89 }
          },
          description: "Very high hurricane risk during peak season - Jamaica frequently impacted",
          recommendations: [
            "Monitor tropical weather daily starting 7-10 days before travel",
            "Have evacuation plan and alternative travel dates ready",
            "Book hurricane-resistant resort with emergency protocols",
            "Purchase trip cancellation and interruption insurance",
            "Pack emergency kit with 3-day supplies",
            "Download emergency communication apps"
          ],
          weather_adjusted_score: 92,
          weather_adjustment_factors: {
            historical_frequency: 1.25,
            seasonal_factor: 1.45,
            climate_trend: 1.08,
            current_conditions: 1.15
          }
        },
        coastal_flooding: {
          score: 78,
          level: "HIGH" as RiskLevel,
          sources: {
            firststreet: { name: "First Street Foundation", score: 78, confidence: 91 }
          },
          description: "High coastal flooding risk during hurricane season"
        },
        heat: {
          score: 52,
          level: "MODERATE" as RiskLevel,
          sources: {
            climatecheck: { name: "ClimateCheck", score: 52, confidence: 85 }
          },
          description: "Moderate heat risk, typical for Caribbean summer"
        }
      }
    } as RiskAssessment,
    travel_recommendations: {
      booking_strategy: "cancel_friendly_options",
      insurance_requirements: [
        "Hurricane/named storm coverage",
        "Trip cancellation and interruption",
        "Emergency medical and evacuation",
        "Baggage delay protection"
      ],
      monitoring_schedule: {
        "14_days_before": "Begin monitoring tropical Atlantic activity",
        "7_days_before": "Daily weather briefings and forecast updates",
        "3_days_before": "Hourly monitoring if tropical system present",
        "24_hours_before": "Final travel decision point"
      },
      alternative_destinations: [
        {
          location: "Aruba",
          hurricane_risk: "low",
          reasoning: "South of typical hurricane belt"
        },
        {
          location: "Costa Rica Pacific Coast",
          hurricane_risk: "very_low",
          reasoning: "Protected by Central American landmass"
        }
      ]
    }
  }
};

// Historical events for context
export const travelScenarioHistoricalEvents: HistoricalEvent[] = [
  {
    id: "sicily_heat_2021",
    event_type: "heat",
    name: "Sicily Heat Dome 2021",
    date: "2021-08-11",
    severity: 95,
    description: "Record-breaking heat wave with temperatures reaching 48.8°C (119.8°F) in Syracuse",
    affected_area: {
      north: 38.5,
      south: 36.5,
      east: 15.5,
      west: 12.0
    },
    damages: {
      economic_loss: 150000000,
      casualties: 0,
      properties_affected: 25000
    }
  },
  {
    id: "austin_freeze_2021",
    event_type: "winter_weather",
    name: "Texas Winter Storm Uri",
    date: "2021-02-15",
    severity: 88,
    description: "Historic winter storm causing widespread power outages and infrastructure failure",
    affected_area: {
      north: 33.0,
      south: 25.8,
      east: -93.5,
      west: -106.5
    },
    damages: {
      economic_loss: 195000000000,
      casualties: 246,
      properties_affected: 4500000
    }
  },
  {
    id: "miami_irma_2017",
    event_type: "hurricane",
    name: "Hurricane Irma",
    date: "2017-09-10",
    severity: 92,
    description: "Category 4 hurricane causing widespread flooding and wind damage in South Florida",
    affected_area: {
      north: 26.5,
      south: 24.5,
      east: -79.8,
      west: -81.8
    },
    damages: {
      economic_loss: 77160000000,
      casualties: 92,
      properties_affected: 1200000
    }
  }
];

export const travelScenarios = {
  sicily: sicilyTravelScenarios,
  austin: austinRelocationScenarios,
  miami: miamiVacationRentalScenarios,
  california: californiaWildfireScenarios,
  caribbean: caribbeanHurricaneScenarios,
  historicalEvents: travelScenarioHistoricalEvents
};