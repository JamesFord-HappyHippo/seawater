# 🗺️ Seawater Mobile App - Location Services Integration Guide

## 🎯 Overview

This comprehensive guide covers the integration of location services, mapping, and geocoding capabilities for the Seawater Climate Risk Platform mobile application. The implementation combines MapBox for mapping and geocoding with device GPS for precise location detection.

### Location Services Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   MapBox API     │    │   Device GPS    │
│   (Flutter)     │◄──►│   • Geocoding    │◄──►│   • Location    │
│                 │    │   • Mapping      │    │   • Permissions │
│                 │    │   • Directions   │    │   • Accuracy    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────────────┐               │
         └──────────────►│ Climate Risk   │◄──────────────┘
                         │ Overlay Data   │
                         └────────────────┘
```

## 🔧 Dependencies and Setup

### Required Dependencies

```yaml
# pubspec.yaml
dependencies:
  # Core location services
  geolocator: ^10.1.0
  geocoding: ^2.1.1
  permission_handler: ^11.1.0
  
  # MapBox integration
  mapbox_maps_flutter: ^1.0.0
  
  # Additional mapping utilities
  latlong2: ^0.8.1
  maps_toolkit: ^2.0.1
  
  # HTTP client for API calls
  dio: ^5.4.0
```

### Android Configuration

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Location permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Internet permission for MapBox -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:label="Seawater"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">
        
        <!-- MapBox token -->
        <meta-data
            android:name="com.mapbox.token"
            android:value="@string/mapbox_access_token" />
            
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme" />
                
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
```

```xml
<!-- android/app/src/main/res/values/strings.xml -->
<resources>
    <string name="mapbox_access_token">YOUR_MAPBOX_ACCESS_TOKEN</string>
</resources>
```

### iOS Configuration

```xml
<!-- ios/Runner/Info.plist -->
<dict>
    <!-- Location permissions -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>Seawater needs location access to provide climate risk information for your current area</string>
    
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>Seawater needs location access to provide climate risk alerts and location-based features</string>
    
    <!-- MapBox token -->
    <key>MBXAccessToken</key>
    <string>YOUR_MAPBOX_ACCESS_TOKEN</string>
</dict>
```

## 📍 Location Services Implementation

### Location Service Class

```dart
// lib/services/location_service.dart
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:permission_handler/permission_handler.dart';

class LocationService {
  static const Duration locationTimeout = Duration(seconds: 15);
  static const double defaultRadius = 5000; // 5km radius
  
  /// Check and request location permissions
  Future<LocationPermissionResult> checkLocationPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionResult.serviceDisabled;
    }
    
    var permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return LocationPermissionResult.denied;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return LocationPermissionResult.deniedForever;
    }
    
    return LocationPermissionResult.granted;
  }
  
  /// Get current device location
  Future<LocationResult> getCurrentLocation({
    LocationAccuracy accuracy = LocationAccuracy.high,
    Duration? timeout,
  }) async {
    try {
      final permissionResult = await checkLocationPermission();
      if (permissionResult != LocationPermissionResult.granted) {
        return LocationResult.failure(LocationError.permissionDenied);
      }
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: accuracy,
        timeLimit: timeout ?? locationTimeout,
      );
      
      return LocationResult.success(
        SeawaterLocation(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          altitude: position.altitude,
          timestamp: position.timestamp ?? DateTime.now(),
        ),
      );
    } on LocationServiceDisabledException {
      return LocationResult.failure(LocationError.serviceDisabled);
    } on PermissionDeniedException {
      return LocationResult.failure(LocationError.permissionDenied);
    } on TimeoutException {
      return LocationResult.failure(LocationError.timeout);
    } catch (e) {
      return LocationResult.failure(LocationError.unknown);
    }
  }
  
  /// Get last known location (cached)
  Future<LocationResult> getLastKnownLocation() async {
    try {
      final permissionResult = await checkLocationPermission();
      if (permissionResult != LocationPermissionResult.granted) {
        return LocationResult.failure(LocationError.permissionDenied);
      }
      
      final position = await Geolocator.getLastKnownPosition();
      if (position == null) {
        return LocationResult.failure(LocationError.noLastKnownLocation);
      }
      
      return LocationResult.success(
        SeawaterLocation(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          altitude: position.altitude,
          timestamp: position.timestamp ?? DateTime.now(),
        ),
      );
    } catch (e) {
      return LocationResult.failure(LocationError.unknown);
    }
  }
  
  /// Stream of location updates
  Stream<LocationResult> getLocationStream({
    LocationAccuracy accuracy = LocationAccuracy.high,
    int distanceFilter = 10, // meters
    Duration interval = const Duration(seconds: 5),
  }) async* {
    final permissionResult = await checkLocationPermission();
    if (permissionResult != LocationPermissionResult.granted) {
      yield LocationResult.failure(LocationError.permissionDenied);
      return;
    }
    
    final locationSettings = LocationSettings(
      accuracy: accuracy,
      distanceFilter: distanceFilter,
      timeLimit: locationTimeout,
    );
    
    await for (final position in Geolocator.getPositionStream(
      locationSettings: locationSettings,
    )) {
      yield LocationResult.success(
        SeawaterLocation(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          altitude: position.altitude,
          timestamp: position.timestamp ?? DateTime.now(),
        ),
      );
    }
  }
  
  /// Calculate distance between two points
  double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }
  
  /// Calculate bearing between two points
  double calculateBearing(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.bearingBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }
  
  /// Check if location is within radius of center point
  bool isLocationWithinRadius(
    double centerLat,
    double centerLng,
    double targetLat,
    double targetLng,
    double radiusMeters,
  ) {
    final distance = calculateDistance(centerLat, centerLng, targetLat, targetLng);
    return distance <= radiusMeters;
  }
}
```

