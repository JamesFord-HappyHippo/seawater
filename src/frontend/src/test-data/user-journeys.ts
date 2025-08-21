// User Journey Test Data for Seawater Climate Risk Platform
// Comprehensive user flow scenarios from registration to subscription management

import { 
  User, 
  SubscriptionTier, 
  UserPreferences, 
  APIUsage,
  PropertyRiskData,
  SearchFormData
} from '../types';

// User Registration Flow Test Data
export const userRegistrationFlows = {
  // Standard registration flow
  new_homebuyer_registration: {
    user_id: "test_user_001",
    registration_step: "personal_info",
    form_data: {
      email: "sarah.homebuyer@example.com",
      first_name: "Sarah",
      last_name: "Johnson",
      password: "SecurePass123!",
      confirm_password: "SecurePass123!",
      phone: "+1-555-123-4567",
      intended_use: "personal",
      referral_source: "google_search"
    },
    preferences: {
      default_radius_km: 10,
      preferred_risk_sources: ["fema", "firststreet"],
      email_notifications: true,
      units: "imperial" as const,
      theme: "light" as const,
      marketing_emails: true
    } as UserPreferences,
    verification_status: {
      email_verified: false,
      phone_verified: false,
      verification_code: "123456",
      expires_at: "2024-08-21T10:30:00Z"
    },
    initial_search: {
      address: "1234 Oak Street, Austin, TX 78703",
      include_projections: true,
      radius_analysis: 5,
      hazard_types: ["flood", "tornado", "heat", "wildfire"]
    } as SearchFormData
  },

  real_estate_professional_registration: {
    user_id: "test_user_002",
    registration_step: "business_info",
    form_data: {
      email: "agent@realtorpro.com",
      first_name: "Michael",
      last_name: "Rodriguez",
      password: "RealEstate2024!",
      confirm_password: "RealEstate2024!",
      company: "Premier Properties Real Estate",
      phone: "+1-555-987-6543",
      intended_use: "business",
      referral_source: "industry_conference",
      business_license: "TX-RE-123456",
      mls_id: "MLSTX789012"
    },
    preferences: {
      default_radius_km: 25,
      preferred_risk_sources: ["fema", "firststreet", "climatecheck"],
      email_notifications: true,
      units: "imperial" as const,
      theme: "dark" as const,
      dashboard_layout: "professional",
      marketing_emails: false
    } as UserPreferences,
    upgrade_intent: {
      target_tier: "professional" as SubscriptionTier,
      trial_started: true,
      features_of_interest: ["bulk_analysis", "client_reports", "api_access"]
    }
  },

  insurance_agent_registration: {
    user_id: "test_user_003",
    registration_step: "completed",
    form_data: {
      email: "lisa.agent@coastalinsurance.com",
      first_name: "Lisa",
      last_name: "Chang",
      password: "Insurance2024#",
      company: "Coastal Risk Insurance",
      phone: "+1-555-456-7890",
      intended_use: "business",
      referral_source: "partner_referral"
    },
    preferences: {
      default_radius_km: 50,
      preferred_risk_sources: ["fema", "firststreet"],
      email_notifications: true,
      units: "imperial" as const,
      theme: "auto" as const,
      dashboard_layout: "professional"
    } as UserPreferences,
    immediate_upgrade: {
      target_tier: "enterprise" as SubscriptionTier,
      billing_cycle: "annual",
      features_needed: ["white_label_reports", "api_access", "priority_support"]
    }
  }
};

