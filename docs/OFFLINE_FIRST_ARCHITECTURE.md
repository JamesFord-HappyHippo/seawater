# 📱 Seawater Mobile App - Offline-First Architecture

## 🎯 Overview

This document outlines the offline-first architecture for the Seawater Climate Risk Platform mobile application. The offline-first approach ensures that users can access critical climate risk information even in areas with poor or no internet connectivity, which is essential for field work and remote property assessments.

### Offline-First Principles

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Local Cache   │    │   Sync Engine    │    │   Remote API    │
│   • SQLite      │◄──►│   • Conflict     │◄──►│   • Climate     │
│   • Hive        │    │     Resolution   │    │     Data        │
│   • Assets      │    │   • Delta Sync   │    │   • User Data   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────────────┐               │
         └──────────────►│ Offline UI     │◄──────────────┘
                         │ • Indicators   │
                         │ • Fallbacks    │
                         └────────────────┘
```

## 🏗️ Architecture Components

### 1. Local Data Storage

#### SQLite Database Schema

```dart
// lib/database/seawater_database.dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class SeawaterDatabase {
  static const String _databaseName = 'seawater_offline.db';
  static const int _databaseVersion = 1;
  
  static Database? _database;
  
  static Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }
  
  static Future<Database> _initDatabase() async {
    final documentsDirectory = await getDatabasesPath();
    final path = join(documentsDirectory, _databaseName);
    
    return await openDatabase(
      path,
      version: _databaseVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }
  
  static Future<void> _onCreate(Database db, int version) async {
    await db.transaction((txn) async {
      // Risk assessments cache
      await txn.execute('''
        CREATE TABLE risk_assessments (
          id TEXT PRIMARY KEY,
          address TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          overall_score INTEGER NOT NULL,
          risk_data TEXT NOT NULL, -- JSON blob
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          sync_status INTEGER NOT NULL DEFAULT 0, -- 0: synced, 1: pending
          UNIQUE(address, latitude, longitude)
        )
      ''');
      
      // Property search cache
      await txn.execute('''
        CREATE TABLE property_cache (
          id TEXT PRIMARY KEY,
          search_query TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          radius_km REAL,
          properties_data TEXT NOT NULL, -- JSON array
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        )
      ''');
      
      // User favorites (always available offline)
      await txn.execute('''
        CREATE TABLE user_favorites (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          address TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          nickname TEXT,
          risk_summary TEXT, -- Basic risk info
          created_at INTEGER NOT NULL,
          sync_status INTEGER NOT NULL DEFAULT 1 -- Always needs sync
        )
      ''');
      
      // Map tiles cache
      await txn.execute('''
        CREATE TABLE map_tiles (
          id TEXT PRIMARY KEY,
          zoom_level INTEGER NOT NULL,
          tile_x INTEGER NOT NULL,
          tile_y INTEGER NOT NULL,
          tile_data BLOB NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          UNIQUE(zoom_level, tile_x, tile_y)
        )
      ''');
      
      // Sync queue for offline actions
      await txn.execute('''
        CREATE TABLE sync_queue (
          id TEXT PRIMARY KEY,
          action_type TEXT NOT NULL, -- 'create', 'update', 'delete'
          entity_type TEXT NOT NULL, -- 'favorite', 'assessment', etc.
          entity_id TEXT NOT NULL,
          payload TEXT NOT NULL, -- JSON data
          created_at INTEGER NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        )
      ''');
      
      // App settings cache
      await txn.execute('''
        CREATE TABLE app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      ''');
    });
    
    // Create indexes for performance
    await _createIndexes(db);
  }
  
  static Future<void> _createIndexes(Database db) async {
    await db.execute('CREATE INDEX idx_risk_assessments_location ON risk_assessments(latitude, longitude)');
    await db.execute('CREATE INDEX idx_risk_assessments_expires ON risk_assessments(expires_at)');
    await db.execute('CREATE INDEX idx_property_cache_expires ON property_cache(expires_at)');
    await db.execute('CREATE INDEX idx_user_favorites_user ON user_favorites(user_id)');
    await db.execute('CREATE INDEX idx_sync_queue_created ON sync_queue(created_at)');
    await db.execute('CREATE INDEX idx_map_tiles_expires ON map_tiles(expires_at)');
  }
  
  static Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle database schema migrations
    if (oldVersion < 2) {
      // Example migration
      // await db.execute('ALTER TABLE risk_assessments ADD COLUMN new_field TEXT');
    }
  }
  
  // Cleanup expired data
  static Future<void> cleanupExpiredData() async {
    final db = await database;
    final now = DateTime.now().millisecondsSinceEpoch;
    
    await db.transaction((txn) async {
      await txn.delete('risk_assessments', where: 'expires_at < ?', whereArgs: [now]);
      await txn.delete('property_cache', where: 'expires_at < ?', whereArgs: [now]);
      await txn.delete('map_tiles', where: 'expires_at < ?', whereArgs: [now]);
    });
  }
}
```

#### Hive Key-Value Store for Settings

```dart
// lib/storage/hive_storage.dart
import 'package:hive_flutter/hive_flutter.dart';

