// Mobile App Testing Scenarios for Seawater Climate Risk Platform
// Comprehensive mobile-specific testing data including permissions, offline mode, notifications

import { 
  User, 
  PropertyRiskData, 
  Coordinates,
  HazardType,
  RiskLevel
} from '../types';

// Location Permission Flow Test Data
export const locationPermissionFlows = {
  // First-time user - permission request flow
  first_time_permission_flow: {
    user_id: "mobile_user_001",
    device_info: {
      platform: "iOS",
      version: "17.5.1",
      device_model: "iPhone 14 Pro",
      app_version: "1.2.3",
      locale: "en-US"
    },
    permission_flow: {
      step_1: {
        trigger: "app_launch",
        timestamp: "2024-08-21T10:00:00Z",
        action: "show_location_rationale",
        ui_element: "location_permission_modal",
        user_response: "allow_location"
      },
      step_2: {
        trigger: "user_allow_location",
        timestamp: "2024-08-21T10:00:15Z",
        action: "request_system_permission",
        system_dialog: "ios_location_permission",
        user_response: "allow_while_using_app"
      },
      step_3: {
        trigger: "permission_granted",
        timestamp: "2024-08-21T10:00:20Z",
        action: "get_current_location",
        location_result: {
          success: true,
          coordinates: { latitude: 25.7617, longitude: -80.1918 },
          accuracy: 5.2,
          timestamp: "2024-08-21T10:00:22Z"
        }
      },
      step_4: {
        trigger: "location_obtained",
        timestamp: "2024-08-21T10:00:22Z",
        action: "auto_search_current_location",
        search_triggered: true
      }
    },
    outcome: {
      permission_status: "granted_when_in_use",
      location_services_enabled: true,
      auto_search_successful: true,
      onboarding_completed: true
    }
  },

  // Permission denied scenario
  permission_denied_scenario: {
    user_id: "mobile_user_002",
    device_info: {
      platform: "Android",
      version: "14",
      device_model: "Samsung Galaxy S24",
      app_version: "1.2.3",
      locale: "en-US"
    },
    permission_flow: {
      step_1: {
        trigger: "app_launch",
        timestamp: "2024-08-21T10:00:00Z",
        action: "show_location_rationale",
        ui_element: "location_permission_modal",
        user_response: "deny_location"
      },
      step_2: {
        trigger: "user_deny_location",
        timestamp: "2024-08-21T10:00:10Z",
        action: "show_fallback_ui",
        fallback_options: ["manual_address_entry", "use_last_known_location", "browse_popular_locations"]
      },
      step_3: {
        trigger: "user_select_manual_entry",
        timestamp: "2024-08-21T10:00:45Z",
        action: "show_address_search",
        search_query: "123 Main Street, Miami, FL"
      }
    },
    outcome: {
      permission_status: "denied",
      location_services_enabled: false,
      fallback_method_used: "manual_address_entry",
      user_friction_level: "medium"
    },
    recovery_strategies: [
      "show_location_benefits_education",
      "periodic_permission_re-request",
      "settings_deep_link_option"
    ]
  },

  // Previously denied - settings recovery flow
  settings_recovery_flow: {
    user_id: "mobile_user_003",
    device_info: {
      platform: "iOS",
      version: "17.5.1",
      device_model: "iPhone 15",
      app_version: "1.2.3"
    },
    current_state: {
      permission_status: "denied",
      previous_denials: 2,
      last_denial_date: "2024-08-15T14:30:00Z",
      user_engagement_level: "high"
    },
    recovery_attempt: {
      trigger: "user_initiated_location_search",
      timestamp: "2024-08-21T10:00:00Z",
      ui_flow: {
        step_1: "show_permission_blocked_modal",
        step_2: "explain_settings_navigation",
        step_3: "deep_link_to_settings",
        step_4: "return_to_app_flow"
      },
      user_actions: [
        {
          action: "tap_go_to_settings",
          timestamp: "2024-08-21T10:00:30Z"
        },
        {
          action: "enable_location_in_settings",
          timestamp: "2024-08-21T10:01:15Z"
        },
        {
          action: "return_to_app",
          timestamp: "2024-08-21T10:01:30Z"
        }
      ]
    },
    outcome: {
      permission_status: "granted_always",
      recovery_successful: true,
      user_satisfaction_increase: 0.8,
      likelihood_to_recommend_increase: 0.6
    }
  }
};