// Trial Conversion Scenarios
export const trialConversionScenarios = {
  successful_conversion_homebuyer: {
    user: {
      id: "trial_user_001",
      email: "mark.buyer@example.com",
      first_name: "Mark",
      last_name: "Thompson",
      subscription_tier: "free" as SubscriptionTier,
      subscription_status: "active" as const,
      created_at: "2024-08-01T09:00:00Z",
      preferences: {
        default_radius_km: 15,
        preferred_risk_sources: ["fema"],
        email_notifications: true,
        units: "imperial" as const,
        theme: "light" as const,
        intended_use: "personal"
      } as UserPreferences
    } as User,
    trial_usage: {
      current_period_requests: 8,
      current_period_limit: 10,
      requests_remaining: 2,
      reset_date: "2024-09-01T00:00:00Z",
      total_requests_all_time: 8,
      cost_current_period: 0
    } as APIUsage,
    conversion_trigger: {
      trigger_type: "limit_reached",
      search_attempts: [
        {
          address: "456 Maple Dr, Round Rock, TX 78664",
          timestamp: "2024-08-15T14:20:00Z",
          blocked: false
        },
        {
          address: "789 Pine St, Cedar Park, TX 78613",
          timestamp: "2024-08-16T10:15:00Z",
          blocked: false
        },
        {
          address: "321 Elm Ave, Georgetown, TX 78628",
          timestamp: "2024-08-17T16:30:00Z",
          blocked: true,
          upgrade_prompt_shown: true
        }
      ],
      conversion_path: "paywall_modal",
      selected_tier: "premium" as SubscriptionTier,
      payment_method: "credit_card",
      discount_applied: "FIRST_MONTH_50"
    },
    post_conversion_behavior: {
      immediate_searches: 3,
      features_used: ["property_comparison", "historical_events", "insurance_estimates"],
      satisfaction_score: 8.5,
      likelihood_to_recommend: 9
    }
  },

  failed_conversion_price_sensitive: {
    user: {
      id: "trial_user_002",
      email: "budget.buyer@example.com",
      first_name: "Jennifer",
      last_name: "Walsh",
      subscription_tier: "free" as SubscriptionTier,
      subscription_status: "active" as const,
      created_at: "2024-07-20T11:30:00Z",
      preferences: {
        default_radius_km: 10,
        preferred_risk_sources: ["fema"],
        email_notifications: false,
        units: "imperial" as const,
        theme: "light" as const,
        intended_use: "personal"
      } as UserPreferences
    } as User,
    trial_usage: {
      current_period_requests: 10,
      current_period_limit: 10,
      requests_remaining: 0,
      reset_date: "2024-08-20T00:00:00Z",
      total_requests_all_time: 23,
      cost_current_period: 0
    } as APIUsage,
    conversion_attempts: [
      {
        trigger_type: "limit_reached",
        timestamp: "2024-08-10T15:45:00Z",
        upgrade_prompt_shown: true,
        user_action: "dismissed",
        feedback: "too_expensive"
      },
      {
        trigger_type: "feature_locked",
        feature: "property_comparison",
        timestamp: "2024-08-12T09:20:00Z",
        upgrade_prompt_shown: true,
        user_action: "viewed_pricing",
        abandoned_at: "pricing_page"
      },
      {
        trigger_type: "email_campaign",
        campaign: "feature_highlight",
        timestamp: "2024-08-15T08:00:00Z",
        user_action: "ignored"
      }
    ],
    churn_risk_factors: {
      price_sensitivity: "high",
      feature_engagement: "low",
      search_frequency: "sporadic",
      support_interactions: 0,
      days_since_last_login: 5
    }
  },

  professional_trial_success: {
    user: {
      id: "trial_user_003",
      email: "realtor@topagency.com",
      first_name: "Robert",
      last_name: "Kim",
      company: "Top Realty Group",
      subscription_tier: "premium" as SubscriptionTier,
      subscription_status: "active" as const,
      created_at: "2024-07-25T13:15:00Z",
      preferences: {
        default_radius_km: 30,
        preferred_risk_sources: ["fema", "firststreet", "climatecheck"],
        email_notifications: true,
        units: "imperial" as const,
        theme: "dark" as const,
        dashboard_layout: "professional",
        intended_use: "business"
      } as UserPreferences
    } as User,
    trial_usage: {
      current_period_requests: 145,
      current_period_limit: 150,
      requests_remaining: 5,
      reset_date: "2024-08-25T00:00:00Z",
      total_requests_all_time: 312,
      cost_current_period: 49.99
    } as APIUsage,
    conversion_path: {
      trial_length_days: 14,
      heavy_usage_pattern: true,
      client_demonstrations: 8,
      reports_generated: 12,
      api_calls_made: 89,
      upgrade_trigger: "approaching_trial_end",
      selected_tier: "professional" as SubscriptionTier,
      annual_discount_applied: true,
      total_annual_value: 1188.00
    },
    post_conversion_metrics: {
      client_acquisition_increase: 23,
      average_deal_size_increase: 15000,
      time_savings_hours_per_week: 8,
      client_satisfaction_improvement: 1.2
    }
  }
};