class HiveStorage {
  static const String _userPrefsBox = 'user_preferences';
  static const String _cacheSettingsBox = 'cache_settings';
  static const String _offlineDataBox = 'offline_data';
  
  static late Box<dynamic> _userPrefs;
  static late Box<dynamic> _cacheSettings;
  static late Box<dynamic> _offlineData;
  
  static Future<void> initialize() async {
    await Hive.initFlutter();
    
    _userPrefs = await Hive.openBox(_userPrefsBox);
    _cacheSettings = await Hive.openBox(_cacheSettingsBox);
    _offlineData = await Hive.openBox(_offlineDataBox);
  }
  
  // User preferences
  static Future<void> setUserPreference(String key, dynamic value) async {
    await _userPrefs.put(key, value);
  }
  
  static T? getUserPreference<T>(String key) {
    return _userPrefs.get(key) as T?;
  }
  
  // Cache settings
  static Future<void> setCacheSetting(String key, dynamic value) async {
    await _cacheSettings.put(key, value);
  }
  
  static T? getCacheSetting<T>(String key) {
    return _cacheSettings.get(key) as T?;
  }
  
  // Offline data (temporary storage)
  static Future<void> setOfflineData(String key, dynamic value) async {
    await _offlineData.put(key, value);
  }
  
  static T? getOfflineData<T>(String key) {
    return _offlineData.get(key) as T?;
  }
  
  static Future<void> removeOfflineData(String key) async {
    await _offlineData.delete(key);
  }
  
  // Cleanup
  static Future<void> clearUserData() async {
    await _userPrefs.clear();
  }
  
  static Future<void> clearCacheData() async {
    await _cacheSettings.clear();
    await _offlineData.clear();
  }
}
```

### 2. Data Access Layer

#### Repository Pattern Implementation

```dart
// lib/repositories/risk_assessment_repository.dart
abstract class RiskAssessmentRepository {
  Future<RiskAssessment?> getRiskAssessment(String address);
  Future<void> cacheRiskAssessment(RiskAssessment assessment);
  Future<List<RiskAssessment>> getCachedAssessments();
  Future<void> clearExpiredCache();
}

class OfflineFirstRiskRepository implements RiskAssessmentRepository {
  final SeawaterApiService _apiService;
  final ConnectivityService _connectivityService;
  
  OfflineFirstRiskRepository(this._apiService, this._connectivityService);
  
  @override
  Future<RiskAssessment?> getRiskAssessment(String address) async {
    // Always try cache first
    final cached = await _getCachedAssessment(address);
    if (cached != null && !cached.isExpired) {
      return cached;
    }
    
    // Try to fetch from API if online
    if (await _connectivityService.isConnected()) {
      try {
        final assessment = await _apiService.getPropertyRisk(address);
        await cacheRiskAssessment(assessment);
        return assessment;
      } catch (e) {
        // Fall back to expired cache if API fails
        return cached;
      }
    }
    
    // Return expired cache as fallback
    return cached;
  }
  
