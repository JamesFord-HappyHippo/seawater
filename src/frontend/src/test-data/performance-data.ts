// Performance and Load Testing Data for Seawater Climate Risk Platform
// Comprehensive performance testing scenarios and load simulation data

import { 
  User, 
  PropertyRiskData, 
  APIUsage,
  SubscriptionTier
} from '../types';

// High-Volume User Interaction Scenarios
export const highVolumeUserScenarios = {
  // Peak usage simulation - hurricane season
  hurricane_season_peak: {
    scenario_name: "Hurricane Season Peak Traffic",
    duration_minutes: 60,
    peak_time: "2024-09-15T14:00:00Z", // During major hurricane approach
    user_simulation: {
      concurrent_users: 15000,
      new_users_per_minute: 250,
      returning_users_per_minute: 400,
      geographic_distribution: {
        "florida": 35,
        "texas": 20,
        "louisiana": 15,
        "south_carolina": 12,
        "north_carolina": 10,
        "other_states": 8
      }
    },
    usage_patterns: {
      property_searches_per_minute: 8500,
      api_calls_per_minute: 25000,
      report_generations_per_minute: 450,
      map_interactions_per_minute: 12000,
      mobile_app_usage_percent: 68
    },
    resource_utilization: {
      database_connections: {
        peak_concurrent: 890,
        average_response_time_ms: 245,
        slow_query_threshold_breaches: 23
      },
      api_gateway: {
        requests_per_second: 850,
        rate_limit_hits: 127,
        cache_hit_ratio: 0.72
      },
      cdn_performance: {
        bandwidth_gbps: 2.3,
        edge_cache_hit_ratio: 0.86,
        origin_requests_per_minute: 2400
      }
    }
  },

  // Real estate conference surge
  conference_surge_simulation: {
    scenario_name: "Real Estate Conference Demo Surge",
    duration_minutes: 120,
    peak_time: "2024-10-12T10:00:00Z",
    user_simulation: {
      concurrent_users: 5000,
      professional_users_percent: 85,
      demo_accounts: 200,
      trial_sign_ups_per_minute: 45
    },
    usage_patterns: {
      bulk_analysis_requests: 150,
      api_key_generations: 78,
      white_label_report_requests: 89,
      subscription_upgrades_per_minute: 12
    },
    business_metrics: {
      conversion_rate_lift: 0.23,
      average_session_duration_minutes: 42,
      feature_adoption_rate: 0.67,
      support_ticket_increase: 0.18
    }
  },

  // Market crash scenario
  market_volatility_spike: {
    scenario_name: "Market Volatility Climate Concern Spike",
    duration_minutes: 180,
    trigger_event: "Major climate disaster in populated area",
    user_simulation: {
      concurrent_users: 8500,
      panic_search_patterns: true,
      session_duration_increase: 2.4,
      comparison_tool_usage_spike: 3.1
    },
    search_patterns: {
      evacuation_route_searches: 450,
      insurance_estimate_requests: 1200,
      historical_event_lookups: 890,
      safe_area_comparisons: 2300
    }
  }
};