// Subscription Tier Upgrade Scenarios
export const subscriptionUpgradeScenarios = {
  premium_to_professional_upgrade: {
    user: {
      id: "upgrade_user_001",
      email: "growing.agent@realty.com",
      first_name: "Amanda",
      last_name: "Foster",
      company: "Foster Realty Partners",
      subscription_tier: "premium" as SubscriptionTier,
      subscription_status: "active" as const,
      subscription_expires: "2024-09-15T23:59:59Z",
      created_at: "2024-06-15T10:00:00Z",
      preferences: {
        default_radius_km: 25,
        preferred_risk_sources: ["fema", "firststreet"],
        email_notifications: true,
        units: "imperial" as const,
        theme: "light" as const,
        intended_use: "business"
      } as UserPreferences
    } as User,
    current_usage: {
      current_period_requests: 890,
      current_period_limit: 1000,
      requests_remaining: 110,
      reset_date: "2024-09-15T00:00:00Z",
      total_requests_all_time: 4567,
      cost_current_period: 49.99
    } as APIUsage,
    upgrade_triggers: [
      {
        type: "usage_threshold",
        threshold_percent: 89,
        trigger_date: "2024-08-18T14:00:00Z",
        user_response: "interested"
      },
      {
        type: "feature_request",
        requested_feature: "bulk_property_analysis",
        request_date: "2024-08-19T09:30:00Z",
        context: "client_presentation"
      },
      {
        type: "support_interaction",
        interaction_date: "2024-08-20T11:15:00Z",
        topic: "api_access_inquiry",
        outcome: "upgrade_recommended"
      }
    ],
    upgrade_decision: {
      selected_tier: "professional" as SubscriptionTier,
      billing_cycle: "annual",
      features_driving_decision: [
        "bulk_analysis_tool",
        "api_access",
        "white_label_reports",
        "priority_support"
      ],
      estimated_roi: {
        monthly_time_savings_hours: 15,
        hourly_rate: 75,
        monthly_value: 1125,
        payback_period_months: 1.2
      }
    }
  },

  professional_to_enterprise_upgrade: {
    user: {
      id: "upgrade_user_002",
      email: "director@coastalrealty.com",
      first_name: "David",
      last_name: "Martinez",
      company: "Coastal Realty Enterprises",
      subscription_tier: "professional" as SubscriptionTier,
      subscription_status: "active" as const,
      subscription_expires: "2025-01-15T23:59:59Z",
      created_at: "2024-01-15T12:00:00Z",
      preferences: {
        default_radius_km: 50,
        preferred_risk_sources: ["fema", "firststreet", "climatecheck"],
        email_notifications: true,
        units: "imperial" as const,
        theme: "dark" as const,
        dashboard_layout: "professional",
        intended_use: "business"
      } as UserPreferences
    } as User,
    current_usage: {
      current_period_requests: 4789,
      current_period_limit: 5000,
      requests_remaining: 211,
      reset_date: "2024-09-15T00:00:00Z",
      total_requests_all_time: 28456,
      cost_current_period: 99.99
    } as APIUsage,
    enterprise_needs: {
      team_size: 25,
      monthly_api_calls_needed: 15000,
      custom_branding_required: true,
      sla_requirements: "4_hour_response",
      integration_needs: ["salesforce", "mls_system", "custom_crm"],
      compliance_requirements: ["soc2", "gdpr"]
    },
    upgrade_negotiation: {
      initial_quote: 499.99,
      negotiations: [
        {
          date: "2024-08-10T14:00:00Z",
          request: "volume_discount",
          response: "15% discount for annual payment"
        },
        {
          date: "2024-08-12T10:30:00Z",
          request: "custom_api_limits",
          response: "25,000 monthly calls included"
        }
      ],
      final_terms: {
        monthly_price: 424.99,
        annual_discount: 15,
        annual_total: 4334.89,
        custom_features: ["branded_mobile_app", "dedicated_account_manager"]
      }
    }
  }
};

// User Behavior Analytics Test Data
export const userBehaviorAnalytics = {
  power_user_profile: {
    user_id: "analytics_user_001",
    subscription_tier: "professional" as SubscriptionTier,
    behavior_patterns: {
      login_frequency: "daily",
      average_session_duration_minutes: 35,
      searches_per_session: 8.5,
      features_used_per_session: ["property_search", "risk_assessment", "comparison_tool", "report_generation"],
      peak_usage_hours: ["09:00-11:00", "14:00-16:00"],
      device_preferences: {
        desktop: 65,
        mobile: 25,
        tablet: 10
      }
    },
    engagement_metrics: {
      days_active_last_30: 28,
      feature_adoption_rate: 92,
      support_tickets_submitted: 2,
      knowledge_base_articles_viewed: 15,
      webinar_attendance: 3,
      referrals_made: 4
    },
    business_impact: {
      properties_analyzed_monthly: 145,
      reports_generated_monthly: 32,
      client_interactions_enhanced: 67,
      estimated_revenue_impact: 8500
    }
  },

  casual_user_profile: {
    user_id: "analytics_user_002",
    subscription_tier: "premium" as SubscriptionTier,
    behavior_patterns: {
      login_frequency: "weekly",
      average_session_duration_minutes: 12,
      searches_per_session: 2.1,
      features_used_per_session: ["property_search", "basic_risk_assessment"],
      peak_usage_hours: ["19:00-21:00", "weekend_afternoons"],
      device_preferences: {
        desktop: 40,
        mobile: 55,
        tablet: 5
      }
    },
    engagement_metrics: {
      days_active_last_30: 8,
      feature_adoption_rate: 35,
      support_tickets_submitted: 0,
      knowledge_base_articles_viewed: 3,
      email_opens_rate: 45,
      app_rating: 4
    },
    usage_context: {
      primary_use_case: "home_shopping",
      decision_stage: "early_research",
      timeline: "6_months",
      budget_sensitivity: "high"
    }
  },

  churned_user_profile: {
    user_id: "analytics_user_003",
    subscription_tier: "free" as SubscriptionTier,
    churn_date: "2024-07-15T00:00:00Z",
    behavior_before_churn: {
      login_frequency_decline: {
        month_1: "daily",
        month_2: "every_other_day", 
        month_3: "weekly",
        final_month: "sporadic"
      },
      feature_engagement_decline: {
        initial_features_used: 6,
        final_features_used: 2,
        last_active_feature: "basic_property_search"
      },
      support_interactions: [
        {
          date: "2024-06-20T10:00:00Z",
          type: "pricing_inquiry",
          resolution: "explained_value_proposition"
        },
        {
          date: "2024-07-05T14:30:00Z",
          type: "feature_confusion",
          resolution: "tutorial_provided"
        }
      ]
    },
    churn_indicators: {
      price_objections: 3,
      feature_adoption_stagnation: true,
      competitor_mentions: 1,
      reduced_engagement_score: 0.23,
      days_since_last_login: 37
    },
    exit_survey_responses: {
      primary_reason: "cost_too_high",
      secondary_reason: "features_too_complex",
      likelihood_to_return: 4,
      feedback: "Great data but too expensive for occasional use",
      competitor_mentioned: "Zillow"
    }
  }
};