// Offline Mode Test Scenarios
export const offlineModeScenarios = {
  // Cached data available scenario
  cached_data_available: {
    user_id: "offline_user_001",
    network_state: "offline",
    cached_data: {
      last_searched_properties: [
        {
          property: {
            id: "cached_prop_001",
            address: "1000 Biscayne Blvd, Miami, FL 33132",
            formatted_address: "1000 Biscayne Blvd, Miami, FL 33132, USA",
            coordinates: { latitude: 25.7847, longitude: -80.1878 },
            property_type: "residential" as const
          },
          risk_assessment: {
            overall_score: 78,
            risk_level: "HIGH" as RiskLevel,
            last_updated: "2024-08-20T15:30:00Z",
            data_freshness: "stale" as const,
            confidence_score: 96,
            data_completeness: 98,
            hazards: {
              hurricane: {
                score: 89,
                level: "VERY_HIGH" as RiskLevel,
                sources: {
                  fema: { name: "FEMA NRI", score: 92, confidence: 98 }
                }
              }
            }
          },
          cached_at: "2024-08-20T16:00:00Z",
          expires_at: "2024-08-27T16:00:00Z"
        }
      ],
      user_preferences: {
        default_radius_km: 10,
        preferred_risk_sources: ["fema"],
        units: "imperial" as const,
        theme: "light" as const
      },
      recent_searches: [
        {
          query: "Miami, FL",
          timestamp: "2024-08-20T15:30:00Z",
          result_count: 1
        }
      ]
    },
    offline_capabilities: {
      view_cached_assessments: true,
      browse_recent_searches: true,
      access_help_content: true,
      modify_preferences: true,
      queue_new_searches: true
    },
    user_experience: {
      data_staleness_indicators: true,
      offline_mode_banner: true,
      sync_pending_badge: true,
      estimated_sync_time: "when_connection_restored"
    }
  },

  // No cached data scenario
  no_cached_data: {
    user_id: "offline_user_002",
    network_state: "offline",
    cached_data: {
      last_searched_properties: [],
      recent_searches: [],
      cached_content: ["app_tutorial", "faq_content", "basic_help"]
    },
    offline_capabilities: {
      view_cached_assessments: false,
      browse_recent_searches: false,
      access_help_content: true,
      queue_new_searches: true,
      browse_sample_data: true
    },
    fallback_experience: {
      show_sample_assessments: true,
      provide_educational_content: true,
      explain_offline_limitations: true,
      encourage_connection_retry: true
    },
    queued_actions: [
      {
        action_type: "property_search",
        query: "123 Test Street, Austin, TX",
        queued_at: "2024-08-21T10:00:00Z",
        will_execute_when_online: true
      }
    ]
  },

  // Partial connectivity scenario
  partial_connectivity: {
    user_id: "offline_user_003",
    network_state: "limited",
    connection_quality: {
      type: "cellular_2g",
      speed_kbps: 56,
      latency_ms: 800,
      packet_loss_percent: 5,
      reliability: "poor"
    },
    adaptive_behavior: {
      reduce_image_quality: true,
      compress_api_responses: true,
      cache_aggressively: true,
      show_loading_indicators: true,
      timeout_requests_early: true
    },
    user_experience_optimizations: [
      "prioritize_text_over_images",
      "show_simplified_ui",
      "defer_non_critical_requests",
      "provide_retry_mechanisms",
      "estimate_loading_times"
    ],
    network_recovery: {
      background_sync_enabled: true,
      retry_failed_requests: true,
      update_cached_data: true,
      notify_user_when_sync_complete: true
    }
  }
};