### Location Models

```dart
// lib/models/location.dart
import 'package:json_annotation/json_annotation.dart';

part 'location.g.dart';

@JsonSerializable()
class SeawaterLocation {
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? altitude;
  final DateTime timestamp;
  final String? address;
  final List<String>? addressComponents;
  
  const SeawaterLocation({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.altitude,
    required this.timestamp,
    this.address,
    this.addressComponents,
  });
  
  factory SeawaterLocation.fromJson(Map<String, dynamic> json) =>
      _$SeawaterLocationFromJson(json);
  
  Map<String, dynamic> toJson() => _$SeawaterLocationToJson(this);
  
  /// Create location from coordinates only
  factory SeawaterLocation.fromCoordinates(
    double latitude,
    double longitude,
  ) {
    return SeawaterLocation(
      latitude: latitude,
      longitude: longitude,
      timestamp: DateTime.now(),
    );
  }
  
  /// Get formatted coordinates string
  String get coordinatesString => '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
  
  /// Get short address (first line only)
  String get shortAddress {
    if (address == null) return coordinatesString;
    return address!.split(',').first.trim();
  }
  
  /// Check if location has good accuracy
  bool get hasGoodAccuracy => accuracy != null && accuracy! <= 100;
  
  /// Check if location is recent
  bool get isRecent {
    final now = DateTime.now();
    return now.difference(timestamp).inMinutes < 30;
  }
  
  SeawaterLocation copyWith({
    double? latitude,
    double? longitude,
    double? accuracy,
    double? altitude,
    DateTime? timestamp,
    String? address,
    List<String>? addressComponents,
  }) {
    return SeawaterLocation(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      altitude: altitude ?? this.altitude,
      timestamp: timestamp ?? this.timestamp,
      address: address ?? this.address,
      addressComponents: addressComponents ?? this.addressComponents,
    );
  }
}

sealed class LocationResult {
  const LocationResult();
  
  static LocationResult success(SeawaterLocation location) => LocationSuccess(location);
  static LocationResult failure(LocationError error) => LocationFailure(error);
}

class LocationSuccess extends LocationResult {
  final SeawaterLocation location;
  const LocationSuccess(this.location);
}

class LocationFailure extends LocationResult {
  final LocationError error;
  const LocationFailure(this.error);
}

enum LocationPermissionResult {
  granted,
  denied,
  deniedForever,
  serviceDisabled,
}

enum LocationError {
  permissionDenied,
  serviceDisabled,
  timeout,
  noLastKnownLocation,
  unknown,
}

extension LocationErrorExtension on LocationError {
  String get message {
    switch (this) {
      case LocationError.permissionDenied:
        return 'Location permission denied. Please enable location access in settings.';
      case LocationError.serviceDisabled:
        return 'Location services are disabled. Please enable location services.';
      case LocationError.timeout:
        return 'Location request timed out. Please try again.';
      case LocationError.noLastKnownLocation:
        return 'No last known location available.';
      case LocationError.unknown:
        return 'An unknown error occurred while getting location.';
    }
  }
  
  bool get isRetryable {
    switch (this) {
      case LocationError.timeout:
      case LocationError.unknown:
        return true;
      default:
        return false;
    }
  }
}
```

## 🗺️ MapBox Integration

### MapBox Configuration