  @override
  Future<void> cacheRiskAssessment(RiskAssessment assessment) async {
    final db = await SeawaterDatabase.database;
    
    final now = DateTime.now().millisecondsSinceEpoch;
    final expires = now + (24 * 60 * 60 * 1000); // 24 hours
    
    await db.insert(
      'risk_assessments',
      {
        'id': _generateId(assessment.address),
        'address': assessment.address,
        'latitude': assessment.location.latitude,
        'longitude': assessment.location.longitude,
        'overall_score': assessment.overallRisk.score,
        'risk_data': jsonEncode(assessment.toJson()),
        'created_at': now,
        'updated_at': now,
        'expires_at': expires,
        'sync_status': 0, // Synced
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }
  
  @override
  Future<List<RiskAssessment>> getCachedAssessments() async {
    final db = await SeawaterDatabase.database;
    
    final maps = await db.query(
      'risk_assessments',
      orderBy: 'updated_at DESC',
      limit: 50,
    );
    
    return maps.map((map) {
      final riskData = jsonDecode(map['risk_data'] as String);
      return RiskAssessment.fromJson(riskData);
    }).toList();
  }
  
  @override
  Future<void> clearExpiredCache() async {
    final db = await SeawaterDatabase.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    
    await db.delete(
      'risk_assessments',
      where: 'expires_at < ?',
      whereArgs: [now],
    );
  }
  
  Future<RiskAssessment?> _getCachedAssessment(String address) async {
    final db = await SeawaterDatabase.database;
    
    final maps = await db.query(
      'risk_assessments',
      where: 'address = ?',
      whereArgs: [address],
      limit: 1,
    );
    
    if (maps.isEmpty) return null;
    
    final map = maps.first;
    final riskData = jsonDecode(map['risk_data'] as String);
    return RiskAssessment.fromJson(riskData);
  }
  
  String _generateId(String address) {
    return address.toLowerCase().replaceAll(RegExp(r'[^\w\s]'), '').hashCode.toString();
  }
}
```

### 3. Synchronization Engine

#### Sync Manager

```dart
// lib/services/sync_manager.dart
class SyncManager {
  final ConnectivityService _connectivityService;
  final List<OfflineRepository> _repositories;
  final SyncQueue _syncQueue;
  
  bool _isSyncing = false;
  StreamController<SyncStatus> _syncStatusController = StreamController.broadcast();
  Timer? _periodicSyncTimer;
  
  SyncManager(
    this._connectivityService,
    this._repositories,
    this._syncQueue,
  );
  
  Stream<SyncStatus> get syncStatus => _syncStatusController.stream;
  
  /// Initialize sync manager and start periodic sync
  Future<void> initialize() async {
    // Listen for connectivity changes
    _connectivityService.connectivityStream.listen((isConnected) {
      if (isConnected && !_isSyncing) {
        _performSync();
      }
    });
    
    // Set up periodic sync (every 15 minutes when online)
    _periodicSyncTimer = Timer.periodic(
      const Duration(minutes: 15),
      (_) => _performSyncIfOnline(),
    );
    
    // Perform initial sync if online
    await _performSyncIfOnline();
  }
  
  /// Force a manual sync
  Future<void> forceSync() async {
    if (await _connectivityService.isConnected()) {
      await _performSync();
    } else {
      _syncStatusController.add(SyncStatus.offline());
    }
  }
  
  /// Queue an action for later sync
  Future<void> queueAction(SyncAction action) async {
    await _syncQueue.enqueue(action);
    
    // Try immediate sync if online
    if (await _connectivityService.isConnected()) {
      _performSync();
    }
  }
  
  Future<void> _performSyncIfOnline() async {
    if (await _connectivityService.isConnected()) {
      await _performSync();
    }
  }
  
  Future<void> _performSync() async {
    if (_isSyncing) return;
    
    _isSyncing = true;
    _syncStatusController.add(SyncStatus.syncing());
    
    try {
      // 1. Process outbound sync queue
      await _processSyncQueue();
      
      // 2. Pull fresh data for critical items
      await _pullCriticalData();
      
      // 3. Clean up expired cache
      await _cleanupExpiredData();
      
      _syncStatusController.add(SyncStatus.success());
    } catch (e) {
      _syncStatusController.add(SyncStatus.error(e.toString()));
    } finally {
      _isSyncing = false;
    }
  }
  
  Future<void> _processSyncQueue() async {
    final actions = await _syncQueue.getPendingActions();
    
    for (final action in actions) {
      try {
        await _processAction(action);
        await _syncQueue.markComplete(action.id);
      } catch (e) {
        await _syncQueue.markError(action.id, e.toString());
        
        // Retry logic
        if (action.retryCount < 3) {
          await _syncQueue.incrementRetry(action.id);
        }
      }
    }
  }
  
  Future<void> _processAction(SyncAction action) async {
    switch (action.entityType) {
      case 'favorite':
        await _syncFavorite(action);
        break;
      case 'user_settings':
        await _syncUserSettings(action);
        break;
      default:
        throw Exception('Unknown entity type: ${action.entityType}');
    }
  }
  
  Future<void> _syncFavorite(SyncAction action) async {
    // Sync favorite properties with the server
    final repository = _repositories.firstWhere(
      (r) => r is FavoritesRepository,
    ) as FavoritesRepository;
    
    await repository.syncAction(action);
  }
  
  Future<void> _syncUserSettings(SyncAction action) async {
    // Sync user settings with the server
    final repository = _repositories.firstWhere(
      (r) => r is UserSettingsRepository,
    ) as UserSettingsRepository;
    
    await repository.syncAction(action);
  }
  
  Future<void> _pullCriticalData() async {
    // Pull updates for user's favorite properties
    for (final repository in _repositories) {
      if (repository.supportsPull) {
        await repository.pullUpdates();
      }
    }
  }
  
  Future<void> _cleanupExpiredData() async {
    await SeawaterDatabase.cleanupExpiredData();
    
    for (final repository in _repositories) {
      if (repository.supportsCleanup) {
        await repository.cleanupExpiredData();
      }
    }
  }
  
  void dispose() {
    _periodicSyncTimer?.cancel();
    _syncStatusController.close();
  }
}

// Sync status models
sealed class SyncStatus {
  const SyncStatus();
  
  static SyncStatus offline() => const SyncOffline();
  static SyncStatus syncing() => const SyncInProgress();
  static SyncStatus success() => const SyncSuccess();
  static SyncStatus error(String message) => SyncError(message);
}

class SyncOffline extends SyncStatus {
  const SyncOffline();
}

class SyncInProgress extends SyncStatus {
  const SyncInProgress();
}

class SyncSuccess extends SyncStatus {
  const SyncSuccess();
}

class SyncError extends SyncStatus {
  final String message;
  const SyncError(this.message);
}
```

#### Sync Queue Implementation

```dart
// lib/services/sync_queue.dart
class SyncQueue {
  Future<void> enqueue(SyncAction action) async {
    final db = await SeawaterDatabase.database;
    
    await db.insert(
      'sync_queue',
      {
        'id': action.id,
        'action_type': action.actionType.name,
        'entity_type': action.entityType,
        'entity_id': action.entityId,
        'payload': jsonEncode(action.payload),
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'retry_count': 0,
        'last_error': null,
      },
    );
  }
  
  Future<List<SyncAction>> getPendingActions() async {
    final db = await SeawaterDatabase.database;
    
    final maps = await db.query(
      'sync_queue',
      orderBy: 'created_at ASC',
      limit: 50,
    );
    
    return maps.map((map) => SyncAction.fromMap(map)).toList();
  }
  
  Future<void> markComplete(String actionId) async {
    final db = await SeawaterDatabase.database;
    
    await db.delete(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [actionId],
    );
  }
  
  Future<void> markError(String actionId, String error) async {
    final db = await SeawaterDatabase.database;
    
    await db.update(
      'sync_queue',
      {'last_error': error},
      where: 'id = ?',
      whereArgs: [actionId],
    );
  }
  
  Future<void> incrementRetry(String actionId) async {
    final db = await SeawaterDatabase.database;
    
    await db.rawUpdate(
      'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
      [actionId],
    );
  }
  
  Future<int> getPendingCount() async {
    final db = await SeawaterDatabase.database;
    
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM sync_queue',
    );
    
    return result.first['count'] as int;
  }
}

// Sync action model
class SyncAction {
  final String id;
  final SyncActionType actionType;
  final String entityType;
  final String entityId;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int retryCount;
  final String? lastError;
  