// Push Notification Test Scenarios
export const pushNotificationScenarios = {
  // Weather alert notifications
  weather_alert_notifications: {
    user_id: "notification_user_001",
    notification_settings: {
      weather_alerts: true,
      severe_weather_only: false,
      location_based: true,
      quiet_hours: {
        enabled: true,
        start: "22:00",
        end: "07:00"
      }
    },
    location_monitoring: {
      home_address: "1000 Biscayne Blvd, Miami, FL 33132",
      work_address: "200 S Biscayne Blvd, Miami, FL 33131",
      monitored_locations: [
        { latitude: 25.7847, longitude: -80.1878, name: "Home" },
        { latitude: 25.7753, longitude: -80.1901, name: "Work" }
      ]
    },
    alert_scenarios: [
      {
        alert_type: "hurricane_watch",
        severity: "high",
        title: "Hurricane Watch Issued",
        body: "Hurricane watch issued for Miami-Dade County. Monitor conditions and prepare for potential evacuation.",
        trigger_conditions: {
          distance_km: 15,
          alert_category: "hurricane",
          severity_threshold: "watch"
        },
        scheduled_time: "2024-08-21T08:00:00Z",
        delivery_status: "delivered",
        user_action: "opened_app"
      },
      {
        alert_type: "heat_advisory",
        severity: "medium",
        title: "Heat Advisory in Effect",
        body: "Heat index values expected to reach 105-108°F. Stay hydrated and limit outdoor activities.",
        trigger_conditions: {
          distance_km: 10,
          alert_category: "heat",
          severity_threshold: "advisory"
        },
        scheduled_time: "2024-08-21T07:30:00Z",
        delivery_status: "delivered",
        user_action: "dismissed"
      }
    ]
  },

  // Risk assessment update notifications
  risk_update_notifications: {
    user_id: "notification_user_002",
    notification_settings: {
      property_updates: true,
      significant_changes_only: true,
      favorite_properties: ["prop_001", "prop_002"],
      update_frequency: "weekly"
    },
    update_scenarios: [
      {
        notification_type: "risk_score_change",
        property_id: "prop_001",
        property_address: "123 Oak Street, Austin, TX",
        title: "Risk Score Updated",
        body: "Wildfire risk increased from Moderate to High due to drought conditions. Tap to view details.",
        change_details: {
          previous_score: 42,
          new_score: 58,
          primary_driver: "wildfire_risk_increase",
          confidence_change: 0.03
        },
        scheduled_time: "2024-08-21T09:00:00Z",
        delivery_status: "delivered",
        user_action: "viewed_property"
      },
      {
        notification_type: "new_data_available",
        property_id: "prop_002",
        property_address: "456 Pine Avenue, Denver, CO",
        title: "New Climate Data Available",
        body: "Updated flood maps now available for your saved property. Risk assessment refreshed.",
        data_update_details: {
          data_source: "FEMA Flood Maps 2024",
          assessment_refreshed: true,
          score_changed: false
        },
        scheduled_time: "2024-08-21T10:30:00Z",
        delivery_status: "pending"
      }
    ]
  },

  // Subscription and usage notifications
  subscription_notifications: {
    user_id: "notification_user_003",
    subscription_tier: "premium",
    notification_scenarios: [
      {
        notification_type: "trial_expiring",
        title: "Premium Trial Ending Soon",
        body: "Your premium trial expires in 3 days. Upgrade now to keep unlimited access.",
        trigger_conditions: {
          days_until_expiry: 3,
          usage_level: "high",
          conversion_likelihood: "medium"
        },
        cta_button: "Upgrade Now",
        scheduled_time: "2024-08-21T11:00:00Z",
        delivery_status: "delivered",
        user_action: "viewed_pricing"
      },
      {
        notification_type: "usage_limit_approaching",
        title: "Monthly Search Limit",
        body: "You've used 8 of 10 monthly searches. Consider upgrading for unlimited access.",
        trigger_conditions: {
          usage_percent: 80,
          tier: "free",
          time_remaining_in_period: "12 days"
        },
        scheduled_time: "2024-08-21T15:00:00Z",
        delivery_status: "scheduled"
      }
    ]
  },

  // Notification delivery failures
  notification_failures: {
    user_id: "notification_user_004",
    failure_scenarios: [
      {
        notification_id: "notif_001",
        failure_type: "device_unreachable",
        error_code: "APNs_DeviceTokenNotFound",
        retry_attempts: 3,
        fallback_strategy: "email_notification",
        final_status: "delivered_via_email"
      },
      {
        notification_id: "notif_002",
        failure_type: "permission_revoked",
        error_code: "FCM_NotRegistered",
        user_notification_settings: {
          system_permission: false,
          app_permission: true
        },
        recovery_strategy: "show_permission_prompt_in_app"
      }
    ]
  }
};