```dart
// lib/config/mapbox_config.dart
class MapBoxConfig {
  static const String accessToken = String.fromEnvironment(
    'MAPBOX_ACCESS_TOKEN',
    defaultValue: '', // Will be replaced with actual token
  );
  
  // Map styles
  static const String lightStyle = 'mapbox://styles/mapbox/light-v11';
  static const String satelliteStyle = 'mapbox://styles/mapbox/satellite-v9';
  static const String outdoorsStyle = 'mapbox://styles/mapbox/outdoors-v12';
  
  // Climate risk overlay styles (custom Seawater styles)
  static const Map<String, String> riskOverlayStyles = {
    'flood': 'mapbox://styles/seawater/flood-risk-cl234567',
    'wildfire': 'mapbox://styles/seawater/wildfire-risk-cl234568',
    'heat': 'mapbox://styles/seawater/heat-risk-cl234569',
    'hurricane': 'mapbox://styles/seawater/hurricane-risk-cl234570',
  };
  
  // Default map configuration
  static const double defaultZoom = 12.0;
  static const double minZoom = 3.0;
  static const double maxZoom = 20.0;
  
  // Risk visualization colors
  static const Map<String, String> riskColors = {
    'low': '#4CAF50',      // Green
    'moderate': '#FF9800', // Orange
    'high': '#F44336',     // Red
    'extreme': '#9C27B0',  // Purple
  };
  
  // Geocoding configuration
  static const String geocodingBaseUrl = 'https://api.mapbox.com/geocoding/v5';
  static const String directionsBaseUrl = 'https://api.mapbox.com/directions/v5';
  static const int maxGeocodingResults = 5;
  static const String countryBias = 'us'; // Bias towards US results
}
```

### Geocoding Service

```dart
// lib/services/geocoding_service.dart
import 'package:dio/dio.dart';
import 'package:geocoding/geocoding.dart' as native_geocoding;

class SeawaterGeocodingService {
  final Dio _dio = Dio();
  
  /// Search for addresses using MapBox Geocoding API
  Future<GeocodingResult> searchAddresses(
    String query, {
    SeawaterLocation? proximity,
    List<String> types = const [],
    int limit = 5,
  }) async {
    try {
      final params = <String, dynamic>{
        'access_token': MapBoxConfig.accessToken,
        'limit': limit,
        'country': MapBoxConfig.countryBias,
        'autocomplete': true,
        'fuzzyMatch': true,
      };
      
      if (proximity != null) {
        params['proximity'] = '${proximity.longitude},${proximity.latitude}';
      }
      
      if (types.isNotEmpty) {
        params['types'] = types.join(',');
      }
      
      final response = await _dio.get(
        '${MapBoxConfig.geocodingBaseUrl}/mapbox.places/${Uri.encodeComponent(query)}.json',
        queryParameters: params,
      );
      
      if (response.statusCode == 200) {
        final data = response.data;
        final features = data['features'] as List;
        
        final suggestions = features.map((feature) {
          final geometry = feature['geometry'];
          final coordinates = geometry['coordinates'];
          final placeName = feature['place_name'];
          final context = feature['context'] as List?;
          
          return AddressSuggestion(
            placeName: placeName,
            location: SeawaterLocation.fromCoordinates(
              coordinates[1], // latitude
              coordinates[0], // longitude
            ),
            context: context?.map((c) => c['text'] as String).toList() ?? [],
            relevance: (feature['relevance'] as num?)?.toDouble() ?? 0.0,
          );
        }).toList();
        
        return GeocodingResult.success(suggestions);
      } else {
        return GeocodingResult.failure(GeocodingError.apiError);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 429) {
        return GeocodingResult.failure(GeocodingError.rateLimited);
      }
      return GeocodingResult.failure(GeocodingError.networkError);
    } catch (e) {
      return GeocodingResult.failure(GeocodingError.unknown);
    }
  }
  
  /// Reverse geocode coordinates to address
  Future<GeocodingResult> reverseGeocode(
    double latitude,
    double longitude,
  ) async {
    try {
      // Try MapBox first for better results
      final mapboxResult = await _reverseGeocodeMapBox(latitude, longitude);
      if (mapboxResult is GeocodingSuccess) {
        return mapboxResult;
      }
      
      // Fallback to native geocoding
      return await _reverseGeocodeNative(latitude, longitude);
    } catch (e) {
      return GeocodingResult.failure(GeocodingError.unknown);
    }
  }
  
  Future<GeocodingResult> _reverseGeocodeMapBox(
    double latitude,
    double longitude,
  ) async {
    try {
      final response = await _dio.get(
        '${MapBoxConfig.geocodingBaseUrl}/mapbox.places/${longitude},${latitude}.json',
        queryParameters: {
          'access_token': MapBoxConfig.accessToken,
          'types': 'address,poi',
          'limit': 1,
        },
      );
      
      if (response.statusCode == 200) {
        final data = response.data;
        final features = data['features'] as List;
        
        if (features.isNotEmpty) {
          final feature = features.first;
          final placeName = feature['place_name'];
          final context = feature['context'] as List?;
          
          final suggestion = AddressSuggestion(
            placeName: placeName,
            location: SeawaterLocation.fromCoordinates(latitude, longitude),
            context: context?.map((c) => c['text'] as String).toList() ?? [],
            relevance: 1.0,
          );
          
          return GeocodingResult.success([suggestion]);
        }
      }
      
      return GeocodingResult.failure(GeocodingError.noResults);
    } catch (e) {
      return GeocodingResult.failure(GeocodingError.apiError);
    }
  }
  
  Future<GeocodingResult> _reverseGeocodeNative(
    double latitude,
    double longitude,
  ) async {
    try {
      final placemarks = await native_geocoding.placemarkFromCoordinates(
        latitude,
        longitude,
      );
      
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        final address = [
          placemark.streetNumber,
          placemark.street,
          placemark.locality,
          placemark.administrativeArea,
          placemark.postalCode,
        ].where((part) => part?.isNotEmpty == true).join(', ');
        
        final suggestion = AddressSuggestion(
          placeName: address,
          location: SeawaterLocation.fromCoordinates(latitude, longitude),
          context: [
            placemark.locality,
            placemark.administrativeArea,
            placemark.country,
          ].where((part) => part?.isNotEmpty == true).cast<String>().toList(),
          relevance: 1.0,
        );
        
        return GeocodingResult.success([suggestion]);
      }
      
      return GeocodingResult.failure(GeocodingError.noResults);
    } catch (e) {
      return GeocodingResult.failure(GeocodingError.unknown);
    }
  }
  
  /// Get nearby points of interest
  Future<GeocodingResult> getNearbyPOIs(
    double latitude,
    double longitude, {
    double radiusKm = 5.0,
    List<String> categories = const ['building', 'address'],
  }) async {
    try {
      final response = await _dio.get(
        '${MapBoxConfig.geocodingBaseUrl}/mapbox.places/${longitude},${latitude}.json',
        queryParameters: {
          'access_token': MapBoxConfig.accessToken,
          'types': categories.join(','),
          'limit': 10,
          'radius': (radiusKm * 1000).round(), // Convert to meters
        },
      );
      
      if (response.statusCode == 200) {
        final data = response.data;
        final features = data['features'] as List;
        
        final suggestions = features.map((feature) {
          final geometry = feature['geometry'];
          final coordinates = geometry['coordinates'];
          final placeName = feature['place_name'];
          final context = feature['context'] as List?;
          
          return AddressSuggestion(
            placeName: placeName,
            location: SeawaterLocation.fromCoordinates(
              coordinates[1], // latitude
              coordinates[0], // longitude
            ),
            context: context?.map((c) => c['text'] as String).toList() ?? [],
            relevance: (feature['relevance'] as num?)?.toDouble() ?? 0.0,
          );
        }).toList();
        
        return GeocodingResult.success(suggestions);
      }
      
      return GeocodingResult.failure(GeocodingError.noResults);
    } catch (e) {
      return GeocodingResult.failure(GeocodingError.unknown);
    }
  }
}

// Geocoding result models
@JsonSerializable()
class AddressSuggestion {
  final String placeName;
  final SeawaterLocation location;
  final List<String> context;
  final double relevance;
  
  const AddressSuggestion({
    required this.placeName,
    required this.location,
    required this.context,
    required this.relevance,
  });
  
  factory AddressSuggestion.fromJson(Map<String, dynamic> json) =>
      _$AddressSuggestionFromJson(json);
  
  Map<String, dynamic> toJson() => _$AddressSuggestionToJson(this);
  
  String get shortName {
    return placeName.split(',').first.trim();
  }
  
  String get cityState {
    if (context.length >= 2) {
      return '${context[0]}, ${context[1]}';
    }
    return context.isNotEmpty ? context.first : '';
  }
}

sealed class GeocodingResult {
  const GeocodingResult();
  
  static GeocodingResult success(List<AddressSuggestion> suggestions) =>
      GeocodingSuccess(suggestions);
  static GeocodingResult failure(GeocodingError error) =>
      GeocodingFailure(error);
}

class GeocodingSuccess extends GeocodingResult {
  final List<AddressSuggestion> suggestions;
  const GeocodingSuccess(this.suggestions);
}

class GeocodingFailure extends GeocodingResult {
  final GeocodingError error;
  const GeocodingFailure(this.error);
}

enum GeocodingError {
  apiError,
  networkError,
  rateLimited,
  noResults,
  unknown,
}
```

