# 🌊 Seawater Mobile App - Flutter Development Guide

## 🎯 Overview

This guide provides comprehensive instructions for developing the Seawater Climate Risk Platform mobile application using Flutter, based on proven patterns from the HoneyDo platform and tailored for climate risk assessment workflows.

### Why Flutter for Seawater?
- **Cross-Platform Efficiency**: Single codebase for iOS and Android
- **Native Performance**: Climate data visualization requires smooth 60fps rendering
- **Location Services**: Excellent support for GPS and mapping integrations
- **Offline Capabilities**: Essential for areas with poor connectivity
- **MapBox Integration**: Robust mapping and geolocation support
- **Real-time Updates**: WebSocket support for live risk alerts

## 📱 Project Structure

```
seawater_mobile/
├── lib/
│   ├── main.dart                      # App entry point
│   ├── config/
│   │   ├── api_config.dart            # API endpoints and configuration
│   │   ├── cognito_config.dart        # AWS Cognito authentication settings
│   │   ├── mapbox_config.dart         # MapBox configuration
│   │   └── app_theme.dart             # Climate-focused theming
│   ├── models/
│   │   ├── property.dart              # Property data model
│   │   ├── risk_assessment.dart       # Climate risk assessment model
│   │   ├── user.dart                  # User profile model
│   │   ├── location.dart              # Geographic location model
│   │   └── weather_data.dart          # Weather and climate data
│   ├── services/
│   │   ├── api_service.dart           # REST API client
│   │   ├── auth_service.dart          # Cognito authentication
│   │   ├── location_service.dart      # GPS and geocoding
│   │   ├── map_service.dart           # MapBox integration
│   │   ├── cache_service.dart         # Local data caching
│   │   ├── notification_service.dart  # Push notifications for alerts
│   │   └── offline_service.dart       # Offline data management
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   ├── register_screen.dart
│   │   │   └── verification_screen.dart
│   │   ├── dashboard/
│   │   │   ├── dashboard_screen.dart
│   │   │   └── widgets/
│   │   │       ├── risk_score_widget.dart
│   │   │       ├── weather_widget.dart
│   │   │       └── map_preview_widget.dart
│   │   ├── search/
│   │   │   ├── property_search_screen.dart
│   │   │   ├── map_search_screen.dart
│   │   │   └── saved_properties_screen.dart
│   │   ├── assessment/
│   │   │   ├── risk_assessment_screen.dart
│   │   │   ├── detailed_analysis_screen.dart
│   │   │   └── comparison_screen.dart
│   │   ├── professional/
│   │   │   ├── professional_dashboard.dart
│   │   │   ├── client_management_screen.dart
│   │   │   └── bulk_analysis_screen.dart
│   │   └── settings/
│   │       ├── settings_screen.dart
│   │       ├── subscription_screen.dart
│   │       └── units_preferences_screen.dart
│   ├── widgets/
│   │   ├── risk/
│   │   │   ├── risk_meter.dart
│   │   │   ├── hazard_breakdown_card.dart
│   │   │   └── risk_trend_chart.dart
│   │   ├── map/
│   │   │   ├── interactive_map.dart
│   │   │   ├── risk_overlay.dart
│   │   │   └── property_marker.dart
│   │   ├── search/
│   │   │   ├── address_search_bar.dart
│   │   │   └── property_card.dart
│   │   └── common/
│   │       ├── loading_indicator.dart
│   │       ├── error_widget.dart
│   │       └── premium_feature_banner.dart
│   └── utils/
│       ├── validators.dart             # Form validation
│       ├── formatters.dart             # Data formatting
│       ├── constants.dart              # App constants
│       ├── unit_converter.dart         # English/Metric conversion
│       └── risk_calculator.dart        # Risk score calculations
├── test/                               # Unit and widget tests
├── integration_test/                   # Integration tests
├── android/                            # Android-specific configuration
├── ios/                               # iOS-specific configuration
└── pubspec.yaml                       # Dependencies and assets
```

## 🔌 API Integration

### API Configuration
```dart
// lib/config/api_config.dart
class ApiConfig {
  static const String baseUrl = 'https://api.seawater.io/v1';
  
  static const Map<String, String> endpoints = {
    'login': '/auth/login',
    'register': '/auth/register',
    'verify': '/auth/verify',
    'properties': '/properties',
    'risk': '/risk',
    'geocode': '/geocode',
    'weather': '/weather',
    'professionals': '/professionals',
    'subscriptions': '/subscriptions',
  };
  
  // Rate limiting configuration
  static const int maxRequestsPerMinute = 100;
  static const Duration cacheDuration = Duration(hours: 1);
}
```