// Concurrent Location Request Test Data
export const concurrentLocationTests = {
  // Standard geocoding load test
  geocoding_load_test: {
    test_name: "Concurrent Geocoding Stress Test",
    concurrent_requests: 1000,
    duration_seconds: 300,
    request_patterns: [
      {
        pattern_type: "realistic_addresses",
        percentage: 70,
        examples: [
          "1234 Main Street, Austin, TX 78701",
          "567 Oak Avenue, Miami, FL 33132", 
          "890 Pine Road, Denver, CO 80202",
          "123 Elm Street, Portland, OR 97201"
        ],
        expected_success_rate: 0.95,
        expected_response_time_ms: 250
      },
      {
        pattern_type: "ambiguous_addresses",
        percentage: 20,
        examples: [
          "123 Main Street", // No city/state
          "Main St, Springfield", // Multiple Springfields
          "Downtown Miami", // Vague location
          "Near the beach, California" // Very vague
        ],
        expected_success_rate: 0.60,
        expected_response_time_ms: 450
      },
      {
        pattern_type: "invalid_addresses",
        percentage: 10,
        examples: [
          "123 Fake Street, Nowhere, XX 00000",
          "!!!@@@###",
          "",
          "12345"
        ],
        expected_success_rate: 0.05,
        expected_response_time_ms: 180
      }
    ],
    performance_targets: {
      average_response_time_ms: 300,
      p95_response_time_ms: 800,
      p99_response_time_ms: 1500,
      error_rate_threshold: 0.02,
      cache_hit_ratio_target: 0.65
    },
    scaling_thresholds: {
      auto_scale_trigger_rps: 500,
      max_instances: 20,
      scale_down_threshold_rps: 100,
      cooldown_period_seconds: 300
    }
  },

  // Mobile app location burst
  mobile_location_burst: {
    test_name: "Mobile App Location Request Burst",
    scenario: "App store feature notification drives downloads",
    concurrent_mobile_users: 2500,
    location_request_patterns: {
      "current_location_on_open": {
        frequency_percent: 85,
        accuracy_requirement: "high",
        timeout_ms: 5000,
        fallback_strategy: "last_known_location"
      },
      "search_around_me": {
        frequency_percent: 45,
        radius_km: 25,
        property_count_limit: 50,
        map_zoom_level: 12
      },
      "background_location_updates": {
        frequency_percent: 30,
        update_interval_minutes: 15,
        battery_optimization: true,
        geofence_monitoring: true
      }
    },
    device_distribution: {
      "ios": 55,
      "android": 45
    },
    network_conditions: {
      "wifi": 35,
      "4g_lte": 45,
      "3g": 15,
      "2g": 5
    },
    expected_performance: {
      location_acquisition_time_ms: 2500,
      search_completion_time_ms: 3200,
      battery_impact_rating: "low",
      data_usage_mb_per_session: 1.2
    }
  }
};

// Database Stress Testing Scenarios
export const databaseStressTests = {
  // High read volume test
  high_read_volume_test: {
    test_name: "Property Assessment Read Load Test",
    duration_minutes: 30,
    read_operations: {
      property_lookups_per_second: 500,
      risk_assessment_queries_per_second: 750,
      historical_data_queries_per_second: 200,
      user_profile_lookups_per_second: 300,
      cache_lookups_per_second: 2000
    },
    query_complexity_distribution: {
      simple_property_lookup: 40,
      complex_risk_calculation: 25,
      multi_table_joins: 20,
      aggregation_queries: 10,
      full_text_search: 5
    },
    performance_expectations: {
      average_query_time_ms: 45,
      p95_query_time_ms: 150,
      p99_query_time_ms: 500,
      connection_pool_utilization: 0.75,
      cpu_utilization_target: 0.70
    },
    scaling_configuration: {
      read_replicas: 3,
      connection_pool_size: 50,
      query_cache_size_mb: 512,
      index_optimization: true
    }
  },

  // Write-heavy scenario
  write_heavy_scenario: {
    test_name: "User Registration and Data Update Surge",
    duration_minutes: 45,
    write_operations: {
      user_registrations_per_minute: 150,
      property_assessments_created_per_minute: 300,
      user_preference_updates_per_minute: 200,
      search_history_writes_per_minute: 800,
      audit_log_entries_per_minute: 1200
    },
    transaction_patterns: {
      simple_inserts: 50,
      updates_with_concurrency: 25,
      batch_operations: 15,
      cross_table_transactions: 10
    },
    consistency_requirements: {
      user_data_consistency: "strong",
      property_data_consistency: "eventual",
      analytics_data_consistency: "eventual",
      audit_log_consistency: "strong"
    },
    performance_targets: {
      transaction_commit_time_ms: 25,
      deadlock_rate_threshold: 0.001,
      replication_lag_ms: 100,
      backup_impact_acceptable: true
    }
  },

  // Mixed workload simulation
  mixed_workload_simulation: {
    test_name: "Realistic Mixed Database Workload",
    duration_minutes: 60,
    workload_distribution: {
      read_operations: 75,
      write_operations: 20,
      analytical_queries: 5
    },
    peak_load_factors: {
      morning_surge: 1.8, // 9-11 AM
      lunch_dip: 0.6,     // 12-1 PM  
      afternoon_peak: 2.2, // 2-4 PM
      evening_decline: 0.4  // 6-8 PM
    },
    geographic_load_distribution: {
      east_coast: 40,
      central: 25,
      west_coast: 30,
      international: 5
    },
    resource_monitoring: {
      cpu_utilization: { target: 65, alert: 85, critical: 95 },
      memory_utilization: { target: 70, alert: 85, critical: 95 },
      disk_io_ops_per_second: { target: 1000, alert: 2000, critical: 3000 },
      network_throughput_mbps: { target: 100, alert: 200, critical: 300 }
    }
  }
};