  SyncAction({
    required this.id,
    required this.actionType,
    required this.entityType,
    required this.entityId,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
    this.lastError,
  });
  
  factory SyncAction.create({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> payload,
  }) {
    return SyncAction(
      id: const Uuid().v4(),
      actionType: SyncActionType.create,
      entityType: entityType,
      entityId: entityId,
      payload: payload,
      createdAt: DateTime.now(),
    );
  }
  
  factory SyncAction.update({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> payload,
  }) {
    return SyncAction(
      id: const Uuid().v4(),
      actionType: SyncActionType.update,
      entityType: entityType,
      entityId: entityId,
      payload: payload,
      createdAt: DateTime.now(),
    );
  }
  
  factory SyncAction.delete({
    required String entityType,
    required String entityId,
  }) {
    return SyncAction(
      id: const Uuid().v4(),
      actionType: SyncActionType.delete,
      entityType: entityType,
      entityId: entityId,
      payload: {},
      createdAt: DateTime.now(),
    );
  }
  
  factory SyncAction.fromMap(Map<String, dynamic> map) {
    return SyncAction(
      id: map['id'],
      actionType: SyncActionType.values.byName(map['action_type']),
      entityType: map['entity_type'],
      entityId: map['entity_id'],
      payload: jsonDecode(map['payload']),
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at']),
      retryCount: map['retry_count'] ?? 0,
      lastError: map['last_error'],
    );
  }
}

enum SyncActionType {
  create,
  update,
  delete,
}
```

### 4. Connectivity Detection

#### Connectivity Service

```dart
// lib/services/connectivity_service.dart
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final Dio _dio = Dio();
  