## 🎨 UI Components

### Address Search Widget

```dart
// lib/widgets/search/address_search_widget.dart
class AddressSearchWidget extends StatefulWidget {
  final String? initialValue;
  final Function(AddressSuggestion) onAddressSelected;
  final Function(String)? onSearchChanged;
  final String hintText;
  final bool enabled;
  final Widget? leadingIcon;
  final Widget? trailingIcon;
  
  const AddressSearchWidget({
    Key? key,
    this.initialValue,
    required this.onAddressSelected,
    this.onSearchChanged,
    this.hintText = 'Search for an address...',
    this.enabled = true,
    this.leadingIcon,
    this.trailingIcon,
  }) : super(key: key);

  @override
  State<AddressSearchWidget> createState() => _AddressSearchWidgetState();
}

class _AddressSearchWidgetState extends State<AddressSearchWidget> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  final LocationService _locationService = LocationService();
  final SeawaterGeocodingService _geocodingService = SeawaterGeocodingService();
  
  Timer? _debounceTimer;
  List<AddressSuggestion> _suggestions = [];
  bool _isSearching = false;
  bool _showSuggestions = false;
  SeawaterLocation? _currentLocation;
  
  @override
  void initState() {
    super.initState();
    
    if (widget.initialValue != null) {
      _controller.text = widget.initialValue!;
    }
    
    _controller.addListener(_onSearchChanged);
    _focusNode.addListener(_onFocusChanged);
    
    // Get current location for proximity bias
    _getCurrentLocation();
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Search input field
        TextField(
          controller: _controller,
          focusNode: _focusNode,
          enabled: widget.enabled,
          decoration: InputDecoration(
            hintText: widget.hintText,
            prefixIcon: widget.leadingIcon ?? const Icon(Icons.search),
            suffixIcon: _buildSuffixIcon(),
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
          ),
          onSubmitted: _onSearchSubmitted,
        ),
        
        // Suggestions dropdown
        if (_showSuggestions && _suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                for (int i = 0; i < _suggestions.length; i++)
                  _buildSuggestionTile(_suggestions[i], i == _suggestions.length - 1),
              ],
            ),
          ),
          
        // Current location option
        if (_showSuggestions && _currentLocation != null)
          Container(
            margin: const EdgeInsets.only(top: 4),
            child: ListTile(
              leading: const Icon(Icons.my_location, color: Colors.blue),
              title: const Text('Use Current Location'),
              subtitle: Text(_currentLocation!.coordinatesString),
              onTap: _useCurrentLocation,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
      ],
    );
  }
  
  Widget? _buildSuffixIcon() {
    if (_isSearching) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    
    if (_controller.text.isNotEmpty) {
      return IconButton(
        icon: const Icon(Icons.clear),
        onPressed: _clearSearch,
      );
    }
    
    return widget.trailingIcon;
  }
  
  Widget _buildSuggestionTile(AddressSuggestion suggestion, bool isLast) {
    return ListTile(
      title: Text(
        suggestion.shortName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        suggestion.cityState,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.bodySmall,
      ),
      leading: Icon(
        Icons.location_on,
        color: Theme.of(context).primaryColor,
      ),
      trailing: Text(
        '${(suggestion.relevance * 100).round()}%',
        style: Theme.of(context).textTheme.caption,
      ),
      onTap: () => _selectSuggestion(suggestion),
      shape: isLast
          ? null
          : Border(
              bottom: BorderSide(
                color: Theme.of(context).dividerColor,
                width: 0.5,
              ),
            ),
    );
  }
  
  void _onSearchChanged() {
    final query = _controller.text.trim();
    
    widget.onSearchChanged?.call(query);
    
    // Cancel previous search
    _debounceTimer?.cancel();
    
    if (query.isEmpty) {
      setState(() {
        _suggestions.clear();
        _showSuggestions = false;
      });
      return;
    }
    
    // Debounce search requests
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _performSearch(query);
    });
  }
  
  void _onFocusChanged() {
    if (_focusNode.hasFocus && _controller.text.isNotEmpty) {
      setState(() {
        _showSuggestions = true;
      });
    } else {
      // Delay hiding suggestions to allow for tap selection
      Timer(const Duration(milliseconds: 150), () {
        if (mounted) {
          setState(() {
            _showSuggestions = false;
          });
        }
      });
    }
  }
  
  Future<void> _performSearch(String query) async {
    if (!mounted) return;
    
    setState(() {
      _isSearching = true;
    });
    
    try {
      final result = await _geocodingService.searchAddresses(
        query,
        proximity: _currentLocation,
        limit: 5,
      );
      
      if (mounted) {
        setState(() {
          _isSearching = false;
          if (result is GeocodingSuccess) {
            _suggestions = result.suggestions;
            _showSuggestions = _suggestions.isNotEmpty && _focusNode.hasFocus;
          } else {
            _suggestions.clear();
            _showSuggestions = false;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _suggestions.clear();
          _showSuggestions = false;
        });
      }
    }
  }
  
  void _onSearchSubmitted(String value) {
    _focusNode.unfocus();
    if (_suggestions.isNotEmpty) {
      _selectSuggestion(_suggestions.first);
    }
  }
  
  void _selectSuggestion(AddressSuggestion suggestion) {
    _controller.text = suggestion.placeName;
    setState(() {
      _showSuggestions = false;
    });
    _focusNode.unfocus();
    widget.onAddressSelected(suggestion);
  }
  
  void _clearSearch() {
    _controller.clear();
    setState(() {
      _suggestions.clear();
      _showSuggestions = false;
    });
    _focusNode.requestFocus();
  }
  
  void _useCurrentLocation() async {
    if (_currentLocation == null) return;
    
    setState(() {
      _isSearching = true;
      _showSuggestions = false;
    });
    
    // Reverse geocode current location
    final result = await _geocodingService.reverseGeocode(
      _currentLocation!.latitude,
      _currentLocation!.longitude,
    );
    
    if (mounted) {
      setState(() {
        _isSearching = false;
      });
      
      if (result is GeocodingSuccess && result.suggestions.isNotEmpty) {
        final suggestion = result.suggestions.first;
        _controller.text = suggestion.placeName;
        widget.onAddressSelected(suggestion);
      }
    }
  }
  
  Future<void> _getCurrentLocation() async {
    final result = await _locationService.getCurrentLocation();
    if (result is LocationSuccess) {
      _currentLocation = result.location;
    }
  }
  
  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }
}
```