// App Store Review and Rating Test Data
export const appStoreTestData = {
  // Positive review scenarios
  positive_reviews: [
    {
      review_id: "review_001",
      user_profile: "power_user_realtor",
      rating: 5,
      title: "Essential for Real Estate Professionals",
      content: "This app has transformed how I assess properties for my clients. The detailed climate risk data helps me provide valuable insights that other agents can't match. The hurricane and flood risk data for Florida properties is incredibly accurate.",
      user_journey: {
        subscription_tier: "professional",
        months_subscribed: 8,
        properties_analyzed: 250,
        features_used: ["bulk_analysis", "client_reports", "api_integration"],
        conversion_path: "free_trial_to_professional"
      },
      review_metadata: {
        app_version: "1.2.3",
        device: "iPhone 14 Pro",
        date_submitted: "2024-08-15T14:30:00Z",
        verified_purchase: true,
        helpful_votes: 23
      }
    },
    {
      review_id: "review_002",
      user_profile: "homebuyer_first_time",
      rating: 4,
      title: "Helped me avoid a costly mistake",
      content: "Almost bought a house in a high flood risk area before using this app. The detailed risk assessment showed me the true flood risk that wasn't obvious from the listing. Saved me thousands in potential future damages!",
      user_journey: {
        subscription_tier: "premium",
        months_subscribed: 2,
        properties_analyzed: 12,
        features_used: ["property_search", "risk_comparison", "insurance_estimates"],
        conversion_trigger: "trial_limit_reached"
      },
      review_metadata: {
        app_version: "1.2.1",
        device: "Samsung Galaxy S23",
        date_submitted: "2024-08-10T09:15:00Z",
        verified_purchase: true,
        helpful_votes: 31
      }
    }
  ],

  // Critical feedback scenarios
  critical_reviews: [
    {
      review_id: "review_003",
      user_profile: "price_sensitive_casual",
      rating: 2,
      title: "Too expensive for occasional use",
      content: "The data seems good but $49/month is way too much for someone who only needs to check a few properties. Wish there was a pay-per-search option or cheaper tier for casual users.",
      user_journey: {
        subscription_tier: "free",
        trial_completed: false,
        properties_analyzed: 10,
        conversion_attempts: 2,
        churn_reasons: ["price_objection", "infrequent_use"]
      },
      review_metadata: {
        app_version: "1.2.2",
        device: "iPhone 12",
        date_submitted: "2024-08-18T16:45:00Z",
        verified_purchase: false,
        helpful_votes: 18
      },
      response_strategy: {
        acknowledge_feedback: true,
        highlight_value_proposition: true,
        mention_upcoming_features: "per_search_pricing",
        offer_support: true
      }
    },
    {
      review_id: "review_004",
      user_profile: "technical_user_frustrated",
      rating: 3,
      title: "Good data but app crashes frequently",
      content: "Love the comprehensive risk data but the app crashes every time I try to generate a report. Also the loading times are really slow. Fix the technical issues and this would be 5 stars.",
      user_journey: {
        subscription_tier: "premium", 
        months_subscribed: 1,
        support_tickets: 3,
        crash_reports: 7,
        technical_issues: ["report_generation_crashes", "slow_loading", "memory_leaks"]
      },
      review_metadata: {
        app_version: "1.2.0",
        device: "iPhone 13 Pro Max",
        date_submitted: "2024-08-12T11:20:00Z",
        verified_purchase: true,
        helpful_votes: 8
      },
      internal_follow_up: {
        bug_report_created: true,
        priority: "high",
        assigned_to_team: "mobile_engineering",
        eta_fix: "1.2.4 release"
      }
    }
  ],

  // Review response strategies
  review_response_templates: {
    positive_response: {
      template: "Thank you for the fantastic review, {user_name}! We're thrilled that Seawater has been valuable for your {use_case}. Reviews like yours help us continue improving our climate risk platform. If you have any feature suggestions, please reach out to our team!",
      personalization_fields: ["user_name", "use_case", "subscription_tier"],
      response_time_target: "24_hours"
    },
    critical_response: {
      template: "Thank you for your honest feedback, {user_name}. We understand your concerns about {issue_mentioned} and are actively working on improvements. Our team would love to connect with you directly to discuss your experience further. Please email us at support@seawater.com.",
      personalization_fields: ["user_name", "issue_mentioned", "subscription_status"],
      escalation_required: true,
      follow_up_required: true
    },
    technical_issue_response: {
      template: "We sincerely apologize for the technical issues you've experienced, {user_name}. This is not the experience we want for our users. Our engineering team is actively working on fixes for the issues you've reported. We'll reach out directly with updates and would love to have you test the upcoming improvements.",
      personalization_fields: ["user_name", "specific_issues"],
      internal_escalation: "engineering_team",
      beta_test_invitation: true
    }
  },

  // App store optimization data
  aso_metrics: {
    keyword_rankings: {
      primary_keywords: [
        { keyword: "climate risk", ranking: 3, search_volume: 2400 },
        { keyword: "flood risk map", ranking: 5, search_volume: 3200 },
        { keyword: "hurricane tracker", ranking: 12, search_volume: 8500 },
        { keyword: "property risk assessment", ranking: 7, search_volume: 1800 }
      ],
      competitor_analysis: [
        { competitor: "Zillow", keywords_overlapping: 15, average_ranking_diff: -3 },
        { competitor: "Realtor.com", keywords_overlapping: 12, average_ranking_diff: -1 },
        { competitor: "FloodSmart", keywords_overlapping: 8, average_ranking_diff: 2 }
      ]
    },
    conversion_metrics: {
      listing_view_to_install: 4.2,
      install_to_first_open: 89.5,
      first_open_to_registration: 67.8,
      registration_to_first_search: 78.3
    },
    seasonal_trends: {
      peak_download_months: ["March", "April", "August", "September"],
      hurricane_season_boost: 2.3,
      home_buying_season_boost: 1.8
    }
  }
};