  StreamController<bool> _connectivityController = StreamController.broadcast();
  bool _isConnected = false;
  bool _hasInternetAccess = false;
  Timer? _connectivityCheckTimer;
  
  Stream<bool> get connectivityStream => _connectivityController.stream;
  bool get isConnected => _isConnected && _hasInternetAccess;
  
  Future<void> initialize() async {
    // Check initial connectivity
    await _checkConnectivity();
    
    // Listen for connectivity changes
    _connectivity.onConnectivityChanged.listen(_onConnectivityChanged);
    
    // Periodic internet access check (every 30 seconds)
    _connectivityCheckTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _checkInternetAccess(),
    );
  }
  
  Future<bool> isConnected() async {
    if (!_isConnected) {
      await _checkConnectivity();
    }
    return _isConnected && _hasInternetAccess;
  }
  
  Future<ConnectivityStatus> getConnectionStatus() async {
    final result = await _connectivity.checkConnectivity();
    final hasInternet = await _checkInternetAccess();
    
    return ConnectivityStatus(
      type: _mapConnectivityResult(result),
      hasInternetAccess: hasInternet,
      isMetered: await _isConnectionMetered(result),
    );
  }
  
  void _onConnectivityChanged(ConnectivityResult result) async {
    final wasConnected = _isConnected;
    _isConnected = result != ConnectivityResult.none;
    
    if (_isConnected && !wasConnected) {
      // Connection restored, check internet access
      await _checkInternetAccess();
    } else if (!_isConnected) {
      // Connection lost
      _hasInternetAccess = false;
      _connectivityController.add(false);
    }
  }
  
  Future<void> _checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _isConnected = result != ConnectivityResult.none;
    
    if (_isConnected) {
      await _checkInternetAccess();
    } else {
      _hasInternetAccess = false;
      _connectivityController.add(false);
    }
  }
  
  Future<bool> _checkInternetAccess() async {
    if (!_isConnected) {
      _hasInternetAccess = false;
      _connectivityController.add(false);
      return false;
    }
    
    try {
      // Try to reach a reliable endpoint
      final response = await _dio.head(
        'https://api.seawater.io/health',
        options: Options(
          sendTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );
      
      _hasInternetAccess = response.statusCode == 200;
    } catch (e) {
      // Fallback to Google DNS
      try {
        final response = await _dio.head(
          'https://8.8.8.8',
          options: Options(
            sendTimeout: const Duration(seconds: 3),
            receiveTimeout: const Duration(seconds: 3),
          ),
        );
        _hasInternetAccess = true;
      } catch (e) {
        _hasInternetAccess = false;
      }
    }
    
    _connectivityController.add(_hasInternetAccess);
    return _hasInternetAccess;
  }
  
  Future<bool> _isConnectionMetered(ConnectivityResult result) async {
    // On mobile data, consider connection as metered
    return result == ConnectivityResult.mobile;
  }
  
  ConnectionType _mapConnectivityResult(ConnectivityResult result) {
    switch (result) {
      case ConnectivityResult.wifi:
        return ConnectionType.wifi;
      case ConnectivityResult.mobile:
        return ConnectionType.mobile;
      case ConnectivityResult.ethernet:
        return ConnectionType.ethernet;
      case ConnectivityResult.none:
        return ConnectionType.none;
      default:
        return ConnectionType.unknown;
    }
  }
  
  void dispose() {
    _connectivityCheckTimer?.cancel();
    _connectivityController.close();
  }
}

