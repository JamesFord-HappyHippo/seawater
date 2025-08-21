# 🌍 Seawater Climate Data API Integration Patterns

## 🎯 Overview

This document outlines comprehensive patterns for integrating multiple climate data sources into the Seawater platform, including both free government sources and premium APIs. The patterns are based on the existing backend architecture and enhanced for mobile-first access.

### Integration Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   API Gateway    │    │  Data Sources   │
│   (Flutter)     │◄──►│   • Routing      │◄──►│   • FEMA NRI    │
│                 │    │   • Rate Limit   │    │   • NOAA CDO    │
│                 │    │   • Cache        │    │   • USGS        │
│                 │    │   • Auth         │    │   • FirstStreet │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────────────┐               │
         └──────────────►│ Integration    │◄──────────────┘
                         │ Layer          │
                         │ • Health Mon   │
                         │ • Retry Logic  │
                         │ • Data Fusion  │
                         └────────────────┘
```

## 🏗️ Core Integration Patterns

### 1. Abstract Data Source Client

```typescript
// lib/services/data_sources/abstract_data_source.dart
abstract class AbstractDataSource {
  final String sourceName;
  final String baseUrl;
  final Duration timeout;
  final int maxRetries;
  final CacheManager? cacheManager;
  final RateLimiter? rateLimiter;
  
  // Health monitoring
  final HealthMetrics _healthMetrics = HealthMetrics();
  
  AbstractDataSource({
    required this.sourceName,
    required this.baseUrl,
    this.timeout = const Duration(seconds: 30),
    this.maxRetries = 3,
    this.cacheManager,
    this.rateLimiter,
  });
  
  /// Make authenticated API request with retry logic
  Future<ApiResponse<T>> makeRequest<T>({
    required String endpoint,
    required T Function(Map<String, dynamic>) parser,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    Duration? cacheTtl,
  }) async {
    final stopwatch = Stopwatch()..start();
    
    try {
      // Check rate limits
      if (rateLimiter != null) {
        await rateLimiter!.waitForAvailability();
      }
      
      // Build cache key
      final cacheKey = _buildCacheKey(endpoint, queryParams);
      
      // Check cache first
      if (cacheManager != null && cacheTtl != null) {
        final cached = await cacheManager!.get<T>(cacheKey);
        if (cached != null) {
          _healthMetrics.recordCacheHit();
          return ApiResponse.success(cached, fromCache: true);
        }
      }
      
      // Make HTTP request with retry logic
      final response = await _makeHttpRequestWithRetry(
        endpoint: endpoint,
        queryParams: queryParams,
        headers: headers,
      );
      
      // Parse response
      final data = parser(response.data);
      
      // Cache response if successful
      if (cacheManager != null && cacheTtl != null) {
        await cacheManager!.set(cacheKey, data, ttl: cacheTtl);
      }
      
      _healthMetrics.recordSuccess(stopwatch.elapsedMilliseconds);
      
      return ApiResponse.success(data, fromCache: false);
      
    } on DataSourceException catch (e) {
      _healthMetrics.recordError(e, stopwatch.elapsedMilliseconds);
      return ApiResponse.failure(e);
    } catch (e) {
      final exception = DataSourceException(
        source: sourceName,
        message: e.toString(),
        type: DataSourceErrorType.unknown,
      );
      _healthMetrics.recordError(exception, stopwatch.elapsedMilliseconds);
      return ApiResponse.failure(exception);
    }
  }
  
  /// Get health metrics for this data source
  HealthMetrics getHealthMetrics() => _healthMetrics;
  
  /// Test connection to data source
  Future<bool> testConnection();
  
  /// Get available endpoints for this source
  List<String> getAvailableEndpoints();
  
  Future<http.Response> _makeHttpRequestWithRetry({
    required String endpoint,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
  }) async {
    Exception? lastException;
    
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        final uri = _buildUri(endpoint, queryParams);
        final requestHeaders = _buildHeaders(headers);
        
        final response = await http.get(uri, headers: requestHeaders)
            .timeout(timeout);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return response;
        } else {
          throw HttpException(
            'HTTP ${response.statusCode}: ${response.reasonPhrase}',
            uri: uri,
          );
        }
        
      } catch (e) {
        lastException = e is Exception ? e : Exception(e.toString());
        
        if (attempt < maxRetries) {
          // Exponential backoff
          final delay = Duration(milliseconds: 1000 * pow(2, attempt).toInt());
          await Future.delayed(delay);
        }
      }
    }
    
    throw DataSourceException(
      source: sourceName,
      message: 'Request failed after ${maxRetries + 1} attempts: ${lastException.toString()}',
      type: DataSourceErrorType.networkError,
      originalException: lastException,
    );
  }
  
  Uri _buildUri(String endpoint, Map<String, dynamic>? queryParams) {
    final uri = Uri.parse('$baseUrl$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(queryParameters: queryParams.map(
        (key, value) => MapEntry(key, value.toString()),
      ));
    }
    return uri;
  }
  
  Map<String, String> _buildHeaders(Map<String, String>? headers) {
    final defaultHeaders = {
      'Accept': 'application/json',
      'User-Agent': 'Seawater-Mobile/1.0',
    };
    
    if (headers != null) {
      defaultHeaders.addAll(headers);
    }
    
    return defaultHeaders;
  }
  
  String _buildCacheKey(String endpoint, Map<String, dynamic>? queryParams) {
    final params = queryParams ?? {};
    final sortedParams = Map.fromEntries(
      params.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
    );
    return '$sourceName:$endpoint:${sortedParams.toString()}';
  }
}
```

### 2. FEMA National Risk Index Client

```typescript
// lib/services/data_sources/fema_client.dart
class FEMAClient extends AbstractDataSource {
  static const String _baseUrl = 'https://www.fema.gov/api/open/v2';
  