### Climate Risk API Service
```dart
// lib/services/api_service.dart
import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';

class SeawaterApiService {
  late final Dio _dio;
  late final CacheOptions _cacheOptions;
  
  SeawaterApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
    ));
    
    _cacheOptions = CacheOptions(
      store: MemCacheStore(),
      policy: CachePolicy.request,
      hitCacheOnErrorExcept: [401, 403],
      maxStale: const Duration(hours: 6),
      priority: CachePriority.high,
    );
    
    _dio.interceptors.addAll([
      DioCacheInterceptor(options: _cacheOptions),
      AuthInterceptor(),
      LoggingInterceptor(),
      RateLimitInterceptor(),
    ]);
  }
  
  Future<RiskAssessment> getPropertyRisk(String address, {
    List<String> sources = const ['fema'],
    bool includeProjections = false,
  }) async {
    try {
      final response = await _dio.get(
        ApiConfig.endpoints['risk']!,
        queryParameters: {
          'address': address,
          'sources': sources.join(','),
          'include_projections': includeProjections,
        },
        options: _cacheOptions.toOptions(),
      );
      
      return RiskAssessment.fromJson(response.data['data']['Records'][0]);
    } on DioException catch (e) {
      throw _handleApiError(e);
    }
  }
  
  Future<List<Property>> searchNearbyProperties(
    double latitude,
    double longitude, {
    double radiusKm = 5.0,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.endpoints['properties']!}/nearby',
        queryParameters: {
          'latitude': latitude,
          'longitude': longitude,
          'radius_km': radiusKm,
          'limit': limit,
        },
      );
      
      return (response.data['data']['Records'] as List)
          .map((json) => Property.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw _handleApiError(e);
    }
  }
  
  ApiException _handleApiError(DioException e) {
    switch (e.response?.statusCode) {
      case 400:
        return BadRequestException(e.response?.data['message'] ?? 'Bad request');
      case 401:
        return UnauthorizedException('Authentication required');
      case 403:
        return ForbiddenException('Access denied');
      case 429:
        return RateLimitException('Rate limit exceeded');
      case 500:
        return ServerException('Server error');
      default:
        return NetworkException('Network error: ${e.message}');
    }
  }
}
```

## 🗺️ MapBox Integration

### Map Configuration
```dart
// lib/config/mapbox_config.dart
class MapBoxConfig {
  static const String accessToken = String.fromEnvironment(
    'MAPBOX_ACCESS_TOKEN',
    defaultValue: 'your_mapbox_token_here',
  );
  
  static const String styleUrl = 'mapbox://styles/mapbox/light-v11';
  
  // Climate risk overlay configurations
  static const Map<String, String> riskOverlays = {
    'flood': 'mapbox://styles/seawater/flood-risk-overlay',
    'wildfire': 'mapbox://styles/seawater/wildfire-risk-overlay',
    'heat': 'mapbox://styles/seawater/heat-risk-overlay',
    'hurricane': 'mapbox://styles/seawater/hurricane-risk-overlay',
  };
  
  static const Map<String, Color> riskColors = {
    'low': Color(0xFF4CAF50),      // Green
    'moderate': Color(0xFFFF9800), // Orange  
    'high': Color(0xFFF44336),     // Red
    'extreme': Color(0xFF9C27B0),  // Purple
  };
}
```

