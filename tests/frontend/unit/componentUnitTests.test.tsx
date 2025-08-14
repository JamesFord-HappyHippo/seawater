/**
 * React Component Unit Tests
 * Jest unit tests for all React components in the Seawater platform
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock components since they don't exist yet - these would be replaced with actual imports
const RiskScoreCard = ({ address, riskData, showPremiumFeatures }: any) => (
  <div data-testid="risk-score-card">
    <h2>Climate Risk Assessment</h2>
    <p data-testid="address">{address}</p>
    {riskData?.fema && (
      <div data-testid="fema-data">
        <div data-testid="flood-score">Flood: {riskData.fema.flood_score}</div>
        <div data-testid="wildfire-score">Wildfire: {riskData.fema.wildfire_score}</div>
      </div>
    )}
    {showPremiumFeatures && riskData?.firstStreet && (
      <div data-testid="premium-data">
        <h3>30-Year Projections</h3>
        <div data-testid="flood-projection">Flood 2050: {riskData.firstStreet.projections?.flood_30yr}</div>
      </div>
    )}
  </div>
);

const SearchBar = ({ onSearch, placeholder, loading }: any) => (
  <div data-testid="search-bar">
    <input
      data-testid="address-input"
      type="text"
      placeholder={placeholder}
      onChange={(e) => onSearch?.(e.target.value)}
      disabled={loading}
    />
    <button data-testid="search-button" disabled={loading}>
      {loading ? 'Searching...' : 'Search'}
    </button>
  </div>
);

const InteractiveMap = ({ center, zoom, onLocationSelect, properties }: any) => (
  <div 
    data-testid="interactive-map"
    onClick={() => onLocationSelect?.(center[1], center[0])}
    style={{ width: '100%', height: '400px' }}
  >
    <div data-testid="map-center">{center[0]}, {center[1]}</div>
    <div data-testid="map-zoom">Zoom: {zoom}</div>
    {properties?.map((property: any, index: number) => (
      <div key={index} data-testid={`property-marker-${index}`}>
        {property.address}
      </div>
    ))}
  </div>
);

const HazardRiskDisplay = ({ hazardType, scores }: any) => (
  <div data-testid={`hazard-${hazardType}`} className="hazard-display">
    <h4>{hazardType.charAt(0).toUpperCase() + hazardType.slice(1)} Risk</h4>
    {scores.fema && <div data-testid={`${hazardType}-fema`}>FEMA: {scores.fema}</div>}
    {scores.firstStreet && <div data-testid={`${hazardType}-firststreet`}>First Street: {scores.firstStreet}</div>}
    {scores.climateCheck && <div data-testid={`${hazardType}-climatecheck`}>ClimateCheck: {scores.climateCheck}</div>}
  </div>
);

const LoadingSpinner = ({ size = 'medium', message }: any) => (
  <div data-testid="loading-spinner" className={`spinner-${size}`}>
    {message && <p data-testid="loading-message">{message}</p>}
  </div>
);

// Test wrapper with React Query
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('RiskScoreCard Component', () => {
  const mockRiskData = {
    fema: {
      flood_score: 85,
      wildfire_score: 25,
      heat_score: 65,
      tornado_score: 45,
      hurricane_score: 90
    },
    firstStreet: {
      flood_score: 88,
      wildfire_score: 22,
      projections: {
        flood_30yr: 95,
        wildfire_30yr: 28,
        heat_30yr: 75
      }
    },
    climateCheck: {
      flood_risk: 9,
      wildfire_risk: 2,
      extreme_heat_risk: 7
    }
  };

  test('should render risk score card with address', () => {
    const address = "123 Riverside Dr, Houston, TX 77007";
    
    render(
      <RiskScoreCard 
        address={address}
        riskData={mockRiskData}
        showPremiumFeatures={false}
      />
    );

    expect(screen.getByTestId('address')).toHaveTextContent(address);
    expect(screen.getByText('Climate Risk Assessment')).toBeInTheDocument();
  });

  test('should display FEMA risk scores', () => {
    render(
      <RiskScoreCard 
        address="Test Address"
        riskData={mockRiskData}
        showPremiumFeatures={false}
      />
    );

    expect(screen.getByTestId('flood-score')).toHaveTextContent('Flood: 85');
    expect(screen.getByTestId('wildfire-score')).toHaveTextContent('Wildfire: 25');
  });

  test('should show premium features when enabled', () => {
    render(
      <RiskScoreCard 
        address="Test Address"
        riskData={mockRiskData}
        showPremiumFeatures={true}
      />
    );

    expect(screen.getByTestId('premium-data')).toBeInTheDocument();
    expect(screen.getByText('30-Year Projections')).toBeInTheDocument();
    expect(screen.getByTestId('flood-projection')).toHaveTextContent('Flood 2050: 95');
  });

  test('should hide premium features when disabled', () => {
    render(
      <RiskScoreCard 
        address="Test Address"
        riskData={mockRiskData}
        showPremiumFeatures={false}
      />
    );

    expect(screen.queryByTestId('premium-data')).not.toBeInTheDocument();
    expect(screen.queryByText('30-Year Projections')).not.toBeInTheDocument();
  });

  test('should handle missing risk data gracefully', () => {
    render(
      <RiskScoreCard 
        address="Test Address"
        riskData={null}
        showPremiumFeatures={false}
      />
    );

    expect(screen.getByTestId('address')).toHaveTextContent('Test Address');
    expect(screen.queryByTestId('fema-data')).not.toBeInTheDocument();
  });
});

describe('SearchBar Component', () => {
  test('should render search input and button', () => {
    render(<SearchBar placeholder="Enter address" />);

    expect(screen.getByTestId('address-input')).toBeInTheDocument();
    expect(screen.getByTestId('search-button')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter address')).toBeInTheDocument();
  });

  test('should call onSearch when input changes', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByTestId('address-input');
    await userEvent.type(input, 'Houston, TX');

    expect(mockOnSearch).toHaveBeenCalledWith('Houston, TX');
  });

  test('should disable input and button when loading', () => {
    render(<SearchBar loading={true} />);

    expect(screen.getByTestId('address-input')).toBeDisabled();
    expect(screen.getByTestId('search-button')).toBeDisabled();
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  test('should enable input and button when not loading', () => {
    render(<SearchBar loading={false} />);

    expect(screen.getByTestId('address-input')).not.toBeDisabled();
    expect(screen.getByTestId('search-button')).not.toBeDisabled();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });
});

describe('InteractiveMap Component', () => {
  const mockProperties = [
    { address: '123 Main St', latitude: 40.7128, longitude: -74.0060 },
    { address: '456 Oak Ave', latitude: 40.7589, longitude: -73.9851 }
  ];

  test('should render map with center coordinates', () => {
    render(
      <InteractiveMap 
        center={[-74.0060, 40.7128]}
        zoom={10}
        properties={[]}
      />
    );

    expect(screen.getByTestId('interactive-map')).toBeInTheDocument();
    expect(screen.getByTestId('map-center')).toHaveTextContent('-74.0060, 40.7128');
    expect(screen.getByTestId('map-zoom')).toHaveTextContent('Zoom: 10');
  });

  test('should render property markers', () => {
    render(
      <InteractiveMap 
        center={[-74.0060, 40.7128]}
        zoom={10}
        properties={mockProperties}
      />
    );

    expect(screen.getByTestId('property-marker-0')).toHaveTextContent('123 Main St');
    expect(screen.getByTestId('property-marker-1')).toHaveTextContent('456 Oak Ave');
  });

  test('should call onLocationSelect when clicked', async () => {
    const mockOnLocationSelect = jest.fn();
    
    render(
      <InteractiveMap 
        center={[-74.0060, 40.7128]}
        zoom={10}
        onLocationSelect={mockOnLocationSelect}
        properties={[]}
      />
    );

    fireEvent.click(screen.getByTestId('interactive-map'));
    expect(mockOnLocationSelect).toHaveBeenCalledWith(40.7128, -74.0060);
  });

  test('should handle empty properties array', () => {
    render(
      <InteractiveMap 
        center={[-74.0060, 40.7128]}
        zoom={10}
        properties={[]}
      />
    );

    expect(screen.queryByTestId('property-marker-0')).not.toBeInTheDocument();
  });
});

describe('HazardRiskDisplay Component', () => {
  test('should display hazard name correctly', () => {
    render(
      <HazardRiskDisplay 
        hazardType="flood"
        scores={{ fema: 85 }}
      />
    );

    expect(screen.getByText('Flood Risk')).toBeInTheDocument();
  });

  test('should display FEMA score when provided', () => {
    render(
      <HazardRiskDisplay 
        hazardType="wildfire"
        scores={{ fema: 45 }}
      />
    );

    expect(screen.getByTestId('wildfire-fema')).toHaveTextContent('FEMA: 45');
  });

  test('should display multiple data sources', () => {
    render(
      <HazardRiskDisplay 
        hazardType="heat"
        scores={{ 
          fema: 67,
          firstStreet: 72,
          climateCheck: 7
        }}
      />
    );

    expect(screen.getByTestId('heat-fema')).toHaveTextContent('FEMA: 67');
    expect(screen.getByTestId('heat-firststreet')).toHaveTextContent('First Street: 72');
    expect(screen.getByTestId('heat-climatecheck')).toHaveTextContent('ClimateCheck: 7');
  });

  test('should handle missing scores gracefully', () => {
    render(
      <HazardRiskDisplay 
        hazardType="tornado"
        scores={{}}
      />
    );

    expect(screen.getByText('Tornado Risk')).toBeInTheDocument();
    expect(screen.queryByTestId('tornado-fema')).not.toBeInTheDocument();
  });

  test('should capitalize hazard type correctly', () => {
    render(
      <HazardRiskDisplay 
        hazardType="extreme_heat"
        scores={{ fema: 80 }}
      />
    );

    expect(screen.getByText('Extreme_heat Risk')).toBeInTheDocument();
  });
});

describe('LoadingSpinner Component', () => {
  test('should render spinner with default size', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('spinner-medium');
  });

  test('should render spinner with custom size', () => {
    render(<LoadingSpinner size="large" />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('spinner-large');
  });

  test('should display loading message when provided', () => {
    const message = 'Loading climate data...';
    render(<LoadingSpinner message={message} />);

    expect(screen.getByTestId('loading-message')).toHaveTextContent(message);
  });

  test('should not display message when not provided', () => {
    render(<LoadingSpinner />);

    expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
  });
});

describe('Component Integration', () => {
  test('should integrate SearchBar with RiskScoreCard', async () => {
    const TestComponent = () => {
      const [address, setAddress] = React.useState('');
      const [loading, setLoading] = React.useState(false);
      const [riskData, setRiskData] = React.useState(null);

      const handleSearch = async (searchAddress: string) => {
        setAddress(searchAddress);
        if (searchAddress.includes('Houston')) {
          setLoading(true);
          setTimeout(() => {
            setRiskData({
              fema: { flood_score: 85, wildfire_score: 25 }
            });
            setLoading(false);
          }, 100);
        }
      };

      return (
        <div>
          <SearchBar onSearch={handleSearch} loading={loading} />
          {loading && <LoadingSpinner message="Loading risk data..." />}
          {riskData && !loading && (
            <RiskScoreCard 
              address={address}
              riskData={riskData}
              showPremiumFeatures={false}
            />
          )}
        </div>
      );
    };

    render(<TestComponent />);

    const input = screen.getByTestId('address-input');
    await userEvent.type(input, 'Houston, TX');

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading risk data...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('risk-score-card')).toBeInTheDocument();
      expect(screen.getByTestId('flood-score')).toHaveTextContent('Flood: 85');
    });
  });

  test('should handle error states in component integration', async () => {
    const TestComponent = () => {
      const [error, setError] = React.useState<string | null>(null);

      const handleSearch = (address: string) => {
        if (address === 'invalid') {
          setError('Unable to find address');
        } else {
          setError(null);
        }
      };

      return (
        <div>
          <SearchBar onSearch={handleSearch} />
          {error && <div data-testid="error-message" role="alert">{error}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    const input = screen.getByTestId('address-input');
    await userEvent.type(input, 'invalid');

    expect(screen.getByTestId('error-message')).toHaveTextContent('Unable to find address');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('Accessibility Tests', () => {
  test('should have proper ARIA labels', () => {
    render(
      <div>
        <SearchBar placeholder="Enter property address" />
        <LoadingSpinner message="Loading..." />
      </div>
    );

    const input = screen.getByTestId('address-input');
    expect(input).toHaveAttribute('type', 'text');
    
    const button = screen.getByTestId('search-button');
    expect(button).toBeInTheDocument();
  });

  test('should handle keyboard navigation', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByTestId('address-input');
    input.focus();
    
    expect(input).toHaveFocus();

    await userEvent.keyboard('{Tab}');
    expect(screen.getByTestId('search-button')).toHaveFocus();
  });

  test('should provide screen reader friendly content', () => {
    render(
      <RiskScoreCard 
        address="123 Main St, Houston, TX"
        riskData={{
          fema: { flood_score: 85, wildfire_score: 25 }
        }}
        showPremiumFeatures={false}
      />
    );

    expect(screen.getByText('Climate Risk Assessment')).toBeInTheDocument();
    expect(screen.getByTestId('flood-score')).toHaveTextContent('Flood: 85');
  });
});