// API Rate Limiting Test Cases
export const apiRateLimitingTests = {
  // Subscription tier rate limiting
  subscription_tier_limits: {
    free_tier_test: {
      tier: "free" as SubscriptionTier,
      limits: {
        requests_per_minute: 10,
        requests_per_month: 100,
        burst_allowance: 5,
        rate_limit_window_seconds: 60
      },
      test_scenarios: [
        {
          scenario: "normal_usage",
          requests_per_minute: 8,
          expected_success_rate: 1.0,
          expected_throttling: false
        },
        {
          scenario: "burst_usage",
          requests_in_10_seconds: 15,
          expected_success_rate: 0.67,
          expected_throttling: true,
          retry_after_seconds: 50
        },
        {
          scenario: "monthly_limit_reached",
          total_monthly_requests: 100,
          additional_request: true,
          expected_response: "quota_exceeded",
          upgrade_prompt: true
        }
      ]
    },

    premium_tier_test: {
      tier: "premium" as SubscriptionTier,
      limits: {
        requests_per_minute: 100,
        requests_per_month: 1000,
        burst_allowance: 50,
        rate_limit_window_seconds: 60
      },
      test_scenarios: [
        {
          scenario: "heavy_usage",
          requests_per_minute: 95,
          expected_success_rate: 1.0,
          expected_throttling: false
        },
        {
          scenario: "burst_tolerance",
          requests_in_10_seconds: 150,
          expected_success_rate: 0.83,
          expected_throttling: true,
          burst_recovery_time_seconds: 30
        }
      ]
    },

    professional_tier_test: {
      tier: "professional" as SubscriptionTier,
      limits: {
        requests_per_minute: 500,
        requests_per_month: 10000,
        burst_allowance: 200,
        rate_limit_window_seconds: 60
      },
      test_scenarios: [
        {
          scenario: "bulk_analysis_workload",
          sustained_rps: 8,
          duration_minutes: 60,
          expected_success_rate: 1.0,
          expected_throttling: false
        },
        {
          scenario: "api_integration_spike",
          requests_in_60_seconds: 700,
          expected_success_rate: 0.85,
          graceful_degradation: true
        }
      ]
    }
  },

  // Abuse prevention testing
  abuse_prevention_tests: {
    bot_detection: {
      patterns_to_detect: [
        "identical_requests_rapid_succession",
        "sequential_property_enumeration", 
        "no_user_agent_or_suspicious_agent",
        "requests_from_known_bot_networks"
      ],
      detection_thresholds: {
        identical_requests_count: 50,
        time_window_seconds: 60,
        suspicious_user_agent_score: 0.8,
        ip_reputation_threshold: 0.3
      },
      mitigation_strategies: [
        "temporary_ip_ban",
        "captcha_challenge",
        "account_verification_required",
        "rate_limit_reduction"
      ]
    },

    ddos_protection: {
      attack_simulation: {
        concurrent_attackers: 1000,
        requests_per_second_per_attacker: 10,
        attack_duration_minutes: 15,
        target_endpoints: [
          "/api/property/risk-assessment",
          "/api/geocoding/search",
          "/api/user/register"
        ]
      },
      protection_layers: {
        cloudflare_protection: true,
        application_layer_filtering: true,
        rate_limiting_per_ip: true,
        geographic_blocking: false
      },
      success_criteria: {
        legitimate_user_impact_max: 0.05,
        service_availability_min: 0.99,
        response_time_degradation_max: 1.5,
        attack_mitigation_time_max_minutes: 5
      }
    }
  }
};