### Interactive Map Widget
```dart
// lib/widgets/map/interactive_map.dart
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';

class InteractiveClimateMap extends StatefulWidget {
  final double latitude;
  final double longitude;
  final double zoom;
  final String? riskOverlay;
  final List<PropertyMarkerData> properties;
  final Function(double lat, double lng)? onLocationTap;
  
  const InteractiveClimateMap({
    Key? key,
    required this.latitude,
    required this.longitude,
    this.zoom = 12.0,
    this.riskOverlay,
    this.properties = const [],
    this.onLocationTap,
  }) : super(key: key);

  @override
  State<InteractiveClimateMap> createState() => _InteractiveClimateMapState();
}

class _InteractiveClimateMapState extends State<InteractiveClimateMap> {
  MapboxMap? _mapboxMap;
  
  @override
  Widget build(BuildContext context) {
    return MapWidget(
      key: ValueKey("mapWidget"),
      cameraOptions: CameraOptions(
        center: Point(coordinates: Position(widget.longitude, widget.latitude)),
        zoom: widget.zoom,
      ),
      styleUri: MapBoxConfig.styleUrl,
      textureView: true,
      onMapCreated: _onMapCreated,
      onTapListener: _onMapTap,
    );
  }
  
  void _onMapCreated(MapboxMap mapboxMap) {
    _mapboxMap = mapboxMap;
    _setupMap();
  }
  
  Future<void> _setupMap() async {
    if (_mapboxMap == null) return;
    
    // Add risk overlay if specified
    if (widget.riskOverlay != null) {
      await _addRiskOverlay(widget.riskOverlay!);
    }
    
    // Add property markers
    await _addPropertyMarkers();
    
    // Set up map interaction handlers
    await _setupMapInteractions();
  }
  
  Future<void> _addRiskOverlay(String riskType) async {
    final overlayUrl = MapBoxConfig.riskOverlays[riskType];
    if (overlayUrl == null) return;
    
    try {
      await _mapboxMap!.style.addSource(RasterSource(
        id: "${riskType}_risk_source",
        tiles: [overlayUrl],
        tileSize: 256,
      ));
      
      await _mapboxMap!.style.addLayer(RasterLayer(
        id: "${riskType}_risk_layer",
        sourceId: "${riskType}_risk_source",
        rasterOpacity: 0.6,
      ));
    } catch (e) {
      debugPrint('Error adding risk overlay: $e');
    }
  }
  
  Future<void> _addPropertyMarkers() async {
    for (final property in widget.properties) {
      final pointAnnotation = PointAnnotation(
        id: property.id,
        point: Point(coordinates: Position(
          property.longitude,
          property.latitude,
        )),
        iconImage: _getRiskIcon(property.riskLevel),
        iconSize: 1.5,
      );
      
      await _mapboxMap!.annotations.createPointAnnotationManager()
          .then((manager) => manager.create(pointAnnotation));
    }
  }
  
  String _getRiskIcon(String riskLevel) {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return 'risk-marker-green';
      case 'moderate':
        return 'risk-marker-orange';
      case 'high':
        return 'risk-marker-red';
      case 'extreme':
        return 'risk-marker-purple';
      default:
        return 'risk-marker-gray';
    }
  }
  
  Future<void> _setupMapInteractions() async {
    // Enable gestures for smooth interaction
    await _mapboxMap!.gestures.updateSettings(GesturesSettings(
      rotateEnabled: true,
      pitchEnabled: true,
      scrollEnabled: true,
      simultaneousRotateAndPinchToZoomEnabled: true,
      quickZoomEnabled: true,
    ));
  }
  
  void _onMapTap(ScreenCoordinate coordinate) async {
    if (widget.onLocationTap == null) return;
    
    final point = await _mapboxMap!.coordinateForPixel(coordinate);
    widget.onLocationTap!(
      point.coordinates.lat,
      point.coordinates.lng,
    );
  }
}
```

## 🔐 Authentication Integration