  // Risk type mappings to FEMA NRI fields
  static const Map<String, String> _riskMappings = {
    'avalanche': 'AVLN',
    'coastal_flooding': 'CFLD',
    'cold_wave': 'CWAV',
    'drought': 'DRGT',
    'earthquake': 'ERQK',
    'hail': 'HAIL',
    'heat_wave': 'HWAV',
    'hurricane': 'HRCN',
    'ice_storm': 'ISTM',
    'landslide': 'LNDS',
    'lightning': 'LTNG',
    'riverine_flooding': 'RFLD',
    'strong_wind': 'SWND',
    'tornado': 'TRND',
    'tsunami': 'TSUN',
    'volcanic_activity': 'VLCN',
    'wildfire': 'WFIR',
    'winter_weather': 'WNTW',
  };
  
  FEMAClient({
    CacheManager? cacheManager,
    RateLimiter? rateLimiter,
  }) : super(
          sourceName: 'FEMA_NRI',
          baseUrl: _baseUrl,
          timeout: const Duration(seconds: 30),
          maxRetries: 3,
          cacheManager: cacheManager,
          rateLimiter: rateLimiter,
        );
  
  /// Get National Risk Index data by FIPS code
  Future<ApiResponse<List<FEMARiskData>>> getRiskByFIPS(
    String fipsCode, {
    List<String>? hazardTypes,
  }) async {
    final isCensusTract = fipsCode.length == 11;
    final isCounty = fipsCode.length == 5;
    
    if (!isCensusTract && !isCounty) {
      return ApiResponse.failure(
        DataSourceException(
          source: sourceName,
          message: 'FIPS code must be 5 digits (county) or 11 digits (census tract)',
          type: DataSourceErrorType.invalidParameter,
        ),
      );
    }
    
    final queryParams = {
      r'\$filter': isCensusTract
          ? "CensusTracts eq '$fipsCode'"
          : "substring(CensusTracts,1,5) eq '$fipsCode'",
      r'\$select': _buildSelectFields(hazardTypes),
      r'\$orderby': 'CensusTracts',
    };
    
    return makeRequest<List<FEMARiskData>>(
      endpoint: '/NationalRiskIndex',
      queryParams: queryParams,
      parser: (data) => _parseNRIResponse(data['NationalRiskIndex']),
      cacheTtl: const Duration(hours: 24),
    );
  }
  
  /// Get risk data by coordinates (requires geocoding to FIPS)
  Future<ApiResponse<List<FEMARiskData>>> getRiskByCoordinates(
    double latitude,
    double longitude,
    String fipsCode, {
    List<String>? hazardTypes,
  }) async {
    // FEMA API doesn't support direct coordinate queries
    // Use the FIPS code obtained from geocoding
    return getRiskByFIPS(fipsCode, hazardTypes: hazardTypes);
  }
  