// A/B Testing Scenarios
export const abTestingScenarios = {
  pricing_page_test: {
    test_name: "pricing_page_layout_v2",
    test_duration: "2024-08-01 to 2024-08-31",
    variants: {
      control: {
        variant_id: "pricing_v1_control",
        layout: "traditional_three_tier",
        users_exposed: 2500,
        conversions: 187,
        conversion_rate: 7.48,
        average_order_value: 49.99,
        revenue_per_visitor: 3.74
      },
      treatment: {
        variant_id: "pricing_v2_treatment", 
        layout: "value_focused_with_testimonials",
        users_exposed: 2500,
        conversions: 223,
        conversion_rate: 8.92,
        average_order_value: 52.49,
        revenue_per_visitor: 4.68
      }
    },
    statistical_significance: {
      confidence_level: 95,
      p_value: 0.03,
      significant: true,
      winner: "treatment"
    }
  },

  onboarding_flow_test: {
    test_name: "onboarding_progressive_disclosure",
    test_duration: "2024-07-15 to 2024-08-15",
    variants: {
      control: {
        variant_id: "onboard_v1_control",
        approach: "single_page_form",
        users_started: 3200,
        users_completed: 2176,
        completion_rate: 68.0,
        time_to_complete_median_seconds: 240,
        abandonment_points: {
          "personal_info": 15,
          "preferences": 25,
          "verification": 35
        }
      },
      treatment: {
        variant_id: "onboard_v2_treatment",
        approach: "progressive_multi_step",
        users_started: 3200,
        users_completed: 2400,
        completion_rate: 75.0,
        time_to_complete_median_seconds: 195,
        abandonment_points: {
          "step_1_basic": 8,
          "step_2_preferences": 12,
          "step_3_verification": 20
        }
      }
    },
    post_onboarding_metrics: {
      control: {
        first_search_within_24h: 78,
        subscription_upgrade_within_7d: 12,
        feature_adoption_week_1: 3.2
      },
      treatment: {
        first_search_within_24h: 89,
        subscription_upgrade_within_7d: 18,
        feature_adoption_week_1: 4.1
      }
    }
  },

  mobile_app_cta_test: {
    test_name: "mobile_upgrade_cta_positioning",
    test_duration: "2024-08-10 to 2024-09-10",
    variants: {
      control: {
        variant_id: "mobile_cta_v1_control",
        cta_position: "bottom_banner",
        users_exposed: 1800,
        cta_clicks: 126,
        click_through_rate: 7.0,
        conversions: 23,
        conversion_rate: 1.28
      },
      treatment_a: {
        variant_id: "mobile_cta_v2_modal",
        cta_position: "modal_overlay_after_search",
        users_exposed: 1800,
        cta_clicks: 162,
        click_through_rate: 9.0,
        conversions: 31,
        conversion_rate: 1.72
      },
      treatment_b: {
        variant_id: "mobile_cta_v3_inline",
        cta_position: "inline_after_results",
        users_exposed: 1800,
        cta_clicks: 144,
        click_through_rate: 8.0,
        conversions: 27,
        conversion_rate: 1.50
      }
    }
  }
};

export const userJourneys = {
  registration: userRegistrationFlows,
  trialConversion: trialConversionScenarios,
  subscriptionUpgrade: subscriptionUpgradeScenarios,
  behaviorAnalytics: userBehaviorAnalytics,
  abTesting: abTestingScenarios
};