### Interactive Map Widget

```dart
// lib/widgets/map/seawater_map_widget.dart
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';

class SeawaterMapWidget extends StatefulWidget {
  final SeawaterLocation? center;
  final double zoom;
  final String? riskOverlay;
  final List<PropertyMarker> markers;
  final Function(SeawaterLocation)? onLocationTap;
  final Function(SeawaterLocation)? onLocationLongPress;
  final Function(double)? onZoomChanged;
  final bool showUserLocation;
  final bool allowInteraction;
  
  const SeawaterMapWidget({
    Key? key,
    this.center,
    this.zoom = MapBoxConfig.defaultZoom,
    this.riskOverlay,
    this.markers = const [],
    this.onLocationTap,
    this.onLocationLongPress,
    this.onZoomChanged,
    this.showUserLocation = true,
    this.allowInteraction = true,
  }) : super(key: key);

  @override
  State<SeawaterMapWidget> createState() => _SeawaterMapWidgetState();
}

class _SeawaterMapWidgetState extends State<SeawaterMapWidget> {
  MapboxMap? _mapboxMap;
  PointAnnotationManager? _annotationManager;
  final LocationService _locationService = LocationService();
  
  SeawaterLocation? _userLocation;
  StreamSubscription<LocationResult>? _locationSubscription;
  
  @override
  void initState() {
    super.initState();
    if (widget.showUserLocation) {
      _startLocationTracking();
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return MapWidget(
      key: ValueKey('seawater_map'),
      cameraOptions: CameraOptions(
        center: _getCenterPoint(),
        zoom: widget.zoom,
      ),
      styleUri: MapBoxConfig.lightStyle,
      textureView: true,
      onMapCreated: _onMapCreated,
      onTapListener: _onMapTap,
      onLongTapListener: _onMapLongPress,
      onCameraChangeListener: _onCameraChange,
    );
  }
  
  Point _getCenterPoint() {
    if (widget.center != null) {
      return Point(
        coordinates: Position(
          widget.center!.longitude,
          widget.center!.latitude,
        ),
      );
    }
    
    if (_userLocation != null) {
      return Point(
        coordinates: Position(
          _userLocation!.longitude,
          _userLocation!.latitude,
        ),
      );
    }
    
    // Default to US center
    return Point(coordinates: Position(-98.5795, 39.8283));
  }
  
  Future<void> _onMapCreated(MapboxMap mapboxMap) async {
    _mapboxMap = mapboxMap;
    
    // Set up map interaction settings
    await _setupMapSettings();
    
    // Add risk overlay if specified
    if (widget.riskOverlay != null) {
      await _addRiskOverlay(widget.riskOverlay!);
    }
    
    // Create annotation manager for markers
    _annotationManager = await _mapboxMap!.annotations.createPointAnnotationManager();
    
    // Add property markers
    await _addPropertyMarkers();
    
    // Add user location marker if available
    if (_userLocation != null) {
      await _addUserLocationMarker();
    }
  }
  
  Future<void> _setupMapSettings() async {
    if (_mapboxMap == null) return;
    
    // Configure gestures
    await _mapboxMap!.gestures.updateSettings(GesturesSettings(
      rotateEnabled: widget.allowInteraction,
      pitchEnabled: widget.allowInteraction,
      scrollEnabled: widget.allowInteraction,
      simultaneousRotateAndPinchToZoomEnabled: widget.allowInteraction,
      quickZoomEnabled: widget.allowInteraction,
    ));
    
    // Configure attribution
    await _mapboxMap!.attribution.updateSettings(AttributionSettings(
      enabled: true,
      position: OrnamentPosition.BOTTOM_RIGHT,
    ));
    
    // Configure compass
    await _mapboxMap!.compass.updateSettings(CompassSettings(
      enabled: true,
      position: OrnamentPosition.TOP_RIGHT,
    ));
    
    // Configure scale bar
    await _mapboxMap!.scaleBar.updateSettings(ScaleBarSettings(
      enabled: true,
      position: OrnamentPosition.BOTTOM_LEFT,
    ));
  }
  
  Future<void> _addRiskOverlay(String riskType) async {
    if (_mapboxMap == null) return;
    
    final overlayStyle = MapBoxConfig.riskOverlayStyles[riskType];
    if (overlayStyle == null) return;
    
    try {
      // Add raster source for risk overlay
      await _mapboxMap!.style.addSource(RasterSource(
        id: '${riskType}_risk_source',
        tiles: [overlayStyle],
        tileSize: 256,
      ));
      
      // Add raster layer
      await _mapboxMap!.style.addLayer(RasterLayer(
        id: '${riskType}_risk_layer',
        sourceId: '${riskType}_risk_source',
        rasterOpacity: 0.6,
      ));
    } catch (e) {
      debugPrint('Error adding risk overlay: $e');
    }
  }
  
  Future<void> _addPropertyMarkers() async {
    if (_mapboxMap == null || _annotationManager == null) return;
    
    final annotations = <PointAnnotation>[];
    
    for (final marker in widget.markers) {
      final annotation = PointAnnotation(
        id: marker.id,
        point: Point(
          coordinates: Position(
            marker.location.longitude,
            marker.location.latitude,
          ),
        ),
        iconImage: _getRiskMarkerIcon(marker.riskLevel),
        iconSize: 1.2,
        iconOffset: [0.0, -12.0], // Offset to center pin on location
      );
      
      annotations.add(annotation);
    }
    
    await _annotationManager!.createMulti(annotations);
  }
  
  Future<void> _addUserLocationMarker() async {
    if (_mapboxMap == null || 
        _annotationManager == null || 
        _userLocation == null) return;
    
    try {
      final userAnnotation = PointAnnotation(
        id: 'user_location',
        point: Point(
          coordinates: Position(
            _userLocation!.longitude,
            _userLocation!.latitude,
          ),
        ),
        iconImage: 'user-location-marker',
        iconSize: 1.0,
      );
      
      await _annotationManager!.create(userAnnotation);
    } catch (e) {
      debugPrint('Error adding user location marker: $e');
    }
  }
  
  String _getRiskMarkerIcon(String riskLevel) {
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
  
  void _onMapTap(ScreenCoordinate coordinate) async {
    if (_mapboxMap == null || widget.onLocationTap == null) return;
    
    try {
      final point = await _mapboxMap!.coordinateForPixel(coordinate);
      final location = SeawaterLocation.fromCoordinates(
        point.coordinates.lat,
        point.coordinates.lng,
      );
      
      widget.onLocationTap!(location);
    } catch (e) {
      debugPrint('Error handling map tap: $e');
    }
  }
  
  void _onMapLongPress(ScreenCoordinate coordinate) async {
    if (_mapboxMap == null || widget.onLocationLongPress == null) return;
    
    try {
      final point = await _mapboxMap!.coordinateForPixel(coordinate);
      final location = SeawaterLocation.fromCoordinates(
        point.coordinates.lat,
        point.coordinates.lng,
      );
      
      widget.onLocationLongPress!(location);
    } catch (e) {
      debugPrint('Error handling map long press: $e');
    }
  }
  
  void _onCameraChange(CameraChangedEventData data) {
    if (widget.onZoomChanged != null && data.cameraState.zoom != widget.zoom) {
      widget.onZoomChanged!(data.cameraState.zoom);
    }
  }
  
  Future<void> _startLocationTracking() async {
    _locationSubscription = _locationService.getLocationStream(
      accuracy: LocationAccuracy.balanced,
      distanceFilter: 50, // Update every 50 meters
    ).listen((result) {
      if (result is LocationSuccess) {
        _userLocation = result.location;
        if (_mapboxMap != null && _annotationManager != null) {
          _addUserLocationMarker();
        }
      }
    });
  }
  
  // Public methods for map control
  Future<void> animateToLocation(
    SeawaterLocation location, {
    double? zoom,
    Duration duration = const Duration(milliseconds: 1000),
  }) async {
    if (_mapboxMap == null) return;
    
    await _mapboxMap!.flyTo(
      CameraOptions(
        center: Point(
          coordinates: Position(location.longitude, location.latitude),
        ),
        zoom: zoom ?? widget.zoom,
      ),
      MapAnimationOptions(duration: duration.inMilliseconds),
    );
  }
  
  Future<void> updateRiskOverlay(String? riskType) async {
    if (_mapboxMap == null) return;
    
    // Remove existing risk overlay
    try {
      await _mapboxMap!.style.removeLayer('${widget.riskOverlay}_risk_layer');
      await _mapboxMap!.style.removeSource('${widget.riskOverlay}_risk_source');
    } catch (e) {
      // Layer might not exist
    }
    
    // Add new overlay if specified
    if (riskType != null) {
      await _addRiskOverlay(riskType);
    }
  }
  
  @override
  void dispose() {
    _locationSubscription?.cancel();
    super.dispose();
  }
}

// Property marker model
@JsonSerializable()
class PropertyMarker {
  final String id;
  final SeawaterLocation location;
  final String address;
  final String riskLevel;
  final int riskScore;
  final Map<String, dynamic>? metadata;
  
  const PropertyMarker({
    required this.id,
    required this.location,
    required this.address,
    required this.riskLevel,
    required this.riskScore,
    this.metadata,
  });
  
  factory PropertyMarker.fromJson(Map<String, dynamic> json) =>
      _$PropertyMarkerFromJson(json);
  
  Map<String, dynamic> toJson() => _$PropertyMarkerToJson(this);
}
```