  /// Get disaster declarations for an area
  Future<ApiResponse<List<FEMADisaster>>> getDisasterDeclarations({
    String? stateCode,
    String? countyName,
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final queryParams = <String, dynamic>{};
    
    if (stateCode != null) {
      queryParams[r'\$filter'] = "state eq '$stateCode'";
    }
    
    if (fromDate != null) {
      final dateFilter = "declarationDate ge ${_formatDate(fromDate)}";
      if (queryParams.containsKey(r'\$filter')) {
        queryParams[r'\$filter'] += " and $dateFilter";
      } else {
        queryParams[r'\$filter'] = dateFilter;
      }
    }
    
    if (toDate != null) {
      final dateFilter = "declarationDate le ${_formatDate(toDate)}";
      if (queryParams.containsKey(r'\$filter')) {
        queryParams[r'\$filter'] += " and $dateFilter";
      } else {
        queryParams[r'\$filter'] = dateFilter;
      }
    }
    
    queryParams[r'\$orderby'] = 'declarationDate desc';
    queryParams[r'\$top'] = '100';
    
    return makeRequest<List<FEMADisaster>>(
      endpoint: '/DisasterDeclarationsSummaries',
      queryParams: queryParams,
      parser: (data) => _parseDisasterResponse(data['DisasterDeclarationsSummaries']),
      cacheTtl: const Duration(hours: 6),
    );
  }
  
  /// Get hazard-specific risk data
  Future<ApiResponse<HazardRiskData>> getHazardRisk(
    String hazardType,
    String fipsCode,
  ) async {
    if (!_riskMappings.containsKey(hazardType)) {
      return ApiResponse.failure(
        DataSourceException(
          source: sourceName,
          message: 'Unsupported hazard type: $hazardType',
          type: DataSourceErrorType.invalidParameter,
        ),
      );
    }
    
    final riskCode = _riskMappings[hazardType]!;
    final queryParams = {
      r'\$filter': "CensusTracts eq '$fipsCode'",
      r'\$select': 'StateAbbreviation,CountyName,CensusTracts,'
          '${riskCode}_RISKS,${riskCode}_RISKR,${riskCode}_EALT,${riskCode}_EALR',
    };
    
    return makeRequest<HazardRiskData>(
      endpoint: '/NationalRiskIndex',
      queryParams: queryParams,
      parser: (data) => _parseHazardResponse(data['NationalRiskIndex'], riskCode, hazardType),
      cacheTtl: const Duration(hours: 12),
    );
  }
  
  @override
  Future<bool> testConnection() async {
    try {
      final response = await makeRequest<List<FEMARiskData>>(
        endpoint: '/NationalRiskIndex',
        queryParams: {
          r'\$filter': "StateAbbreviation eq 'CA'",
          r'\$select': 'StateAbbreviation,CountyName',
          r'\$top': '1',
        },
        parser: (data) => _parseNRIResponse(data['NationalRiskIndex']),
      );
      
      return response.isSuccess;
    } catch (e) {
      return false;
    }
  }
  
  @override
  List<String> getAvailableEndpoints() {
    return [
      '/NationalRiskIndex',
      '/DisasterDeclarationsSummaries',
      '/FemaRegions',
      '/HazardMitigationAssistanceProjects',
    ];
  }
  
  String _buildSelectFields(List<String>? hazardTypes) {
    final baseFields = [
      'StateAbbreviation',
      'CountyName',
      'CensusTracts',
      'RISKS',
      'RISKR',
      'POPULATION',
      'BUILDVALUE',
      'AGRIVALUE',
    ];
    
    final riskFields = <String>[];
    
    if (hazardTypes != null && hazardTypes.isNotEmpty) {
      // Only include requested hazard types
      for (final hazardType in hazardTypes) {
        final code = _riskMappings[hazardType];
        if (code != null) {
          riskFields.addAll([
            '${code}_RISKS',
            '${code}_RISKR',
            '${code}_EALT',
            '${code}_EALR',
          ]);
        }
      }
    } else {
      // Include all hazard types
      for (final code in _riskMappings.values) {
        riskFields.addAll([
          '${code}_RISKS',
          '${code}_RISKR',
          '${code}_EALT',
          '${code}_EALR',
        ]);
      }
    }
    
    return [...baseFields, ...riskFields].join(',');
  }
  
  List<FEMARiskData> _parseNRIResponse(dynamic data) {
    if (data == null) return [];
    
    final List<dynamic> records = data is List ? data : [data];
    
    return records.map((record) {
      final hazardRisks = <String, HazardRisk>{};
      
      // Extract hazard-specific risks
      for (final entry in _riskMappings.entries) {
        final hazardType = entry.key;
        final code = entry.value;
        
        final riskScore = _parseRiskScore(record['${code}_RISKS']);
        final riskRating = _parseRiskRating(record['${code}_RISKR']);
        
        if (riskScore != null || riskRating != null) {
          hazardRisks[hazardType] = HazardRisk(
            type: hazardType,
            score: riskScore ?? 0,
            rating: riskRating ?? 'unknown',
            expectedAnnualLoss: _parseDouble(record['${code}_EALT']) ?? 0,
            expectedAnnualLossRating: _parseRiskRating(record['${code}_EALR']) ?? 'unknown',
          );
        }
      }
      
      return FEMARiskData(
        location: LocationInfo(
          state: record['StateAbbreviation'] ?? '',
          county: record['CountyName'] ?? '',
          censusTract: record['CensusTracts'] ?? '',
          fipsCode: record['CensusTracts'] ?? '',
        ),
        overallRisk: OverallRisk(
          score: _parseRiskScore(record['RISKS']) ?? 0,
          rating: _parseRiskRating(record['RISKR']) ?? 'unknown',
        ),
        demographics: Demographics(
          population: _parseInt(record['POPULATION']) ?? 0,
          buildingValue: _parseDouble(record['BUILDVALUE']) ?? 0,
          agricultureValue: _parseDouble(record['AGRIVALUE']) ?? 0,
        ),
        hazardRisks: hazardRisks,
        dataSource: 'FEMA_NRI',
        lastUpdated: DateTime.now(),
      );
    }).toList();
  }
  
  List<FEMADisaster> _parseDisasterResponse(dynamic data) {
    if (data == null) return [];
    
    final List<dynamic> records = data is List ? data : [data];
    
    return records.map((record) => FEMADisaster(
      disasterNumber: record['disasterNumber']?.toString() ?? '',
      declarationType: record['declarationType'] ?? '',
      incidentType: record['incidentType'] ?? '',
      title: record['title'] ?? '',
      state: record['state'] ?? '',
      counties: record['declaredCountyArea']?.toString().split(';') ?? [],
      declarationDate: _parseDateTime(record['declarationDate']),
      incidentBeginDate: _parseDateTime(record['incidentBeginDate']),
      incidentEndDate: _parseDateTime(record['incidentEndDate']),
      closeoutDate: _parseDateTime(record['closeoutDate']),
      femaRegion: _parseInt(record['femaRegion']) ?? 0,
    )).toList();
  }
  
  HazardRiskData _parseHazardResponse(dynamic data, String riskCode, String hazardType) {
    final records = _parseNRIResponse(data);
    if (records.isEmpty) {
      throw DataSourceException(
        source: sourceName,
        message: 'No data found for specified location',
        type: DataSourceErrorType.noData,
      );
    }
    
    final record = records.first;
    final hazardRisk = record.hazardRisks[hazardType];
    
    if (hazardRisk == null) {
      throw DataSourceException(
        source: sourceName,
        message: 'No $hazardType risk data available',
        type: DataSourceErrorType.noData,
      );
    }
    
    return HazardRiskData(
      location: record.location,
      hazardType: hazardType,
      riskData: hazardRisk,
      dataSource: sourceName,
      lastUpdated: DateTime.now(),
    );
  }
  
  // Utility parsing methods
  int? _parseRiskScore(dynamic value) {
    if (value == null || value == '') return null;
    final score = double.tryParse(value.toString());
    return score != null ? (score * 100).round() : null;
  }
  
  String? _parseRiskRating(dynamic value) {
    if (value == null || value == '') return null;
    
    const ratingMap = {
      'Very Low': 'very_low',
      'Relatively Low': 'low',
      'Relatively Moderate': 'moderate',
      'Relatively High': 'high',
      'Very High': 'very_high',
    };
    
    return ratingMap[value.toString()] ?? value.toString().toLowerCase().replaceAll(' ', '_');
  }
  
  int? _parseInt(dynamic value) {
    if (value == null) return null;
    return int.tryParse(value.toString());
  }
  
  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    return double.tryParse(value.toString());
  }
  
  DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    try {
      return DateTime.parse(value.toString());
    } catch (e) {
      return null;
    }
  }
  
  String _formatDate(DateTime date) {
    return "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
  }
}
```

### 3. NOAA Climate Data Client

```typescript
// lib/services/data_sources/noaa_client.dart
class NOAAClient extends AbstractDataSource {
  static const String _baseUrl = 'https://www.ncei.noaa.gov/cdo-web/api/v2';
  
  final String? _apiToken;
  
  NOAAClient({
    String? apiToken,
    CacheManager? cacheManager,
    RateLimiter? rateLimiter,
  }) : _apiToken = apiToken,
        super(
          sourceName: 'NOAA_CDO',
          baseUrl: _baseUrl,
          timeout: const Duration(seconds: 45),
          maxRetries: 3,
          cacheManager: cacheManager,
          rateLimiter: rateLimiter,
        );
  
  /// Get weather stations near coordinates
  Future<ApiResponse<List<NOAAStation>>> getStationsNear(
    double latitude,
    double longitude, {
    double radiusKm = 25.0,
    int limit = 50,
  }) async {
    final queryParams = {
      'extent': _buildExtent(latitude, longitude, radiusKm),
      'limit': limit.toString(),
      'sortfield': 'name',
      'sortorder': 'asc',
    };
    
    return makeRequest<List<NOAAStation>>(
      endpoint: '/stations',
      queryParams: queryParams,
      headers: _buildAuthHeaders(),
      parser: (data) => _parseStationsResponse(data),
      cacheTtl: const Duration(hours: 24),
    );
  }
  
  /// Get historical weather data
  Future<ApiResponse<List<NOAAWeatherData>>> getWeatherData({
    required String stationId,
    required String datasetId,
    required DateTime startDate,
    required DateTime endDate,
    List<String>? datatypes,
    int limit = 1000,
  }) async {
    final queryParams = {
      'datasetid': datasetId,
      'stationid': stationId,
      'startdate': _formatDate(startDate),
      'enddate': _formatDate(endDate),
      'limit': limit.toString(),
      'sortfield': 'date',
      'sortorder': 'desc',
    };
    
    if (datatypes != null && datatypes.isNotEmpty) {
      queryParams['datatypeid'] = datatypes.join(',');
    }
    
    return makeRequest<List<NOAAWeatherData>>(
      endpoint: '/data',
      queryParams: queryParams,
      headers: _buildAuthHeaders(),
      parser: (data) => _parseWeatherDataResponse(data),
      cacheTtl: const Duration(hours: 6),
    );
  }
  