class ConnectivityStatus {
  final ConnectionType type;
  final bool hasInternetAccess;
  final bool isMetered;
  
  const ConnectivityStatus({
    required this.type,
    required this.hasInternetAccess,
    required this.isMetered,
  });
  
  bool get isConnected => hasInternetAccess;
  bool get isWifi => type == ConnectionType.wifi;
  bool get isMobile => type == ConnectionType.mobile;
}

enum ConnectionType {
  wifi,
  mobile,
  ethernet,
  none,
  unknown,
}
```

### 5. Offline UI Components

#### Offline Status Indicator

```dart
// lib/widgets/offline/offline_status_indicator.dart
class OfflineStatusIndicator extends StatelessWidget {
  final ConnectivityService connectivityService;
  final SyncManager syncManager;
  
  const OfflineStatusIndicator({
    Key? key,
    required this.connectivityService,
    required this.syncManager,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<bool>(
      stream: connectivityService.connectivityStream,
      builder: (context, connectivitySnapshot) {
        return StreamBuilder<SyncStatus>(
          stream: syncManager.syncStatus,
          builder: (context, syncSnapshot) {
            final isConnected = connectivitySnapshot.data ?? false;
            final syncStatus = syncSnapshot.data;
            
            return AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              height: _shouldShowIndicator(isConnected, syncStatus) ? 32 : 0,
              child: _buildIndicatorContent(context, isConnected, syncStatus),
            );
          },
        );
      },
    );
  }
  
  bool _shouldShowIndicator(bool isConnected, SyncStatus? syncStatus) {
    if (!isConnected) return true;
    if (syncStatus is SyncInProgress || syncStatus is SyncError) return true;
    return false;
  }
  
  Widget _buildIndicatorContent(
    BuildContext context,
    bool isConnected,
    SyncStatus? syncStatus,
  ) {
    if (!isConnected) {
      return Container(
        color: Colors.orange[600],
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off, color: Colors.white, size: 16),
            SizedBox(width: 8),
            Text(
              'Offline - Some features limited',
              style: TextStyle(color: Colors.white, fontSize: 14),
            ),
          ],
        ),
      );
    }
    
    if (syncStatus is SyncInProgress) {
      return Container(
        color: Colors.blue[600],
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            SizedBox(width: 8),
            Text(
              'Syncing data...',
              style: TextStyle(color: Colors.white, fontSize: 14),
            ),
          ],
        ),
      );
    }
    
    if (syncStatus is SyncError) {
      return Container(
        color: Colors.red[600],
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.sync_problem, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            const Text(
              'Sync failed',
              style: TextStyle(color: Colors.white, fontSize: 14),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => syncManager.forceSync(),
              child: const Text(
                'Retry',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      );
    }
    
    return const SizedBox.shrink();
  }
}
```

#### Offline Data Card

```dart
// lib/widgets/offline/offline_data_card.dart
class OfflineDataCard extends StatelessWidget {
  final Widget child;
  final bool isFromCache;
  final DateTime? lastUpdated;
  final VoidCallback? onRefresh;
  
  const OfflineDataCard({
    Key? key,
    required this.child,
    required this.isFromCache,
    this.lastUpdated,
    this.onRefresh,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isFromCache) _buildCacheHeader(context),
          child,
        ],
      ),
    );
  }
  
  Widget _buildCacheHeader(BuildContext context) {
    final theme = Theme.of(context);
    final timeAgo = lastUpdated != null 
        ? _formatTimeAgo(lastUpdated!)
        : 'Unknown';
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(8),
          topRight: Radius.circular(8),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.cached,
            size: 16,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 6),
          Text(
            'Cached data • $timeAgo',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const Spacer(),
          if (onRefresh != null)
            GestureDetector(
              onTap: onRefresh,
              child: Icon(
                Icons.refresh,
                size: 16,
                color: theme.colorScheme.primary,
              ),
            ),
        ],
      ),
    );
  }
  
  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}
```

### 6. Data Prefetching

#### Prefetch Manager

```dart
// lib/services/prefetch_manager.dart
class PrefetchManager {
  final LocationService _locationService;
  final RiskAssessmentRepository _riskRepository;
  final ConnectivityService _connectivityService;
  final UserPreferencesService _userPreferences;
  