## 🔒 Privacy and Permissions

### Permission Manager

```dart
// lib/services/permission_manager.dart
import 'package:permission_handler/permission_handler.dart';

class PermissionManager {
  /// Request location permission with rationale
  static Future<LocationPermissionStatus> requestLocationPermission({
    bool showRationale = true,
  }) async {
    // Check if permission is already granted
    final status = await Permission.location.status;
    if (status.isGranted) {
      return LocationPermissionStatus.granted;
    }
    
    // Show rationale if needed
    if (showRationale && status.isDenied) {
      final shouldRequest = await _showLocationRationale();
      if (!shouldRequest) {
        return LocationPermissionStatus.denied;
      }
    }
    
    // Request permission
    final result = await Permission.location.request();
    
    switch (result) {
      case PermissionStatus.granted:
        return LocationPermissionStatus.granted;
      case PermissionStatus.denied:
        return LocationPermissionStatus.denied;
      case PermissionStatus.permanentlyDenied:
        return LocationPermissionStatus.permanentlyDenied;
      case PermissionStatus.restricted:
        return LocationPermissionStatus.restricted;
      default:
        return LocationPermissionStatus.denied;
    }
  }
  
  /// Check if we should request precise location
  static Future<bool> shouldRequestPreciseLocation() async {
    if (Platform.isIOS) {
      final status = await Permission.location.status;
      return status == PermissionStatus.granted;
    }
    return true; // Android always provides precise location if granted
  }
  
  /// Open app settings for permission management
  static Future<void> openLocationSettings() async {
    await openAppSettings();
  }
  
  static Future<bool> _showLocationRationale() async {
    // This would show a dialog explaining why location is needed
    // Implementation depends on your app's UI framework
    return true; // Placeholder
  }
}

enum LocationPermissionStatus {
  granted,
  denied,
  permanentlyDenied,
  restricted,
}
```