  /// Get climate summaries
  Future<ApiResponse<List<NOAAClimateSummary>>> getClimateSummaries({
    required String datasetId,
    required String locationId,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final queryParams = {
      'datasetid': datasetId,
      'locationid': locationId,
      'startdate': _formatDate(startDate),
      'enddate': _formatDate(endDate),
      'limit': '1000',
    };
    
    return makeRequest<List<NOAAClimateSummary>>(
      endpoint: '/data',
      queryParams: queryParams,
      headers: _buildAuthHeaders(),
      parser: (data) => _parseClimateSummaryResponse(data),
      cacheTtl: const Duration(hours: 12),
    );
  }
  
  /// Get available datasets
  Future<ApiResponse<List<NOAADataset>>> getDatasets() async {
    return makeRequest<List<NOAADataset>>(
      endpoint: '/datasets',
      queryParams: {'limit': '100'},
      headers: _buildAuthHeaders(),
      parser: (data) => _parseDatasetsResponse(data),
      cacheTtl: const Duration(days: 1),
    );
  }
  
  @override
  Future<bool> testConnection() async {
    try {
      final response = await makeRequest<List<NOAADataset>>(
        endpoint: '/datasets',
        queryParams: {'limit': '1'},
        headers: _buildAuthHeaders(),
        parser: (data) => _parseDatasetsResponse(data),
      );
      
      return response.isSuccess;
    } catch (e) {
      return false;
    }
  }
  
  @override
  List<String> getAvailableEndpoints() {
    return [
      '/data',
      '/datasets',
      '/datacategories',
      '/datatypes',
      '/locationcategories',
      '/locations',
      '/stations',
    ];
  }
  
  Map<String, String> _buildAuthHeaders() {
    if (_apiToken == null) {
      throw DataSourceException(
        source: sourceName,
        message: 'NOAA API token is required',
        type: DataSourceErrorType.authenticationError,
      );
    }
    
    return {'token': _apiToken!};
  }
  
  String _buildExtent(double latitude, double longitude, double radiusKm) {
    // Convert radius to degrees (approximate)
    final latDelta = radiusKm / 111.0;
    final lngDelta = radiusKm / (111.0 * cos(latitude * pi / 180));
    
    final north = latitude + latDelta;
    final south = latitude - latDelta;
    final east = longitude + lngDelta;
    final west = longitude - lngDelta;
    
    return '$north,$west,$south,$east';
  }
  
  List<NOAAStation> _parseStationsResponse(Map<String, dynamic> data) {
    final results = data['results'] as List<dynamic>?;
    if (results == null) return [];
    
    return results.map((item) => NOAAStation(
      id: item['id'] ?? '',
      name: item['name'] ?? '',
      latitude: _parseDouble(item['latitude']) ?? 0.0,
      longitude: _parseDouble(item['longitude']) ?? 0.0,
      elevation: _parseDouble(item['elevation']) ?? 0.0,
      elevationUnit: item['elevationUnit'] ?? 'METERS',
      minDate: _parseDate(item['mindate']),
      maxDate: _parseDate(item['maxdate']),
      datacoverage: _parseDouble(item['datacoverage']) ?? 0.0,
    )).toList();
  }
  
  List<NOAAWeatherData> _parseWeatherDataResponse(Map<String, dynamic> data) {
    final results = data['results'] as List<dynamic>?;
    if (results == null) return [];
    
    return results.map((item) => NOAAWeatherData(
      date: _parseDate(item['date']) ?? DateTime.now(),
      datatype: item['datatype'] ?? '',
      station: item['station'] ?? '',
      value: _parseDouble(item['value']) ?? 0.0,
      attributes: item['attributes'] ?? '',
    )).toList();
  }
  
  List<NOAAClimateSummary> _parseClimateSummaryResponse(Map<String, dynamic> data) {
    final results = data['results'] as List<dynamic>?;
    if (results == null) return [];
    
    return results.map((item) => NOAAClimateSummary(
      date: _parseDate(item['date']) ?? DateTime.now(),
      datatype: item['datatype'] ?? '',
      value: _parseDouble(item['value']) ?? 0.0,
      attributes: item['attributes'] ?? '',
    )).toList();
  }
  
  List<NOAADataset> _parseDatasetsResponse(Map<String, dynamic> data) {
    final results = data['results'] as List<dynamic>?;
    if (results == null) return [];
    
    return results.map((item) => NOAADataset(
      uid: item['uid'] ?? '',
      id: item['id'] ?? '',
      name: item['name'] ?? '',
      datacoverage: _parseDouble(item['datacoverage']) ?? 0.0,
      mindate: _parseDate(item['mindate']),
      maxdate: _parseDate(item['maxdate']),
    )).toList();
  }
  
  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    return double.tryParse(value.toString());
  }
  
  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    try {
      return DateTime.parse(value.toString());
    } catch (e) {
      return null;
    }
  }
  
  String _formatDate(DateTime date) {
    return "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
  }
}
```

### 4. Data Source Manager

```typescript
// lib/services/data_sources/data_source_manager.dart
class DataSourceManager {
  final Map<String, AbstractDataSource> _dataSources = {};
  final CacheManager _cacheManager;
  final RateLimiter _rateLimiter;
  final HealthMonitor _healthMonitor;
  
  DataSourceManager({
    required CacheManager cacheManager,
    required RateLimiter rateLimiter,
  }) : _cacheManager = cacheManager,
        _rateLimiter = rateLimiter,
        _healthMonitor = HealthMonitor();
  
  /// Initialize all available data sources
  Future<void> initialize() async {
    // Initialize FEMA client (free, no API key required)
    _dataSources['fema'] = FEMAClient(
      cacheManager: _cacheManager,
      rateLimiter: _rateLimiter,
    );
    
    // Initialize NOAA client if API token available
    final noaaToken = Environment.noaaApiToken;
    if (noaaToken != null && noaaToken.isNotEmpty) {
      _dataSources['noaa'] = NOAAClient(
        apiToken: noaaToken,
        cacheManager: _cacheManager,
        rateLimiter: _rateLimiter,
      );
    }
    
    // Initialize USGS client (free, no API key required)
    _dataSources['usgs'] = USGSClient(
      cacheManager: _cacheManager,
      rateLimiter: _rateLimiter,
    );
    
    // Initialize premium sources if API keys available
    final firstStreetKey = Environment.firstStreetApiKey;
    if (firstStreetKey != null && firstStreetKey.isNotEmpty) {
      _dataSources['firststreet'] = FirstStreetClient(
        apiKey: firstStreetKey,
        cacheManager: _cacheManager,
        rateLimiter: _rateLimiter,
      );
    }
    
    final climateCheckKey = Environment.climateCheckApiKey;
    if (climateCheckKey != null && climateCheckKey.isNotEmpty) {
      _dataSources['climatecheck'] = ClimateCheckClient(
        apiKey: climateCheckKey,
        cacheManager: _cacheManager,
        rateLimiter: _rateLimiter,
      );
    }
    
    // Start health monitoring
    _healthMonitor.startMonitoring(_dataSources.values.toList());
    
    debugPrint('Initialized ${_dataSources.length} data sources');
  }
  
