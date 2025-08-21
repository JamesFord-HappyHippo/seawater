// API Mock Responses Test Data for Seawater Climate Risk Platform
// Realistic mock responses for FEMA, NOAA, USGS, MapBox and other climate data APIs

import { 
  APIResponse,
  PropertyRiskResponse,
  GeocodingResponse,
  HistoricalEventsResponse,
  SpatialSearchResponse,
  NOAAAPIResponse,
  NOAAWeatherPoint,
  NOAAForecast,
  NOAAAlert,
  NOAAObservation,
  NOAAStormEvent,
  HazardType,
  RiskLevel
} from '../types';

// FEMA National Risk Index API Mock Responses
export const femaApiMockResponses = {
  // Standard property risk assessment
  miami_property_success: {
    success: true,
    data: {
      property: {
        id: "fema_test_001",
        address: "1000 Biscayne Blvd, Miami, FL 33132",
        formatted_address: "1000 Biscayne Blvd, Miami, FL 33132, USA",
        coordinates: { latitude: 25.7847, longitude: -80.1878 },
        property_type: "residential" as const,
        elevation_meters: 2.1
      },
      risk_assessment: {
        overall_score: 78,
        risk_level: "HIGH" as RiskLevel,
        last_updated: "2024-08-21T10:00:00Z",
        data_freshness: "current" as const,
        confidence_score: 96,
        data_completeness: 98,
        hazards: {
          hurricane: {
            score: 89,
            level: "VERY_HIGH" as RiskLevel,
            sources: {
              fema: { 
                name: "FEMA NRI", 
                score: 92, 
                confidence: 98,
                data: {
                  nri_id: "12086950100",
                  state_county_code: "12086",
                  tract_code: "950100",
                  annual_frequency: 0.152,
                  historical_events: 23,
                  expected_annual_loss: 12500,
                  social_vulnerability: 0.45,
                  community_resilience: 0.72
                }
              }
            },
            rating: "Very High",
            expected_annual_loss: 12500,
            risk_value: 89.2,
            percentile: 95
          },
          coastal_flooding: {
            score: 91,
            level: "EXTREME" as RiskLevel,
            sources: {
              fema: {
                name: "FEMA NRI",
                score: 94,
                confidence: 99,
                data: {
                  base_flood_elevation: 8.2,
                  flood_zone: "AE",
                  sfha_status: true,
                  cbrs_status: false
                }
              }
            }
          }
        }
      }
    },
    meta: {
      request_id: "fema_req_001",
      timestamp: "2024-08-21T10:00:00Z",
      processing_time_ms: 450,
      cache_status: "miss" as const,
      cost_credits: 1,
      data_sources_used: ["FEMA NRI v3.1", "FEMA Flood Maps"]
    }
  } as PropertyRiskResponse,

  // Rate limit error response
  rate_limit_error: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "API rate limit exceeded. Maximum 100 requests per minute.",
      details: {
        limit: 100,
        reset_time: "2024-08-21T10:01:00Z",
        retry_after: 30
      },
      suggestion: "Please wait 30 seconds before making another request"
    },
    meta: {
      request_id: "fema_req_002",
      timestamp: "2024-08-21T10:00:30Z"
    }
  },

  // Invalid address error
  invalid_address_error: {
    success: false,
    error: {
      code: "GEOCODING_FAILED",
      message: "Unable to geocode the provided address",
      details: {
        address: "123 Fake Street, Nowhere, XX 00000",
        geocoding_confidence: 0.12,
        suggestions: [
          "123 Real Street, Miami, FL 33132",
          "124 Fake Avenue, Orlando, FL 32801"
        ]
      },
      suggestion: "Please verify the address and try again"
    },
    meta: {
      request_id: "fema_req_003",
      timestamp: "2024-08-21T10:01:00Z"
    }
  },

  // Bulk analysis job response
  bulk_analysis_job: {
    success: true,
    data: {
      job_id: "bulk_job_001",
      status: "processing" as const,
      total_addresses: 500,
      processed_count: 347,
      estimated_completion: "2024-08-21T11:30:00Z",
      webhook_configured: true,
      created_at: "2024-08-21T09:00:00Z",
      download_url: null
    },
    meta: {
      request_id: "fema_req_004",
      timestamp: "2024-08-21T10:15:00Z",
      processing_time_ms: 125,
      cache_status: "miss" as const
    }
  }
};