## 📊 Performance Optimization

### Location Caching Strategy

```dart
// lib/services/location_cache_service.dart
class LocationCacheService {
  static const String _cacheKey = 'location_cache';
  static const Duration _cacheExpiry = Duration(minutes: 30);
  
  final SharedPreferences _prefs;
  
  LocationCacheService(this._prefs);
  
  /// Cache location data
  Future<void> cacheLocation(SeawaterLocation location) async {
    final data = {
      'location': location.toJson(),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    
    await _prefs.setString(_cacheKey, jsonEncode(data));
  }
  
  /// Get cached location if still valid
  Future<SeawaterLocation?> getCachedLocation() async {
    final dataString = _prefs.getString(_cacheKey);
    if (dataString == null) return null;
    
    try {
      final data = jsonDecode(dataString);
      final timestamp = DateTime.fromMillisecondsSinceEpoch(data['timestamp']);
      
      // Check if cache is still valid
      if (DateTime.now().difference(timestamp) > _cacheExpiry) {
        await clearCache();
        return null;
      }
      
      return SeawaterLocation.fromJson(data['location']);
    } catch (e) {
      await clearCache();
      return null;
    }
  }
  
  /// Clear location cache
  Future<void> clearCache() async {
    await _prefs.remove(_cacheKey);
  }
}
```