  /// Get comprehensive risk assessment by combining multiple sources
  Future<ComprehensiveRiskAssessment> getRiskAssessment({
    required String address,
    required double latitude,
    required double longitude,
    String? fipsCode,
    List<String> preferredSources = const ['fema', 'noaa', 'usgs'],
    bool includePremium = false,
  }) async {
    final results = <String, dynamic>{};
    final errors = <String, DataSourceException>{};
    
    // Determine available sources based on preferences
    final availableSources = _getAvailableSources(preferredSources, includePremium);
    
    // Fetch data from each source in parallel
    final futures = availableSources.map((sourceName) async {
      try {
        final source = _dataSources[sourceName];
        if (source == null) return;
        
        final data = await _fetchFromSource(
          source,
          sourceName,
          latitude: latitude,
          longitude: longitude,
          fipsCode: fipsCode,
        );
        
        if (data != null) {
          results[sourceName] = data;
        }
      } catch (e) {
        errors[sourceName] = e is DataSourceException
            ? e
            : DataSourceException(
                source: sourceName,
                message: e.toString(),
                type: DataSourceErrorType.unknown,
              );
      }
    });
    
    await Future.wait(futures);
    
    // Combine results into comprehensive assessment
    return _combineResults(
      address: address,
      latitude: latitude,
      longitude: longitude,
      results: results,
      errors: errors,
    );
  }
  
  /// Get health status of all data sources
  Map<String, HealthStatus> getHealthStatus() {
    final status = <String, HealthStatus>{};
    
    for (final entry in _dataSources.entries) {
      final source = entry.value;
      final metrics = source.getHealthMetrics();
      
      status[entry.key] = HealthStatus(
        sourceName: source.sourceName,
        isHealthy: metrics.isHealthy,
        uptime: metrics.uptime,
        averageResponseTime: metrics.averageResponseTime,
        errorRate: metrics.errorRate,
        lastError: metrics.lastError,
        lastSuccess: metrics.lastSuccess,
      );
    }
    
    return status;
  }
  
  /// Test connections to all data sources
  Future<Map<String, bool>> testAllConnections() async {
    final results = <String, bool>{};
    
    final futures = _dataSources.entries.map((entry) async {
      try {
        results[entry.key] = await entry.value.testConnection();
      } catch (e) {
        results[entry.key] = false;
      }
    });
    
    await Future.wait(futures);
    return results;
  }
  
  List<String> _getAvailableSources(List<String> preferred, bool includePremium) {
    final available = <String>[];
    
    for (final sourceName in preferred) {
      if (_dataSources.containsKey(sourceName)) {
        available.add(sourceName);
      }
    }
    
    if (includePremium) {
      for (final premiumSource in ['firststreet', 'climatecheck']) {
        if (_dataSources.containsKey(premiumSource) && !available.contains(premiumSource)) {
          available.add(premiumSource);
        }
      }
    }
    
    return available;
  }
  
  Future<dynamic> _fetchFromSource(
    AbstractDataSource source,
    String sourceName, {
    required double latitude,
    required double longitude,
    String? fipsCode,
  }) async {
    switch (sourceName) {
      case 'fema':
        if (fipsCode != null) {
          final response = await (source as FEMAClient).getRiskByFIPS(fipsCode);
          return response.isSuccess ? response.data : null;
        }
        break;
        
      case 'noaa':
        final response = await (source as NOAAClient).getStationsNear(latitude, longitude);
        return response.isSuccess ? response.data : null;
        
      case 'usgs':
        final response = await (source as USGSClient).getEarthquakeRisk(latitude, longitude);
        return response.isSuccess ? response.data : null;
        
      case 'firststreet':
        final response = await (source as FirstStreetClient).getPropertyRisk(latitude, longitude);
        return response.isSuccess ? response.data : null;
        
      case 'climatecheck':
        final response = await (source as ClimateCheckClient).getRiskScore(latitude, longitude);
        return response.isSuccess ? response.data : null;
    }
    
    return null;
  }
  
  ComprehensiveRiskAssessment _combineResults({
    required String address,
    required double latitude,
    required double longitude,
    required Map<String, dynamic> results,
    required Map<String, DataSourceException> errors,
  }) {
    // Extract FEMA data
    final femaData = results['fema'] as List<FEMARiskData>?;
    final primaryFema = femaData?.isNotEmpty == true ? femaData!.first : null;
    
    // Extract other source data
    final noaaStations = results['noaa'] as List<NOAAStation>?;
    final usgsData = results['usgs'];
    final firstStreetData = results['firststreet'];
    final climateCheckData = results['climatecheck'];
    
    // Determine overall risk score using weighted combination
    final overallRisk = _calculateOverallRisk(
      femaRisk: primaryFema?.overallRisk.score,
      firstStreetRisk: firstStreetData?.riskScore,
      climateCheckRisk: climateCheckData?.overallScore,
    );
    
    return ComprehensiveRiskAssessment(
      address: address,
      location: PropertyLocation(
        latitude: latitude,
        longitude: longitude,
        fipsCode: primaryFema?.location.fipsCode,
        county: primaryFema?.location.county,
        state: primaryFema?.location.state,
      ),
      overallRisk: OverallRisk(
        score: overallRisk,
        category: _getRiskCategory(overallRisk),
        confidence: _calculateConfidence(results.length, errors.length),
      ),
      hazardRisks: _combineHazardRisks(results),
      dataSources: DataSourceSummary(
        used: results.keys.toList(),
        failed: errors.keys.toList(),
        totalRequested: results.length + errors.length,
      ),
      demographics: primaryFema?.demographics,
      nearbyWeatherStations: noaaStations?.take(5).toList(),
      lastUpdated: DateTime.now(),
      errors: errors.isNotEmpty ? errors : null,
    );
  }
  