// NOAA API Mock Responses
export const noaaApiMockResponses = {
  // Weather Point Data
  weather_point_miami: {
    success: true,
    data: {
      '@context': 'https://api.weather.gov/contexts/point',
      '@id': 'https://api.weather.gov/points/25.7847,-80.1878',
      '@type': 'wx:Point',
      cwa: 'MFL',
      forecastOffice: 'https://api.weather.gov/offices/MFL',
      gridId: 'MFL',
      gridX: 110,
      gridY: 50,
      forecast: 'https://api.weather.gov/gridpoints/MFL/110,50/forecast',
      forecastHourly: 'https://api.weather.gov/gridpoints/MFL/110,50/forecast/hourly',
      forecastGridData: 'https://api.weather.gov/gridpoints/MFL/110,50',
      observationStations: 'https://api.weather.gov/gridpoints/MFL/110,50/stations',
      relativeLocation: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-80.1918, 25.7617]
        },
        properties: {
          city: 'Miami',
          state: 'FL',
          distance: {
            unitCode: 'wmoUnit:m',
            value: 1809.2
          },
          bearing: {
            unitCode: 'wmoUnit:deg_(angle)',
            value: 350
          }
        }
      },
      forecastZone: 'https://api.weather.gov/zones/forecast/FLZ173',
      county: 'https://api.weather.gov/zones/county/FLC086',
      fireWeatherZone: 'https://api.weather.gov/zones/fire/FLZ173',
      timeZone: 'America/New_York',
      radarStation: 'KAMX'
    } as NOAAWeatherPoint,
    metadata: {
      request_id: "noaa_req_001",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "miss" as const,
      data_source: "NWS API",
      processing_time_ms: 234
    }
  } as NOAAAPIResponse<NOAAWeatherPoint>,

  // Current Weather Forecast
  current_forecast_miami: {
    success: true,
    data: {
      '@context': 'https://api.weather.gov/contexts/forecast',
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-80.1918, 25.7617], [-80.1918, 25.7617], [-80.1918, 25.7617], [-80.1918, 25.7617]]]
      },
      properties: {
        updated: '2024-08-21T09:30:00Z',
        units: 'us',
        forecastGenerator: 'BaselineForecastGenerator',
        generatedAt: '2024-08-21T10:00:00Z',
        updateTime: '2024-08-21T09:30:00Z',
        validTimes: '2024-08-21T10:00:00Z/P7D',
        elevation: {
          unitCode: 'wmoUnit:m',
          value: 2.1
        },
        periods: [
          {
            number: 1,
            name: 'Today',
            startTime: '2024-08-21T10:00:00-04:00',
            endTime: '2024-08-21T18:00:00-04:00',
            isDaytime: true,
            temperature: 89,
            temperatureUnit: 'F',
            temperatureTrend: null,
            windSpeed: '10 to 15 mph',
            windDirection: 'E',
            icon: 'https://api.weather.gov/icons/land/day/few?size=medium',
            shortForecast: 'Mostly Sunny',
            detailedForecast: 'Mostly sunny, with a high near 89. East wind 10 to 15 mph, with gusts as high as 20 mph.'
          },
          {
            number: 2,
            name: 'Tonight',
            startTime: '2024-08-21T18:00:00-04:00',
            endTime: '2024-08-22T06:00:00-04:00',
            isDaytime: false,
            temperature: 79,
            temperatureUnit: 'F',
            temperatureTrend: null,
            windSpeed: '8 to 12 mph',
            windDirection: 'E',
            icon: 'https://api.weather.gov/icons/land/night/few?size=medium',
            shortForecast: 'Partly Cloudy',
            detailedForecast: 'Partly cloudy, with a low around 79. East wind 8 to 12 mph.'
          }
        ]
      }
    } as NOAAForecast,
    metadata: {
      request_id: "noaa_req_002",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "hit" as const,
      data_source: "NWS Forecast API",
      processing_time_ms: 89
    }
  } as NOAAAPIResponse<NOAAForecast>,

  // Active Weather Alerts
  active_alerts_florida: {
    success: true,
    data: [
      {
        '@context': 'https://api.weather.gov/contexts/alert',
        '@id': 'https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.123456789',
        '@type': 'wx:Alert',
        id: 'urn:oid:2.49.0.1.840.0.123456789',
        areaDesc: 'Miami-Dade County',
        geocode: {
          FIPS6: ['012086'],
          UGC: ['FLZ173']
        },
        affectedZones: ['https://api.weather.gov/zones/forecast/FLZ173'],
        references: [],
        sent: '2024-08-21T08:00:00Z',
        effective: '2024-08-21T08:00:00Z',
        onset: '2024-08-21T12:00:00Z',
        expires: '2024-08-21T20:00:00Z',
        ends: '2024-08-21T20:00:00Z',
        status: 'Actual',
        messageType: 'Alert',
        category: 'Met',
        severity: 'Minor',
        certainty: 'Likely',
        urgency: 'Expected',
        event: 'Heat Advisory',
        sender: 'w-nws.webmaster@noaa.gov',
        senderName: 'NWS Miami FL',
        headline: 'Heat Advisory issued August 21 at 8:00AM EDT until August 21 at 8:00PM EDT by NWS Miami FL',
        description: 'Hot temperatures and high humidity will combine to create a situation in which heat illnesses are possible. Heat index values are expected to reach 105 to 108 degrees.',
        instruction: 'Drink plenty of fluids, stay in an air-conditioned room, stay out of the sun, and check up on relatives and neighbors. Young children and pets should never be left unattended in vehicles under any circumstances.',
        response: 'Execute',
        parameters: {
          NWSheadline: ['Heat Advisory issued August 21 at 8:00AM EDT until August 21 at 8:00PM EDT by NWS Miami FL'],
          BLOCKCHANNEL: ['EAS', 'NWEM', 'CMAS'],
          VTEC: ['/O.NEW.KMFL.HT.Y.0015.240821T1200Z-240822T0000Z/'],
          eventEndingTime: ['2024-08-21T20:00:00Z']
        }
      }
    ] as NOAAAlert[],
    metadata: {
      request_id: "noaa_req_003",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "miss" as const,
      data_source: "NWS Alert API",
      processing_time_ms: 156
    }
  } as NOAAAPIResponse<NOAAAlert[]>,

  // Historical Storm Events
  historical_storms_miami: {
    success: true,
    data: {
      events: [
        {
          BEGIN_YEARMONTH: 202209,
          BEGIN_DAY: 28,
          BEGIN_TIME: 1200,
          END_YEARMONTH: 202209,
          END_DAY: 29,
          END_TIME: 600,
          EPISODE_ID: 156234,
          EVENT_ID: 856234,
          STATE: 'FLORIDA',
          STATE_FIPS: 12,
          YEAR: 2022,
          MONTH_NAME: 'September',
          EVENT_TYPE: 'Hurricane (Typhoon)',
          CZ_TYPE: 'C',
          CZ_FIPS: 86,
          CZ_NAME: 'MIAMI-DADE',
          WFO: 'MFL',
          BEGIN_DATE_TIME: '28-SEP-22 12:00:00',
          CZ_TIMEZONE: 'EST-5',
          END_DATE_TIME: '29-SEP-22 06:00:00',
          INJURIES_DIRECT: 0,
          INJURIES_INDIRECT: 2,
          DEATHS_DIRECT: 0,
          DEATHS_INDIRECT: 1,
          DAMAGE_PROPERTY: '750.00M',
          DAMAGE_CROPS: '25.00M',
          SOURCE: 'Emergency Manager',
          MAGNITUDE: 120,
          MAGNITUDE_TYPE: 'Sustained Wind',
          FLOOD_CAUSE: '',
          CATEGORY: 'Cat3',
          TOR_F_SCALE: '',
          TOR_LENGTH: 0,
          TOR_WIDTH: 0,
          TOR_OTHER_WFO: '',
          TOR_OTHER_CZ_STATE: '',
          TOR_OTHER_CZ_FIPS: 0,
          TOR_OTHER_CZ_NAME: '',
          BEGIN_RANGE: 0,
          BEGIN_AZIMUTH: '',
          BEGIN_LOCATION: 'COUNTYWIDE',
          END_RANGE: 0,
          END_AZIMUTH: '',
          END_LOCATION: '',
          BEGIN_LAT: 25.7617,
          BEGIN_LON: -80.1918,
          END_LAT: 25.7617,
          END_LON: -80.1918,
          EPISODE_NARRATIVE: 'Hurricane Ian made landfall in Southwest Florida as a Category 4 hurricane...',
          EVENT_NARRATIVE: 'Hurricane Ian brought sustained winds of 120 mph to Miami-Dade County...',
          DATA_SOURCE: 'CSV'
        }
      ] as NOAAStormEvent[],
      total_found: 47,
      time_range: {
        start_date: '2010-01-01',
        end_date: '2024-08-21'
      }
    },
    metadata: {
      request_id: "noaa_req_004",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "miss" as const,
      data_source: "NOAA Storm Events Database",
      processing_time_ms: 892
    }
  } as NOAAAPIResponse<any>,

  // API Error Responses
  service_unavailable: {
    success: false,
    error: {
      code: "SERVICE_UNAVAILABLE",
      message: "NOAA Weather Service API is temporarily unavailable",
      api_source: "weather_service" as const,
      status_code: 503,
      retry_after: 300
    },
    metadata: {
      request_id: "noaa_req_005",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "miss" as const,
      data_source: "NWS API",
      processing_time_ms: 15
    }
  },

  invalid_coordinates: {
    success: false,
    error: {
      code: "INVALID_COORDINATES",
      message: "Coordinates are outside the supported geographic area",
      api_source: "weather_service" as const,
      status_code: 400,
      details: {
        latitude: 85.5,
        longitude: -180.5,
        supported_bounds: {
          min_lat: 20.0,
          max_lat: 70.0,
          min_lon: -180.0,
          max_lon: -60.0
        }
      }
    },
    metadata: {
      request_id: "noaa_req_006",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "miss" as const,
      data_source: "NWS API",
      processing_time_ms: 45
    }
  }
};