## 🧪 Testing

### Location Service Tests

```dart
// test/services/location_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('LocationService', () {
    late LocationService locationService;
    
    setUp(() {
      locationService = LocationService();
    });
    
    group('getCurrentLocation', () {
      test('should return success when location is available', () async {
        // Test implementation would mock Geolocator
        // and verify location retrieval logic
      });
      
      test('should return permission denied when location is not permitted', () async {
        // Test permission handling
      });
      
      test('should return timeout error when location takes too long', () async {
        // Test timeout handling
      });
    });
    
    group('calculateDistance', () {
      test('should calculate correct distance between two points', () {
        const lat1 = 40.7589; // New York
        const lng1 = -73.9851;
        const lat2 = 34.0522; // Los Angeles
        const lng2 = -118.2437;
        
        final distance = locationService.calculateDistance(lat1, lng1, lat2, lng2);
        
        // Distance should be approximately 3944 km
        expect(distance, greaterThan(3900000));
        expect(distance, lessThan(4000000));
      });
    });
  });
}
```

## 🚀 Production Considerations

### Performance Monitoring
- Track location accuracy and response times
- Monitor MapBox API usage and costs
- Log geocoding success/failure rates

### Error Handling
- Graceful degradation when location services are unavailable
- Fallback to manual address entry
- Retry logic for network failures

### Privacy Compliance
- Clear privacy policy regarding location data usage
- Opt-in location tracking for non-essential features
- Data retention policies for location history

---

*This location services integration guide provides a comprehensive foundation for implementing location-aware features in the Seawater mobile application, enabling precise climate risk assessment based on user location and property addresses.*