  int _calculateOverallRisk(
    {int? femaRisk, int? firstStreetRisk, int? climateCheckRisk}
  ) {
    final scores = <int>[];
    final weights = <double>[];
    
    if (femaRisk != null) {
      scores.add(femaRisk);
      weights.add(0.4); // FEMA has 40% weight
    }
    
    if (firstStreetRisk != null) {
      scores.add(firstStreetRisk);
      weights.add(0.35); // First Street has 35% weight
    }
    
    if (climateCheckRisk != null) {
      scores.add(climateCheckRisk);
      weights.add(0.25); // ClimateCheck has 25% weight
    }
    
    if (scores.isEmpty) return 0;
    
    // Normalize weights
    final totalWeight = weights.reduce((a, b) => a + b);
    final normalizedWeights = weights.map((w) => w / totalWeight).toList();
    
    // Calculate weighted average
    double weightedSum = 0;
    for (int i = 0; i < scores.length; i++) {
      weightedSum += scores[i] * normalizedWeights[i];
    }
    
    return weightedSum.round();
  }
  
  String _getRiskCategory(int score) {
    if (score < 25) return 'LOW';
    if (score < 50) return 'MODERATE';
    if (score < 75) return 'HIGH';
    return 'EXTREME';
  }
  
  double _calculateConfidence(int successCount, int errorCount) {
    final total = successCount + errorCount;
    if (total == 0) return 0.0;
    return (successCount / total * 100).clamp(0.0, 100.0);
  }
  
  Map<String, HazardRisk> _combineHazardRisks(Map<String, dynamic> results) {
    final combined = <String, HazardRisk>{};
    
    // Start with FEMA hazard risks as base
    final femaData = results['fema'] as List<FEMARiskData>?;
    if (femaData?.isNotEmpty == true) {
      combined.addAll(femaData!.first.hazardRisks);
    }
    
    // Enhance with premium source data
    // TODO: Implement premium source hazard risk combination
    
    return combined;
  }
  
  void dispose() {
    _healthMonitor.dispose();
  }
}
```

## 🔄 Error Handling and Fallback Patterns

### Exception Types

```typescript
// lib/models/exceptions.dart
enum DataSourceErrorType {
  networkError,
  authenticationError,
  rateLimitExceeded,
  invalidParameter,
  noData,
  serverError,
  unknown,
}

class DataSourceException implements Exception {
  final String source;
  final String message;
  final DataSourceErrorType type;
  final Exception? originalException;
  final DateTime timestamp;
  