// Social Sharing Test Scenarios
export const socialSharingScenarios = {
  // Property risk sharing
  property_risk_sharing: [
    {
      sharing_scenario: "high_risk_property_warning",
      user_context: {
        user_type: "concerned_friend",
        relationship: "helping_friend_house_hunt"
      },
      shared_content: {
        property_address: "123 Coastal Drive, Miami Beach, FL",
        risk_level: "VERY_HIGH" as RiskLevel,
        primary_concerns: ["hurricane", "coastal_flooding"],
        sharing_message: "Hey Sarah, I checked out that house you were looking at. The hurricane and flood risk is really high. Maybe worth looking at properties further inland?",
        included_data: {
          risk_score: 87,
          hurricane_risk: 92,
          flood_risk: 89,
          insurance_estimate: "$6,800/year"
        }
      },
      platform_variants: {
        text_message: {
          format: "simplified_text_with_link",
          character_limit: 160,
          includes_map_thumbnail: false
        },
        email: {
          format: "detailed_report_summary",
          includes_charts: true,
          includes_recommendations: true
        },
        social_media: {
          format: "infographic_style",
          includes_branded_overlay: true,
          hashtags: ["#ClimateRisk", "#RealEstate", "#FloodRisk"]
        }
      }
    },
    {
      sharing_scenario: "realtor_client_education",
      user_context: {
        user_type: "real_estate_professional",
        subscription_tier: "professional"
      },
      shared_content: {
        property_address: "456 Suburban Lane, Austin, TX",
        risk_level: "MODERATE" as RiskLevel,
        sharing_purpose: "client_education",
        professional_branding: true,
        included_analysis: {
          risk_breakdown: true,
          historical_events: true,
          mitigation_recommendations: true,
          insurance_guidance: true
        }
      },
      customization_options: {
        white_label_branding: true,
        custom_agent_info: true,
        company_logo: true,
        contact_information: true
      }
    }
  ],

  // Educational content sharing
  educational_sharing: [
    {
      content_type: "climate_trend_awareness",
      sharing_context: "community_education",
      shared_content: {
        title: "Understanding Climate Risk in Our Neighborhood",
        summary: "Local climate patterns are changing. Here's what homeowners should know about flood and heat risks in our area.",
        data_highlights: [
          "30% increase in extreme heat days over last decade",
          "Updated flood zones affect 500+ local properties",
          "Simple steps can reduce risk by 40%"
        ],
        call_to_action: "Check your property's risk score"
      },
      sharing_platforms: {
        nextdoor: {
          neighborhood_focused: true,
          local_statistics: true,
          community_discussion_encouraged: true
        },
        facebook: {
          shareable_infographic: true,
          discussion_prompts: true,
          local_group_targeting: true
        }
      }
    }
  ],

  // Viral sharing metrics
  viral_metrics: {
    sharing_rates_by_content: {
      "high_risk_property_alerts": 23.5,
      "insurance_cost_comparisons": 18.2,
      "climate_trend_infographics": 15.7,
      "mitigation_success_stories": 12.3
    },
    platform_performance: {
      text_message: { share_rate: 31.2, conversion_rate: 8.7 },
      email: { share_rate: 19.8, conversion_rate: 12.4 },
      facebook: { share_rate: 15.6, conversion_rate: 6.2 },
      twitter: { share_rate: 8.9, conversion_rate: 4.1 }
    },
    viral_coefficients: {
      overall: 0.42,
      power_users: 0.78,
      real_estate_professionals: 1.23,
      concerned_homeowners: 0.31
    }
  }
};

export const mobileScenarios = {
  locationPermissions: locationPermissionFlows,
  offlineMode: offlineModeScenarios,
  pushNotifications: pushNotificationScenarios,
  appStore: appStoreTestData,
  socialSharing: socialSharingScenarios
};