// USGS Earthquake API Mock Responses
export const usgsApiMockResponses = {
  // Recent earthquakes near location
  recent_earthquakes_california: {
    success: true,
    data: {
      type: "FeatureCollection",
      metadata: {
        generated: 1692619200000,
        url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
        title: "USGS All Earthquakes, Past Week",
        status: 200,
        api: "1.10.3",
        count: 234
      },
      features: [
        {
          type: "Feature",
          properties: {
            mag: 4.2,
            place: "15 km SW of San Francisco, CA",
            time: 1692567890000,
            updated: 1692568950000,
            tz: null,
            url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
            detail: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us7000abcd.geojson",
            felt: 1247,
            cdi: 4.1,
            mmi: 4.3,
            alert: "green",
            status: "reviewed",
            tsunami: 0,
            sig: 289,
            net: "us",
            code: "7000abcd",
            ids: ",us7000abcd,",
            sources: ",us,",
            types: ",dyfi,origin,phase-data,",
            nst: null,
            dmin: 0.123,
            rms: 0.89,
            gap: 45,
            magType: "mw",
            type: "earthquake",
            title: "M 4.2 - 15 km SW of San Francisco, CA"
          },
          geometry: {
            type: "Point",
            coordinates: [-122.5183, 37.7072, 8.94]
          },
          id: "us7000abcd"
        }
      ]
    },
    metadata: {
      request_id: "usgs_req_001",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "miss" as const,
      data_source: "USGS Earthquake API",
      processing_time_ms: 567
    }
  },

  // No recent earthquakes
  no_recent_earthquakes: {
    success: true,
    data: {
      type: "FeatureCollection",
      metadata: {
        generated: 1692619200000,
        url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
        title: "USGS All Earthquakes, Past Week",
        status: 200,
        api: "1.10.3",
        count: 0
      },
      features: []
    },
    metadata: {
      request_id: "usgs_req_002",
      timestamp: "2024-08-21T10:00:00Z",
      cache_status: "hit" as const,
      data_source: "USGS Earthquake API",
      processing_time_ms: 123
    }
  }
};