// Mobile Network Condition Simulations
export const mobileNetworkSimulations = {
  // Various network condition scenarios
  network_conditions: [
    {
      condition_name: "excellent_wifi",
      bandwidth_mbps: 50,
      latency_ms: 20,
      packet_loss_percent: 0,
      jitter_ms: 2,
      expected_user_experience: "optimal",
      image_quality: "full",
      map_tile_loading: "instant",
      api_response_time_ms: 200
    },
    {
      condition_name: "good_4g_lte",
      bandwidth_mbps: 15,
      latency_ms: 60,
      packet_loss_percent: 1,
      jitter_ms: 10,
      expected_user_experience: "good",
      image_quality: "high",
      map_tile_loading: "fast",
      api_response_time_ms: 350
    },
    {
      condition_name: "poor_3g",
      bandwidth_mbps: 2,
      latency_ms: 200,
      packet_loss_percent: 5,
      jitter_ms: 50,
      expected_user_experience: "degraded",
      image_quality: "medium",
      map_tile_loading: "slow",
      api_response_time_ms: 1200,
      adaptive_features: [
        "compress_images",
        "reduce_map_quality", 
        "cache_aggressively",
        "show_loading_indicators"
      ]
    },
    {
      condition_name: "very_poor_2g",
      bandwidth_mbps: 0.1,
      latency_ms: 500,
      packet_loss_percent: 10,
      jitter_ms: 100,
      expected_user_experience: "minimal",
      image_quality: "low",
      map_tile_loading: "very_slow",
      api_response_time_ms: 5000,
      fallback_strategies: [
        "text_only_mode",
        "offline_cached_data",
        "simplified_ui",
        "request_queuing"
      ]
    }
  ],

  // Network transition scenarios
  network_transitions: [
    {
      transition_name: "wifi_to_cellular",
      initial_condition: "excellent_wifi",
      final_condition: "good_4g_lte",
      transition_duration_seconds: 3,
      user_impact: {
        connection_interruption: true,
        data_loss_risk: false,
        retry_required: true,
        user_notification: "switching_networks"
      },
      app_behavior: {
        detect_transition: true,
        pause_large_downloads: true,
        switch_to_cellular_optimized_mode: true,
        resume_operations_when_stable: true
      }
    },
    {
      transition_name: "cellular_to_no_connection",
      initial_condition: "poor_3g",
      final_condition: "offline",
      transition_duration_seconds: 1,
      user_impact: {
        immediate_feedback: true,
        offline_mode_activation: true,
        cached_data_access: true,
        sync_queue_activation: true
      }
    }
  ],

  // Battery and data usage optimization
  resource_optimization: {
    battery_conservation: {
      background_refresh_reduction: 0.6,
      location_update_frequency_reduction: 0.4,
      push_notification_batching: true,
      screen_dimming_detection: true
    },
    data_usage_optimization: {
      image_compression_level: 0.7,
      api_response_compression: true,
      delta_sync_enabled: true,
      prefetch_disabled_on_cellular: true
    },
    performance_monitoring: {
      battery_usage_benchmark_mah: 50,
      data_usage_benchmark_mb_per_session: 2.5,
      cpu_usage_benchmark_percent: 15,
      memory_usage_benchmark_mb: 100
    }
  }
};

// Performance Benchmarks and SLA Targets
export const performanceBenchmarks = {
  // Response time targets by operation
  response_time_slas: {
    property_search: {
      target_ms: 500,
      acceptable_ms: 1000,
      unacceptable_ms: 2000,
      measurement_percentile: 95
    },
    risk_assessment: {
      target_ms: 800,
      acceptable_ms: 1500,
      unacceptable_ms: 3000,
      measurement_percentile: 95
    },
    map_tile_loading: {
      target_ms: 200,
      acceptable_ms: 500,
      unacceptable_ms: 1000,
      measurement_percentile: 90
    },
    user_authentication: {
      target_ms: 300,
      acceptable_ms: 600,
      unacceptable_ms: 1200,
      measurement_percentile: 99
    }
  },

  // Availability targets
  availability_slas: {
    overall_uptime: 99.9,
    api_availability: 99.95,
    database_availability: 99.99,
    cdn_availability: 99.9,
    planned_maintenance_hours_per_month: 4
  },

  // Scalability targets
  scalability_targets: {
    concurrent_users_supported: 25000,
    requests_per_second_peak: 2000,
    data_storage_growth_tb_per_month: 0.5,
    auto_scaling_response_time_minutes: 3,
    geographic_regions_supported: 5
  }
};

export const performanceData = {
  highVolumeUsers: highVolumeUserScenarios,
  concurrentLocation: concurrentLocationTests,
  databaseStress: databaseStressTests,
  apiRateLimiting: apiRateLimitingTests,
  mobileNetwork: mobileNetworkSimulations,
  benchmarks: performanceBenchmarks
};