  bool _isPrefetching = false;
  
  PrefetchManager(
    this._locationService,
    this._riskRepository,
    this._connectivityService,
    this._userPreferences,
  );
  
  /// Prefetch data for user's current area
  Future<void> prefetchCurrentAreaData() async {
    if (_isPrefetching || !await _connectivityService.isConnected()) {
      return;
    }
    
    _isPrefetching = true;
    
    try {
      // Get current location
      final locationResult = await _locationService.getCurrentLocation();
      if (locationResult is! LocationSuccess) return;
      
      final location = locationResult.location;
      
      // Prefetch risk data for nearby areas
      await _prefetchNearbyRiskData(location);
      
      // Prefetch user's favorite properties
      await _prefetchFavoriteProperties();
      
      // Prefetch recent searches
      await _prefetchRecentSearches();
      
    } finally {
      _isPrefetching = false;
    }
  }
  
  /// Prefetch data for a specific route/area
  Future<void> prefetchRouteData(List<SeawaterLocation> waypoints) async {
    if (!await _connectivityService.isConnected()) return;
    
    for (final waypoint in waypoints) {
      await _prefetchNearbyRiskData(waypoint, radiusKm: 2.0);
    }
  }
  
  Future<void> _prefetchNearbyRiskData(
    SeawaterLocation center, {
    double radiusKm = 5.0,
  }) async {
    // Generate grid of points around the center
    final gridPoints = _generateGridPoints(center, radiusKm);
    
    for (final point in gridPoints) {
      try {
        // Try to get data for each grid point
        await _riskRepository.getRiskAssessment(
          '${point.latitude},${point.longitude}',
        );
        
        // Small delay to avoid overwhelming the API
        await Future.delayed(const Duration(milliseconds: 100));
      } catch (e) {
        // Continue with next point if this one fails
        continue;
      }
    }
  }
  
  Future<void> _prefetchFavoriteProperties() async {
    final favorites = await _userPreferences.getFavoriteProperties();
    
    for (final favorite in favorites) {
      try {
        await _riskRepository.getRiskAssessment(favorite.address);
        await Future.delayed(const Duration(milliseconds: 100));
      } catch (e) {
        continue;
      }
    }
  }
  
  Future<void> _prefetchRecentSearches() async {
    final recentSearches = await _userPreferences.getRecentSearches();
    
    for (final search in recentSearches.take(5)) {
      try {
        await _riskRepository.getRiskAssessment(search.address);
        await Future.delayed(const Duration(milliseconds: 100));
      } catch (e) {
        continue;
      }
    }
  }
  
  List<SeawaterLocation> _generateGridPoints(
    SeawaterLocation center,
    double radiusKm,
  ) {
    final points = <SeawaterLocation>[];
    const int gridSize = 3; // 3x3 grid
    
    final latStep = radiusKm / 111.0; // Approximate degrees per km for latitude
    final lngStep = radiusKm / (111.0 * cos(center.latitude * pi / 180));
    
    for (int i = -gridSize; i <= gridSize; i++) {
      for (int j = -gridSize; j <= gridSize; j++) {
        final lat = center.latitude + (i * latStep / gridSize);
        final lng = center.longitude + (j * lngStep / gridSize);
        
        points.add(SeawaterLocation.fromCoordinates(lat, lng));
      }
    }
    
    return points;
  }
}
```

### 7. Cache Management

#### Cache Policy Configuration

```dart
// lib/config/cache_config.dart
class CacheConfig {
  // Cache durations
  static const Duration riskAssessmentTTL = Duration(hours: 24);
  static const Duration propertySearchTTL = Duration(hours: 6);
  static const Duration mapTilesTTL = Duration(days: 7);
  static const Duration userFavoritesTTL = Duration.zero; // Never expire
  
  // Cache sizes
  static const int maxRiskAssessments = 500;
  static const int maxPropertySearches = 100;
  static const int maxMapTiles = 1000;
  
  // Prefetch settings
  static const double prefetchRadiusKm = 5.0;
  static const int maxPrefetchItems = 50;
  
  // Cleanup thresholds
  static const double cleanupThreshold = 0.8; // 80% full
  static const Duration cleanupInterval = Duration(hours: 6);
  