// MapBox Geocoding API Mock Responses
export const mapboxApiMockResponses = {
  // Successful geocoding
  successful_geocoding: {
    success: true,
    data: {
      results: [
        {
          formatted_address: "1000 Biscayne Blvd, Miami, FL 33132, USA",
          coordinates: { latitude: 25.7847, longitude: -80.1878 },
          address_components: {
            street_number: "1000",
            street_name: "Biscayne Boulevard",
            city: "Miami",
            state: "Florida",
            state_code: "FL",
            country: "United States",
            country_code: "US",
            postal_code: "33132",
            county: "Miami-Dade County"
          },
          confidence: 0.98,
          geocoding_source: "MapBox",
          place_type: "address" as const
        }
      ]
    },
    meta: {
      request_id: "mapbox_req_001",
      timestamp: "2024-08-21T10:00:00Z",
      processing_time_ms: 234,
      cache_status: "miss" as const,
      cost_credits: 0.5
    }
  } as GeocodingResponse,

  // Ambiguous address - multiple results
  ambiguous_address: {
    success: true,
    data: {
      results: [
        {
          formatted_address: "123 Main Street, Springfield, IL 62701, USA",
          coordinates: { latitude: 39.7817, longitude: -89.6501 },
          address_components: {
            street_number: "123",
            street_name: "Main Street",
            city: "Springfield",
            state: "Illinois",
            state_code: "IL",
            country: "United States",
            country_code: "US",
            postal_code: "62701"
          },
          confidence: 0.85,
          geocoding_source: "MapBox",
          place_type: "address" as const
        },
        {
          formatted_address: "123 Main Street, Springfield, MO 65806, USA",
          coordinates: { latitude: 37.2153, longitude: -93.2982 },
          address_components: {
            street_number: "123",
            street_name: "Main Street",
            city: "Springfield",
            state: "Missouri",
            state_code: "MO",
            country: "United States",
            country_code: "US",
            postal_code: "65806"
          },
          confidence: 0.83,
          geocoding_source: "MapBox",
          place_type: "address" as const
        }
      ]
    },
    meta: {
      request_id: "mapbox_req_002",
      timestamp: "2024-08-21T10:00:00Z",
      processing_time_ms: 298,
      cache_status: "miss" as const,
      cost_credits: 0.5
    }
  } as GeocodingResponse,

  // No results found
  no_results: {
    success: true,
    data: {
      results: []
    },
    meta: {
      request_id: "mapbox_req_003",
      timestamp: "2024-08-21T10:00:00Z",
      processing_time_ms: 156,
      cache_status: "miss" as const,
      cost_credits: 0.5
    }
  } as GeocodingResponse
};