### Cognito Authentication Service
```dart
// lib/services/auth_service.dart
import 'package:amazon_cognito_identity_dart_2/cognito.dart';

class SeawaterAuthService {
  static const userPoolId = 'us-east-2_SEAWATER123';
  static const clientId = 'your_cognito_client_id';
  
  final userPool = CognitoUserPool(userPoolId, clientId);
  final _storage = CognitoMemoryStorage();
  
  Future<AuthResult> signIn(String email, String password) async {
    try {
      final cognitoUser = CognitoUser(email, userPool, storage: _storage);
      final authDetails = AuthenticationDetails(
        username: email,
        password: password,
      );
      
      final session = await cognitoUser.authenticateUser(authDetails);
      
      if (session == null) {
        throw AuthException('Authentication failed');
      }
      
      return AuthResult.success(
        user: await _getUserFromSession(session),
        tokens: AuthTokens(
          accessToken: session.getAccessToken().jwtToken,
          idToken: session.getIdToken().jwtToken,
          refreshToken: session.getRefreshToken()?.token,
        ),
      );
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    }
  }
  
  Future<AuthResult> signUp(
    String email,
    String password,
    Map<String, String> attributes,
  ) async {
    try {
      final result = await userPool.signUp(
        email,
        password,
        userAttributes: attributes.entries
            .map((e) => AttributeArg(name: e.key, value: e.value))
            .toList(),
      );
      
      return AuthResult.pendingVerification(
        email: email,
        destination: result?.userSub,
      );
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    }
  }
  
  Future<AuthResult> confirmSignUp(String email, String code) async {
    try {
      final cognitoUser = CognitoUser(email, userPool, storage: _storage);
      final success = await cognitoUser.confirmRegistration(code);
      
      if (success) {
        return AuthResult.verificationSuccess();
      } else {
        return AuthResult.failure(AuthError.verificationFailed);
      }
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    }
  }
  
  Future<bool> isSignedIn() async {
    try {
      final session = await getCurrentSession();
      return session != null && session.isValid();
    } catch (e) {
      return false;
    }
  }
  
  Future<CognitoUserSession?> getCurrentSession() async {
    try {
      final cognitoUser = await userPool.getCurrentUser();
      if (cognitoUser == null) return null;
      
      return await cognitoUser.getSession();
    } catch (e) {
      return null;
    }
  }
  
  Future<void> signOut() async {
    try {
      final cognitoUser = await userPool.getCurrentUser();
      await cognitoUser?.signOut();
    } catch (e) {
      debugPrint('Error signing out: $e');
    }
  }
  
  AuthError _mapCognitoError(CognitoClientException e) {
    switch (e.code) {
      case 'UserNotConfirmedException':
        return AuthError.userNotVerified;
      case 'NotAuthorizedException':
        return AuthError.invalidCredentials;
      case 'UserNotFoundException':
        return AuthError.userNotFound;
      case 'TooManyRequestsException':
        return AuthError.tooManyRequests;
      case 'LimitExceededException':
        return AuthError.limitExceeded;
      default:
        return AuthError.unknown;
    }
  }
  
  Future<User> _getUserFromSession(CognitoUserSession session) async {
    final payload = session.getIdToken().payload;
    
    return User(
      id: payload['sub'],
      email: payload['email'],
      emailVerified: payload['email_verified'] == true,
      firstName: payload['given_name'],
      lastName: payload['family_name'],
      subscriptionTier: payload['custom:subscription_tier'] ?? 'free',
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        (payload['iat'] as int) * 1000,
      ),
    );
  }
}
```

## 📱 Core Data Models

### Risk Assessment Model
```dart
// lib/models/risk_assessment.dart
import 'package:json_annotation/json_annotation.dart';

part 'risk_assessment.g.dart';

@JsonSerializable()
class RiskAssessment {
  final String address;
  final PropertyLocation location;
  final OverallRisk overallRisk;
  final Map<String, HazardRisk> hazardRisks;
  final InsuranceInfo? insuranceInfo;
  final BuildingCodes? buildingCodes;
  final DateTime lastUpdated;
  final List<String> dataSources;
  
  const RiskAssessment({
    required this.address,
    required this.location,
    required this.overallRisk,
    required this.hazardRisks,
    this.insuranceInfo,
    this.buildingCodes,
    required this.lastUpdated,
    required this.dataSources,
  });
  
  factory RiskAssessment.fromJson(Map<String, dynamic> json) =>
      _$RiskAssessmentFromJson(json);
  
  Map<String, dynamic> toJson() => _$RiskAssessmentToJson(this);
  
  // Convenience getters
  HazardRisk? get floodRisk => hazardRisks['flood'];
  HazardRisk? get wildfireRisk => hazardRisks['wildfire'];
  HazardRisk? get heatRisk => hazardRisks['heat'];
  HazardRisk? get hurricaneRisk => hazardRisks['hurricane'];
  
  bool get hasHighRisk => overallRisk.score >= 70;
  bool get requiresFloodInsurance => 
      insuranceInfo?.floodInsurance.required == true;
      
  String get riskCategory {
    if (overallRisk.score < 30) return 'Low';
    if (overallRisk.score < 60) return 'Moderate';
    if (overallRisk.score < 80) return 'High';
    return 'Extreme';
  }
  
  Color get riskColor {
    switch (riskCategory) {
      case 'Low':
        return const Color(0xFF4CAF50);
      case 'Moderate':
        return const Color(0xFFFF9800);
      case 'High':
        return const Color(0xFFF44336);
      case 'Extreme':
        return const Color(0xFF9C27B0);
      default:
        return Colors.grey;
    }
  }
}

@JsonSerializable()
class HazardRisk {
  final int score;
  final String category;
  final String description;
  final Map<String, dynamic>? projections;
  final List<String>? mitigationRecommendations;
  
  const HazardRisk({
    required this.score,
    required this.category,
    required this.description,
    this.projections,
    this.mitigationRecommendations,
  });
  
  factory HazardRisk.fromJson(Map<String, dynamic> json) =>
      _$HazardRiskFromJson(json);
  
  Map<String, dynamic> toJson() => _$HazardRiskToJson(this);
}
```

