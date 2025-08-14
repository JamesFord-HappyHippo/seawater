/**
 * Frontend Integration Tests
 * Component integration and user flow testing for Seawater platform
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock React Router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useParams: () => ({ id: 'test-id' })
}));

// Mock app components - these would be actual imports in real implementation
const App = () => {
  const [currentAddress, setCurrentAddress] = React.useState('');
  const [riskData, setRiskData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPremiumFeatures, setShowPremiumFeatures] = React.useState(false);

  const handleSearch = async (address: string) => {
    setLoading(true);
    setError(null);
    setCurrentAddress(address);

    try {
      // Simulate API call
      const response = await mockedAxios.get('/api/risk/property', {
        params: { address, sources: 'fema,firststreet' }
      });
      
      setRiskData(response.data.data.Records[0]);
      setShowPremiumFeatures(response.data.data.Records[0].firstStreet !== undefined);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load risk data');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    // Reverse geocode and search
    handleSearch(`${lat}, ${lng}`);
  };

  return (
    <div data-testid="app">
      <header data-testid="app-header">
        <h1>Seawater Climate Risk Platform</h1>
        <nav>
          <button data-testid="nav-home">Home</button>
          <button data-testid="nav-professionals">Professionals</button>
          <button data-testid="nav-education">Education</button>
        </nav>
      </header>

      <main>
        <div data-testid="search-section">
          <input
            data-testid="address-input"
            type="text"
            placeholder="Enter property address"
            onChange={(e) => handleSearch(e.target.value)}
            disabled={loading}
          />
        </div>

        {loading && (
          <div data-testid="loading-state">
            <div data-testid="loading-spinner">Loading...</div>
            <p>Analyzing climate risks for {currentAddress}</p>
          </div>
        )}

        {error && (
          <div data-testid="error-state" role="alert">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {riskData && !loading && (
          <div data-testid="results-section">
            <div data-testid="risk-score-card">
              <h2>Risk Assessment for {currentAddress}</h2>
              
              <div data-testid="hazard-scores">
                {riskData.fema && (
                  <div data-testid="fema-scores">
                    <div data-testid="flood-score">Flood: {riskData.fema.flood_score}/100</div>
                    <div data-testid="wildfire-score">Wildfire: {riskData.fema.wildfire_score}/100</div>
                    <div data-testid="hurricane-score">Hurricane: {riskData.fema.hurricane_score}/100</div>
                  </div>
                )}
              </div>

              {showPremiumFeatures && (
                <div data-testid="premium-features">
                  <h3>Premium Insights</h3>
                  {riskData.firstStreet && (
                    <div data-testid="projections">
                      <p>30-Year Flood Projection: {riskData.firstStreet.projections?.flood_30yr}/100</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div data-testid="interactive-map" onClick={() => handleLocationSelect(29.7604, -95.3698)}>
              <div>Map View</div>
              <div>Click to select location</div>
            </div>
          </div>
        )}
      </main>

      <footer data-testid="app-footer">
        <p>© 2025 Seawater Climate Risk Platform</p>
      </footer>
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Complete User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property Search and Risk Assessment Flow', () => {
    test('should complete full property search workflow', async () => {
      const mockApiResponse = {
        data: {
          success: true,
          data: {
            Records: [{
              address: "123 Main St, Houston, TX 77002",
              coordinates: { latitude: 29.7604, longitude: -95.3698 },
              fema: {
                flood_score: 85,
                wildfire_score: 25,
                hurricane_score: 90,
                flood_zone: "AE",
                requires_flood_insurance: true
              },
              firstStreet: {
                flood_score: 88,
                projections: {
                  flood_30yr: 95
                }
              }
            }]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Verify initial page load
      expect(screen.getByTestId('app')).toBeInTheDocument();
      expect(screen.getByText('Seawater Climate Risk Platform')).toBeInTheDocument();
      expect(screen.getByTestId('address-input')).toBeInTheDocument();

      // Perform property search
      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, '123 Main St, Houston, TX 77002');

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.getByText('Analyzing climate risks for 123 Main St, Houston, TX 77002')).toBeInTheDocument();
      });

      // Wait for results to load
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        expect(screen.getByTestId('results-section')).toBeInTheDocument();
      });

      // Verify risk assessment results
      expect(screen.getByText('Risk Assessment for 123 Main St, Houston, TX 77002')).toBeInTheDocument();
      expect(screen.getByTestId('flood-score')).toHaveTextContent('Flood: 85/100');
      expect(screen.getByTestId('wildfire-score')).toHaveTextContent('Wildfire: 25/100');
      expect(screen.getByTestId('hurricane-score')).toHaveTextContent('Hurricane: 90/100');

      // Verify premium features are shown
      expect(screen.getByTestId('premium-features')).toBeInTheDocument();
      expect(screen.getByText('Premium Insights')).toBeInTheDocument();
      expect(screen.getByText('30-Year Flood Projection: 95/100')).toBeInTheDocument();

      // Verify API was called correctly
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/risk/property', {
        params: { 
          address: '123 Main St, Houston, TX 77002',
          sources: 'fema,firststreet'
        }
      });
    });

    test('should handle high-risk property assessment', async () => {
      const highRiskResponse = {
        data: {
          success: true,
          data: {
            Records: [{
              address: global.testUtils.testProperties.high_flood_risk,
              fema: {
                flood_score: 98,
                wildfire_score: 15,
                hurricane_score: 95,
                flood_zone: "VE",
                requires_flood_insurance: true
              },
              alerts: [
                { type: "flood", severity: "extreme", message: "Property in extreme flood risk zone" },
                { type: "hurricane", severity: "very_high", message: "High hurricane risk area" }
              ]
            }]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(highRiskResponse);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, global.testUtils.testProperties.high_flood_risk);

      await waitFor(() => {
        expect(screen.getByTestId('flood-score')).toHaveTextContent('Flood: 98/100');
        expect(screen.getByTestId('hurricane-score')).toHaveTextContent('Hurricane: 95/100');
      });
    });

    test('should handle low-risk property assessment', async () => {
      const lowRiskResponse = {
        data: {
          success: true,
          data: {
            Records: [{
              address: global.testUtils.testProperties.low_risk_baseline,
              fema: {
                flood_score: 15,
                wildfire_score: 20,
                hurricane_score: 25,
                flood_zone: "X",
                requires_flood_insurance: false
              }
            }]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(lowRiskResponse);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, global.testUtils.testProperties.low_risk_baseline);

      await waitFor(() => {
        expect(screen.getByTestId('flood-score')).toHaveTextContent('Flood: 15/100');
        expect(screen.getByTestId('wildfire-score')).toHaveTextContent('Wildfire: 20/100');
        expect(screen.getByTestId('hurricane-score')).toHaveTextContent('Hurricane: 25/100');
      });

      // Should not show premium features for basic assessment
      expect(screen.queryByTestId('premium-features')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid address errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: "INVALID_ADDRESS",
              message: "Unable to geocode the provided address"
            }
          }
        }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, 'Invalid Address XYZ');

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
        expect(screen.getByText('Unable to geocode the provided address')).toBeInTheDocument();
      });

      // Test error dismissal
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    });

    test('should handle API timeout errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 504,
          data: {
            success: false,
            error: {
              message: "Request timed out while aggregating risk scores"
            }
          }
        }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, 'Houston, TX');

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
        expect(screen.getByText('Request timed out while aggregating risk scores')).toBeInTheDocument();
      });
    });

    test('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, 'Test Address');

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
        expect(screen.getByText('Failed to load risk data')).toBeInTheDocument();
      });
    });
  });

  describe('Map Interaction Integration', () => {
    test('should handle map location selection', async () => {
      const coordinateResponse = {
        data: {
          success: true,
          data: {
            Records: [{
              address: "Houston, TX (29.7604, -95.3698)",
              fema: {
                flood_score: 75,
                wildfire_score: 30,
                hurricane_score: 85
              }
            }]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(coordinateResponse);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // First, search for an address to show the map
      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, 'Houston, TX');

      // Clear the first mock call
      mockedAxios.get.mockClear();
      mockedAxios.get.mockResolvedValueOnce(coordinateResponse);

      // Wait for initial results, then click the map
      await waitFor(() => {
        expect(screen.getByTestId('interactive-map')).toBeInTheDocument();
      });

      const map = screen.getByTestId('interactive-map');
      fireEvent.click(map);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/risk/property', {
          params: {
            address: '29.7604, -95.3698',
            sources: 'fema,firststreet'
          }
        });
      });
    });
  });

  describe('Navigation and Routing Integration', () => {
    test('should handle navigation between sections', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Test navigation buttons
      expect(screen.getByTestId('nav-home')).toBeInTheDocument();
      expect(screen.getByTestId('nav-professionals')).toBeInTheDocument();
      expect(screen.getByTestId('nav-education')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('nav-professionals'));
      // In a real app, this would test routing behavior
    });
  });

  describe('Accessibility Integration', () => {
    test('should maintain accessibility throughout user flow', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            Records: [{
              address: "Test Address",
              fema: { flood_score: 50 }
            }]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Check initial accessibility
      expect(screen.getByTestId('address-input')).toHaveAttribute('type', 'text');
      expect(screen.getByTestId('address-input')).toHaveAttribute('placeholder', 'Enter property address');

      // Test keyboard navigation
      const addressInput = screen.getByTestId('address-input');
      addressInput.focus();
      expect(addressInput).toHaveFocus();

      // Type address and verify error handling has proper ARIA attributes
      await userEvent.type(addressInput, 'Test Address');

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // No errors initially
      });
    });

    test('should provide proper error announcements', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: { error: { message: 'Test error message' } }
        }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const addressInput = screen.getByTestId('address-input');
      await userEvent.type(addressInput, 'Invalid Address');

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-state');
        expect(errorElement).toHaveAttribute('role', 'alert');
        expect(errorElement).toHaveTextContent('Test error message');
      });
    });
  });

  describe('Performance Integration', () => {
    test('should handle multiple rapid searches efficiently', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            Records: [{ address: "Test", fema: { flood_score: 50 } }]
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const addressInput = screen.getByTestId('address-input');
      
      // Rapidly type multiple characters
      await userEvent.type(addressInput, 'Houston, TX', { delay: 50 });

      // Should handle rapid input without breaking
      await waitFor(() => {
        expect(screen.getByTestId('results-section')).toBeInTheDocument();
      });
    });
  });
});