// Spatial Search API Mock Responses
export const spatialSearchMockResponses = {
  // High-risk area search results
  high_risk_area_results: {
    success: true,
    data: {
      center_point: {
        latitude: 25.7617,
        longitude: -80.1918
      },
      radius_km: 10,
      properties: [
        {
          distance_km: 1.2,
          address: "100 Biscayne Blvd, Miami, FL 33132",
          risk_score: 82,
          primary_hazards: ["hurricane", "coastal_flooding"] as HazardType[]
        },
        {
          distance_km: 2.8,
          address: "200 Ocean Drive, Miami Beach, FL 33139",
          risk_score: 89,
          primary_hazards: ["hurricane", "coastal_flooding", "heat"] as HazardType[]
        },
        {
          distance_km: 5.1,
          address: "300 Collins Avenue, Miami Beach, FL 33154",
          risk_score: 87,
          primary_hazards: ["hurricane", "coastal_flooding"] as HazardType[]
        }
      ],
      area_statistics: {
        average_risk_score: 86.0,
        total_properties: 3,
        high_risk_count: 3,
        flood_zone_distribution: {
          "AE": 2,
          "VE": 1,
          "X": 0
        }
      }
    },
    meta: {
      request_id: "spatial_req_001",
      timestamp: "2024-08-21T10:00:00Z",
      processing_time_ms: 1234,
      cache_status: "miss" as const,
      cost_credits: 2
    }
  } as SpatialSearchResponse,

  // Low-risk area search results
  low_risk_area_results: {
    success: true,
    data: {
      center_point: {
        latitude: 39.7392,
        longitude: -104.9903
      },
      radius_km: 15,
      properties: [
        {
          distance_km: 3.2,
          address: "1700 Lincoln Street, Denver, CO 80203",
          risk_score: 38,
          primary_hazards: ["hail", "wildfire"] as HazardType[]
        },
        {
          distance_km: 7.8,
          address: "2500 Central Park Blvd, Denver, CO 80238",
          risk_score: 42,
          primary_hazards: ["hail", "tornado"] as HazardType[]
        }
      ],
      area_statistics: {
        average_risk_score: 40.0,
        total_properties: 2,
        high_risk_count: 0,
        flood_zone_distribution: {
          "X": 2,
          "AE": 0
        }
      }
    },
    meta: {
      request_id: "spatial_req_002",
      timestamp: "2024-08-21T10:00:00Z",
      processing_time_ms: 987,
      cache_status: "hit" as const,
      cost_credits: 2
    }
  } as SpatialSearchResponse
};