## 🔄 State Management

### Risk Assessment Provider
```dart
// lib/providers/risk_provider.dart
import 'package:flutter/foundation.dart';

class RiskAssessmentProvider extends ChangeNotifier {
  final SeawaterApiService _apiService = SeawaterApiService();
  final CacheService _cacheService = CacheService();
  
  RiskAssessment? _currentAssessment;
  bool _isLoading = false;
  String? _error;
  List<Property> _savedProperties = [];
  
  // Getters
  RiskAssessment? get currentAssessment => _currentAssessment;
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Property> get savedProperties => _savedProperties;
  
  // Load risk assessment for address
  Future<void> loadRiskAssessment(
    String address, {
    List<String> sources = const ['fema'],
    bool includeProjections = false,
  }) async {
    _setLoading(true);
    _clearError();
    
    try {
      // Check cache first
      final cached = await _cacheService.getRiskAssessment(address);
      if (cached != null && !cached.isExpired) {
        _currentAssessment = cached.data;
        _setLoading(false);
        notifyListeners();
        return;
      }
      
      // Fetch from API
      final assessment = await _apiService.getPropertyRisk(
        address,
        sources: sources,
        includeProjections: includeProjections,
      );
      
      _currentAssessment = assessment;
      
      // Cache the result
      await _cacheService.cacheRiskAssessment(address, assessment);
      
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }
  
  // Compare multiple properties
  Future<List<RiskAssessment>> compareProperties(
    List<String> addresses,
  ) async {
    _setLoading(true);
    _clearError();
    
    try {
      final assessments = <RiskAssessment>[];
      
      for (final address in addresses) {
        final assessment = await _apiService.getPropertyRisk(address);
        assessments.add(assessment);
      }
      
      return assessments;
    } catch (e) {
      _setError(e.toString());
      return [];
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }
  
  // Save property for later
  Future<void> saveProperty(Property property) async {
    if (_savedProperties.any((p) => p.id == property.id)) return;
    
    _savedProperties.add(property);
    await _cacheService.saveFavoriteProperty(property);
    notifyListeners();
  }
  
  // Remove saved property
  Future<void> removeSavedProperty(String propertyId) async {
    _savedProperties.removeWhere((p) => p.id == propertyId);
    await _cacheService.removeFavoriteProperty(propertyId);
    notifyListeners();
  }
  
  // Load saved properties
  Future<void> loadSavedProperties() async {
    try {
      _savedProperties = await _cacheService.getFavoriteProperties();
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading saved properties: $e');
    }
  }
  
  void _setLoading(bool loading) {
    _isLoading = loading;
  }
  
  void _setError(String error) {
    _error = error;
  }
  
  void _clearError() {
    _error = null;
  }
  
  void clearCurrentAssessment() {
    _currentAssessment = null;
    notifyListeners();
  }
}
```

## 📦 Key Dependencies

```yaml
# pubspec.yaml
name: seawater_mobile
description: Climate Risk Assessment Mobile App
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # UI Framework & Design
  cupertino_icons: ^1.0.6
  flutter_native_splash: ^2.3.5
  animations: ^2.0.8
  
  # State Management
  provider: ^6.1.1
  
  # Networking & API
  dio: ^5.4.0
  dio_cache_interceptor: ^3.4.4
  dio_cache_interceptor_hive_store: ^3.2.2
  
  # Authentication
  amazon_cognito_identity_dart_2: ^3.6.0
  local_auth: ^2.1.8
  
  # Maps & Location
  mapbox_maps_flutter: ^1.0.0
  geolocator: ^10.1.0
  geocoding: ^2.1.1
  
  # Storage & Caching
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  sqflite: ^2.3.0
  
  # Data Serialization
  json_annotation: ^4.8.1
  freezed: ^2.4.7
  
  # Notifications
  firebase_messaging: ^14.7.9
  flutter_local_notifications: ^16.3.0
  
  # Charts & Visualization
  fl_chart: ^0.65.0
  syncfusion_flutter_charts: ^23.2.7
  
  # Utilities
  intl: ^0.18.1
  url_launcher: ^6.2.3
  connectivity_plus: ^5.0.2
  share_plus: ^7.2.1
  image_picker: ^1.0.7
  
  # Climate-specific
  weather: ^3.1.1
  timezone: ^0.9.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  
  # Code Generation
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
  hive_generator: ^2.0.1
  
  # Testing
  mockito: ^5.4.4
  integration_test:
    sdk: flutter
  
  # Linting
  flutter_lints: ^3.0.1

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/icons/
    - assets/maps/
    
  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

## 🚀 Development Workflow

### Initial Setup
```bash
# Install Flutter and verify installation
flutter doctor

