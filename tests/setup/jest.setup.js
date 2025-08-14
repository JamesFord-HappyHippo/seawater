/**
 * Jest Setup Configuration
 * Global test setup and configuration for Seawater Climate Risk Platform
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 10000
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.REACT_APP_API_BASE_URL = 'https://api-test.seawater.io';
process.env.REACT_APP_MAPBOX_TOKEN = 'pk.test.mapbox.token';
process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-google-maps-key';

// Mock AWS SDK
jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  InvokeCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-rds', () => ({
  RDSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  }))
}));

// Mock external APIs
global.fetch = jest.fn();

// Mock geolocation
global.navigator.geolocation = {
  getCurrentPosition: jest.fn().mockImplementation((success) => {
    success({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10
      }
    });
  }),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

// Mock MapBox GL JS
jest.mock('mapbox-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    getSource: jest.fn(),
    addSource: jest.fn(),
    removeSource: jest.fn(),
    flyTo: jest.fn(),
    remove: jest.fn(),
    resize: jest.fn(),
    getCenter: jest.fn().mockReturnValue({ lng: -74.0060, lat: 40.7128 }),
    getZoom: jest.fn().mockReturnValue(10),
    getBearing: jest.fn().mockReturnValue(0),
    getPitch: jest.fn().mockReturnValue(0)
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn()
  }))
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Setup global test utilities
global.testUtils = {
  // Mock API responses
  mockFEMAResponse: {
    NationalRiskIndex: {
      flood_score: 65,
      wildfire_score: 25,
      heat_score: 45,
      tornado_score: 30,
      hurricane_score: 80,
      social_vulnerability: 0.45,
      community_resilience: 0.65
    }
  },
  
  mockFirstStreetResponse: {
    flood_score: 68,
    wildfire_score: 22,
    heat_score: 48,
    projections: {
      flood_30yr: 75,
      wildfire_30yr: 28,
      heat_30yr: 55
    }
  },
  
  mockClimateCheckResponse: {
    precipitation_risk: 7,
    drought_risk: 3,
    extreme_heat_risk: 5,
    wildfire_risk: 2,
    flood_risk: 7
  },
  
  // Test property addresses
  testProperties: {
    high_flood_risk: "123 Riverside Dr, Houston, TX 77007",
    high_wildfire_risk: "456 Canyon Rd, Paradise, CA 95969", 
    high_earthquake_risk: "789 Fault St, San Francisco, CA 94102",
    low_risk_baseline: "321 Prairie Ave, Manhattan, KS 66502"
  },
  
  // Mock coordinates
  testCoordinates: {
    houston: { latitude: 29.7604, longitude: -95.3698 },
    paradise: { latitude: 39.7596, longitude: -121.6219 },
    sanFrancisco: { latitude: 37.7749, longitude: -122.4194 },
    manhattan: { latitude: 39.1836, longitude: -96.5717 }
  }
};

// Console error suppression for known issues
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress known React testing library warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: findDOMNode is deprecated'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && global.fetch.mockReset) {
    global.fetch.mockReset();
  }
});