// API Failure Scenarios
export const apiFailureScenarios = {
  // Network timeout
  network_timeout: {
    success: false,
    error: {
      code: "NETWORK_TIMEOUT",
      message: "Request timed out after 30 seconds",
      suggestion: "Please check your internet connection and try again"
    },
    meta: {
      request_id: "timeout_req_001",
      timestamp: "2024-08-21T10:00:00Z"
    }
  },

  // Service maintenance
  service_maintenance: {
    success: false,
    error: {
      code: "SERVICE_MAINTENANCE",
      message: "API is temporarily unavailable due to scheduled maintenance",
      details: {
        maintenance_window: {
          start: "2024-08-21T02:00:00Z",
          end: "2024-08-21T06:00:00Z"
        },
        estimated_restoration: "2024-08-21T06:00:00Z"
      },
      suggestion: "Please try again after 6:00 AM UTC"
    },
    meta: {
      request_id: "maintenance_req_001",
      timestamp: "2024-08-21T04:30:00Z"
    }
  },

  // Authentication error
  authentication_error: {
    success: false,
    error: {
      code: "AUTH_TOKEN_INVALID",
      message: "The provided API token is invalid or expired",
      suggestion: "Please check your API credentials and regenerate if necessary"
    },
    meta: {
      request_id: "auth_req_001",
      timestamp: "2024-08-21T10:00:00Z"
    }
  },

  // Data source unavailable
  data_source_unavailable: {
    success: false,
    error: {
      code: "DATA_SOURCE_UNAVAILABLE",
      message: "Primary data source is temporarily unavailable",
      details: {
        unavailable_sources: ["FEMA NRI", "First Street Foundation"],
        available_sources: ["ClimateCheck"],
        degraded_service: true
      },
      suggestion: "Results may be limited. Please try again later for complete data"
    },
    meta: {
      request_id: "datasource_req_001",
      timestamp: "2024-08-21T10:00:00Z"
    }
  }
};

// Integration Test Scenarios
export const integrationTestScenarios = {
  // End-to-end property assessment flow
  complete_property_flow: {
    steps: [
      {
        step: 1,
        action: "geocode_address",
        request: {
          address: "1000 Biscayne Blvd, Miami, FL 33132"
        },
        response: mapboxApiMockResponses.successful_geocoding,
        duration_ms: 234
      },
      {
        step: 2,
        action: "get_risk_assessment",
        request: {
          coordinates: { latitude: 25.7847, longitude: -80.1878 }
        },
        response: femaApiMockResponses.miami_property_success,
        duration_ms: 450
      },
      {
        step: 3,
        action: "get_weather_context",
        request: {
          coordinates: { latitude: 25.7847, longitude: -80.1878 }
        },
        response: noaaApiMockResponses.weather_point_miami,
        duration_ms: 234
      },
      {
        step: 4,
        action: "get_historical_events",
        request: {
          coordinates: { latitude: 25.7847, longitude: -80.1878 },
          radius_km: 50
        },
        response: noaaApiMockResponses.historical_storms_miami,
        duration_ms: 892
      }
    ],
    total_duration_ms: 1810,
    success_rate: 100,
    cache_hit_rate: 25
  },

  // Cascade failure scenario
  cascade_failure: {
    steps: [
      {
        step: 1,
        action: "geocode_address",
        request: {
          address: "123 Test Street, Unknown City, XX"
        },
        response: mapboxApiMockResponses.no_results,
        duration_ms: 156
      },
      {
        step: 2,
        action: "get_risk_assessment",
        status: "skipped",
        reason: "geocoding_failed"
      }
    ],
    total_duration_ms: 156,
    success_rate: 0,
    failure_point: "geocoding"
  }
};

export const apiMockResponses = {
  fema: femaApiMockResponses,
  noaa: noaaApiMockResponses,
  usgs: usgsApiMockResponses,
  mapbox: mapboxApiMockResponses,
  spatial: spatialSearchMockResponses,
  failures: apiFailureScenarios,
  integration: integrationTestScenarios
};