# Create new Flutter project
flutter create seawater_mobile --org io.seawater
cd seawater_mobile

# Add dependencies
flutter pub add dio provider amazon_cognito_identity_dart_2 mapbox_maps_flutter

# Generate code
flutter packages pub run build_runner build

# Run on device
flutter run --debug
```

### Build Commands
```bash
# Development builds
flutter run --debug --dart-define=ENVIRONMENT=development
flutter run --profile --dart-define=ENVIRONMENT=staging

# Release builds
flutter build ios --release --dart-define=ENVIRONMENT=production
flutter build apk --release --dart-define=ENVIRONMENT=production
flutter build appbundle --release --dart-define=ENVIRONMENT=production
```

### Environment Configuration
```dart
// lib/config/environment.dart
class Environment {
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );
  
  static const bool isDevelopment = environment == 'development';
  static const bool isStaging = environment == 'staging';
  static const bool isProduction = environment == 'production';
  
  static String get apiBaseUrl {
    switch (environment) {
      case 'development':
        return 'https://dev-api.seawater.io/v1';
      case 'staging':
        return 'https://staging-api.seawater.io/v1';
      case 'production':
        return 'https://api.seawater.io/v1';
      default:
        return 'https://dev-api.seawater.io/v1';
    }
  }
  
  static String get mapboxToken {
    return const String.fromEnvironment('MAPBOX_ACCESS_TOKEN');
  }
  
  static String get cognitoUserPoolId {
    switch (environment) {
      case 'production':
        return 'us-east-2_PROD123';
      default:
        return 'us-east-2_DEV123';
    }
  }
}
```

## 📊 Performance Targets

- **App Size**: < 30MB (after optimization)
- **Cold Start**: < 2 seconds
- **Map Rendering**: < 1 second
- **API Response Time**: < 500ms (cached), < 2s (fresh)
- **Frame Rate**: Consistent 60fps
- **Memory Usage**: < 200MB average
- **Battery Impact**: Minimal background usage

## 🔧 Climate-Specific Features

### Offline Data Caching
```dart
// lib/services/offline_service.dart
class OfflineService {
  static const String offlineDbName = 'seawater_offline.db';
  
  Future<void> cacheEssentialData(double lat, double lng) async {
    // Cache basic risk data for offline access
    final nearbyData = await _apiService.getBasicRiskData(lat, lng);
    await _localDb.storeOfflineData(nearbyData);
  }
  
  Future<RiskAssessment?> getOfflineRiskData(String address) async {
    return await _localDb.getOfflineRiskData(address);
  }
}
```

### Real-time Risk Alerts
```dart
// lib/services/alert_service.dart
class RiskAlertService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  
  Future<void> subscribeToLocationAlerts(double lat, double lng) async {
    final topic = 'risk_alerts_${lat.toStringAsFixed(2)}_${lng.toStringAsFixed(2)}';
    await _fcm.subscribeToTopic(topic);
  }
  
  void handleRiskAlert(RemoteMessage message) {
    final riskLevel = message.data['risk_level'];
    final hazardType = message.data['hazard_type'];
    
    _showRiskNotification(riskLevel, hazardType);
  }
}
```

## 🎯 Next Steps

1. **Set up development environment**
   ```bash
   flutter doctor
   flutter create seawater_mobile
   ```

2. **Implement core authentication**
   - Cognito integration
   - Biometric authentication
   - Session management

3. **Build property search and risk assessment**
   - Address search with autocomplete
   - MapBox integration
   - Risk visualization

4. **Add climate-specific features**
   - Risk overlays
   - Offline caching
   - Push notifications

5. **Implement professional features**
   - Bulk analysis
   - Client management
   - Report generation

6. **Testing and optimization**
   - Unit tests
   - Integration tests
   - Performance optimization

---

*This guide is based on proven patterns from the HoneyDo mobile platform and tailored specifically for climate risk assessment workflows. Last updated: August 21, 2025*