  // Network settings
  static const Duration apiTimeout = Duration(seconds: 30);
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 2);
}
```

## 📊 Performance Optimization

### Database Optimization

```dart
// lib/database/database_optimizer.dart
class DatabaseOptimizer {
  static Future<void> optimizeDatabase() async {
    final db = await SeawaterDatabase.database;
    
    // Run VACUUM to reclaim space
    await db.execute('VACUUM');
    
    // Update statistics for query optimization
    await db.execute('ANALYZE');
    
    // Set optimal pragma settings
    await db.execute('PRAGMA optimize');
    await db.execute('PRAGMA cache_size = 2000'); // 2MB cache
    await db.execute('PRAGMA temp_store = memory');
    await db.execute('PRAGMA mmap_size = 268435456'); // 256MB mmap
  }
  
  static Future<void> cleanupOldData() async {
    final db = await SeawaterDatabase.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    final oldThreshold = now - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    await db.transaction((txn) async {
      // Clean up old sync queue items
      await txn.delete(
        'sync_queue',
        where: 'created_at < ? AND retry_count >= 3',
        whereArgs: [oldThreshold],
      );
      
      // Clean up old property cache
      await txn.delete(
        'property_cache',
        where: 'created_at < ?',
        whereArgs: [oldThreshold],
      );
    });
  }
}
```

## 🧪 Testing Offline Functionality

### Offline Test Utilities

```dart
// test/utils/offline_test_utils.dart
class OfflineTestUtils {
  static Future<void> simulateOfflineMode() async {
    // Mock connectivity service to return false
    when(mockConnectivityService.isConnected()).thenAnswer((_) async => false);
    when(mockConnectivityService.connectivityStream)
        .thenAnswer((_) => Stream.value(false));
  }
  
  static Future<void> simulateOnlineMode() async {
    when(mockConnectivityService.isConnected()).thenAnswer((_) async => true);
    when(mockConnectivityService.connectivityStream)
        .thenAnswer((_) => Stream.value(true));
  }
  
  static Future<void> prepareOfflineData() async {
    // Pre-populate database with test data
    final repository = OfflineFirstRiskRepository(
      mockApiService,
      mockConnectivityService,
    );
    
    final testAssessment = RiskAssessment(
      address: '123 Test St, Test City, ST 12345',
      location: SeawaterLocation.fromCoordinates(40.7128, -74.0060),
      overallRisk: OverallRisk(score: 65, category: 'HIGH'),
      hazardRisks: {},
      lastUpdated: DateTime.now(),
      dataSources: ['test'],
    );
    
    await repository.cacheRiskAssessment(testAssessment);
  }
}
```

## 🚀 Production Considerations

### Monitoring and Analytics

```dart
// lib/services/offline_analytics.dart
class OfflineAnalytics {
  static void trackOfflineUsage(String feature, Duration duration) {
    // Track how long users spend in offline mode
    Analytics.track('offline_usage', {
      'feature': feature,
      'duration_seconds': duration.inSeconds,
    });
  }
  
  static void trackSyncPerformance(int itemsSynced, Duration syncTime) {
    Analytics.track('sync_performance', {
      'items_synced': itemsSynced,
      'sync_time_ms': syncTime.inMilliseconds,
    });
  }
  
  static void trackCacheHitRate(String dataType, bool isHit) {
    Analytics.track('cache_performance', {
      'data_type': dataType,
      'cache_hit': isHit,
    });
  }
}
```

### Error Recovery

```dart
// lib/services/error_recovery_service.dart
class ErrorRecoveryService {
  static Future<void> recoverFromCorruptedData() async {
    try {
      // Attempt to repair database
      await DatabaseOptimizer.optimizeDatabase();
    } catch (e) {
      // If repair fails, clear and reinitialize
      await _clearAndReinitialize();
    }
  }
  
  static Future<void> _clearAndReinitialize() async {
    // Clear all local data and start fresh
    await SeawaterDatabase._database?.close();
    
    final databasePath = await getDatabasesPath();
    await deleteDatabase(join(databasePath, SeawaterDatabase._databaseName));
    
    // Reinitialize
    await SeawaterDatabase.database;
  }
}
```

---

*This offline-first architecture ensures that the Seawater mobile application provides a reliable and responsive experience regardless of network connectivity, enabling users to access critical climate risk information anytime, anywhere.*