  const DataSourceException({
    required this.source,
    required this.message,
    required this.type,
    this.originalException,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
  
  @override
  String toString() {
    return 'DataSourceException($source): $message';
  }
  
  bool get isRetryable {
    switch (type) {
      case DataSourceErrorType.networkError:
      case DataSourceErrorType.rateLimitExceeded:
      case DataSourceErrorType.serverError:
        return true;
      default:
        return false;
    }
  }
}
```

### Fallback Strategy

```typescript
// lib/services/fallback_strategy.dart
class FallbackStrategy {
  static const Map<String, List<String>> _fallbackChains = {
    'geocoding': ['mapbox', 'google', 'census'],
    'risk_assessment': ['fema', 'usgs', 'noaa'],
    'weather_data': ['noaa', 'openweather'],
    'disaster_history': ['fema', 'usgs'],
  };
  
  static Future<T?> executeWithFallback<T>({
    required String operation,
    required Map<String, Future<T?> Function()> providers,
    Duration timeoutPerProvider = const Duration(seconds: 30),
  }) async {
    final chain = _fallbackChains[operation] ?? providers.keys.toList();
    
    for (final providerName in chain) {
      final provider = providers[providerName];
      if (provider == null) continue;
      
      try {
        final result = await provider().timeout(timeoutPerProvider);
        if (result != null) {
          debugPrint('$operation succeeded with provider: $providerName');
          return result;
        }
      } catch (e) {
        debugPrint('$operation failed with $providerName: $e');
        continue;
      }
    }
    
    throw DataSourceException(
      source: 'fallback_strategy',
      message: 'All providers failed for operation: $operation',
      type: DataSourceErrorType.unknown,
    );
  }
}
```

## 📊 Performance Monitoring

### Health Metrics

```typescript
// lib/services/health_metrics.dart
class HealthMetrics {
  int _totalRequests = 0;
  int _successfulRequests = 0;
  int _failedRequests = 0;
  int _cacheHits = 0;
  final List<int> _responseTimes = [];
  DateTime? _lastSuccess;
  DateTime? _lastError;
  String? _lastErrorMessage;
  
  void recordSuccess(int responseTimeMs) {
    _totalRequests++;
    _successfulRequests++;
    _responseTimes.add(responseTimeMs);
    _lastSuccess = DateTime.now();
    
    // Keep only last 100 response times
    if (_responseTimes.length > 100) {
      _responseTimes.removeAt(0);
    }
  }
  
  void recordError(DataSourceException error, int responseTimeMs) {
    _totalRequests++;
    _failedRequests++;
    _responseTimes.add(responseTimeMs);
    _lastError = DateTime.now();
    _lastErrorMessage = error.message;
  }
  
  void recordCacheHit() {
    _cacheHits++;
  }
  
  // Getters
  bool get isHealthy => errorRate < 0.1 && averageResponseTime < 5000;
  double get uptime => _totalRequests > 0 ? (_successfulRequests / _totalRequests) * 100 : 100;
  double get errorRate => _totalRequests > 0 ? _failedRequests / _totalRequests : 0;
  double get cacheHitRate => _totalRequests > 0 ? _cacheHits / _totalRequests : 0;
  int get averageResponseTime => _responseTimes.isNotEmpty 
      ? (_responseTimes.reduce((a, b) => a + b) / _responseTimes.length).round()
      : 0;
  
  DateTime? get lastSuccess => _lastSuccess;
  DateTime? get lastError => _lastError;
  String? get lastErrorMessage => _lastErrorMessage;
  int get totalRequests => _totalRequests;
  int get successfulRequests => _successfulRequests;
  int get failedRequests => _failedRequests;
}
```

## 🧪 Testing Patterns

### Data Source Testing

```typescript
// test/services/data_sources/fema_client_test.dart
void main() {
  group('FEMAClient', () {
    late FEMAClient client;
    late MockHttpClient mockHttpClient;
    late MockCacheManager mockCacheManager;
    
    setUp(() {
      mockHttpClient = MockHttpClient();
      mockCacheManager = MockCacheManager();
      
      client = FEMAClient(
        cacheManager: mockCacheManager,
      );
    });
    
    group('getRiskByFIPS', () {
      test('should return risk data for valid census tract', () async {
        // Arrange
        const fipsCode = '06037137000'; // LA County census tract
        const mockResponse = {
          'NationalRiskIndex': [
            {
              'StateAbbreviation': 'CA',
              'CountyName': 'Los Angeles',
              'CensusTracts': fipsCode,
              'RISKS': '0.75',
              'RISKR': 'Relatively High',
              'POPULATION': '4000',
              'WFIR_RISKS': '0.85',
              'WFIR_RISKR': 'Very High',
            }
          ]
        };
        
        when(mockHttpClient.get(any, headers: anyNamed('headers')))
            .thenAnswer((_) async => MockResponse(200, mockResponse));
        
        // Act
        final result = await client.getRiskByFIPS(fipsCode);
        
        // Assert
        expect(result.isSuccess, isTrue);
        expect(result.data, hasLength(1));
        
        final riskData = result.data!.first;
        expect(riskData.location.fipsCode, equals(fipsCode));
        expect(riskData.overallRisk.score, equals(75));
        expect(riskData.hazardRisks['wildfire'], isNotNull);
        expect(riskData.hazardRisks['wildfire']!.score, equals(85));
      });
      
      test('should handle API errors gracefully', () async {
        // Arrange
        const fipsCode = '12345';
        
        when(mockHttpClient.get(any, headers: anyNamed('headers')))
            .thenThrow(const SocketException('Network error'));
        
        // Act
        final result = await client.getRiskByFIPS(fipsCode);
        
        // Assert
        expect(result.isSuccess, isFalse);
        expect(result.error!.type, equals(DataSourceErrorType.networkError));
      });
    });
  });
}
```

## 🚀 Production Considerations

### Rate Limiting

```typescript
// lib/services/rate_limiter.dart
class RateLimiter {
  final Map<String, TokenBucket> _buckets = {};
  
  void configure(String sourceId, {
    required int maxRequests,
    required Duration window,
  }) {
    _buckets[sourceId] = TokenBucket(
      maxTokens: maxRequests,
      refillRate: maxRequests / window.inSeconds,
    );
  }
  
  Future<void> waitForAvailability(String sourceId) async {
    final bucket = _buckets[sourceId];
    if (bucket == null) return;
    
    while (!bucket.tryConsume()) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
  }
}
```

### Monitoring and Alerting

```typescript
// lib/services/monitoring.dart
class ClimateDataMonitoring {
  static void trackAPIUsage(String source, {
    required Duration responseTime,
    required bool success,
    bool fromCache = false,
  }) {
    Analytics.track('api_usage', {
      'source': source,
      'response_time_ms': responseTime.inMilliseconds,
      'success': success,
      'from_cache': fromCache,
    });
  }
  
  static void trackDataQuality(String source, {
    required double completeness,
    required double accuracy,
    int? recordCount,
  }) {
    Analytics.track('data_quality', {
      'source': source,
      'completeness_percent': completeness,
      'accuracy_percent': accuracy,
      'record_count': recordCount,
    });
  }
}
```

---

*This comprehensive integration pattern documentation provides the foundation for building robust, scalable climate data integrations that can handle multiple sources, fallback scenarios, and production-level requirements for the Seawater mobile platform.*