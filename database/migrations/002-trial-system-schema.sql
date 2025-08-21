-- =====================================================
-- Seawater Registration-Based Trial System Schema
-- Migration 002: Trial tracking and marketing consent
-- =====================================================

-- Add trial tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_status VARCHAR(20) DEFAULT 'active' CHECK (trial_status IN ('active', 'used', 'expired', 'converted'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_reports_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_reports_limit INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_converted_at TIMESTAMP;

-- Add marketing consent and lead tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS intended_use VARCHAR(50) CHECK (intended_use IN ('personal', 'business', 'research', 'real_estate', 'insurance', 'other'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Cognito integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS cognito_user_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Trial usage tracking table
CREATE TABLE IF NOT EXISTS trial_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Usage details
    usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN ('risk_assessment', 'property_search', 'report_generation')),
    resource_id UUID, -- property_id or assessment_id
    
    -- Trial validation
    trial_status_at_time VARCHAR(20) NOT NULL,
    reports_used_before INTEGER NOT NULL,
    reports_remaining INTEGER NOT NULL,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    session_id UUID REFERENCES user_sessions(id),
    
    -- Geographic context
    property_address TEXT,
    property_location GEOMETRY(POINT, 4326),
    
    -- Performance tracking
    processing_time_ms INTEGER,
    data_sources_used TEXT[],
    api_cost_cents INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trial conversion tracking
CREATE TABLE IF NOT EXISTS trial_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conversion details
    conversion_type VARCHAR(50) NOT NULL CHECK (conversion_type IN ('subscription', 'api_upgrade', 'professional_upgrade')),
    subscription_tier VARCHAR(50),
    conversion_value_cents INTEGER DEFAULT 0,
    
    -- Trial context when converted
    trial_reports_used INTEGER NOT NULL,
    trial_duration_hours INTEGER,
    days_since_registration INTEGER,
    
    -- Conversion attribution
    last_property_searched TEXT,
    conversion_trigger VARCHAR(100), -- 'limit_reached', 'premium_feature', 'report_quality', etc.
    
    -- Stripe/payment details
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Marketing consent history for GDPR compliance
CREATE TABLE IF NOT EXISTS marketing_consent_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Consent details
    consent_given BOOLEAN NOT NULL,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('registration', 'preference_update', 'withdrawal')),
    consent_source VARCHAR(50) NOT NULL, -- 'registration_form', 'profile_settings', 'email_unsubscribe'
    
    -- Legal requirements
    consent_text TEXT, -- Exact text user agreed to
    privacy_policy_version VARCHAR(20),
    terms_version VARCHAR(20),
    
    -- Technical details
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Email campaign tracking for trial users
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Campaign details
    campaign_name VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('welcome_sequence', 'trial_reminder', 'conversion_nudge', 'feature_announcement')),
    campaign_segment VARCHAR(50), -- 'new_trials', 'active_trials', 'expired_trials'
    
    -- Content
    subject_line TEXT NOT NULL,
    email_template TEXT,
    
    -- Scheduling
    send_at TIMESTAMP,
    sent_at TIMESTAMP,
    
    -- Performance
    recipients_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual email sends for tracking
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Send details
    email_address VARCHAR(255) NOT NULL,
    personalization_data JSONB,
    
    -- Delivery tracking
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    bounced_at TIMESTAMP,
    
    -- External service IDs
    ses_message_id VARCHAR(255),
    sendgrid_message_id VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trial funnel analytics
CREATE TABLE IF NOT EXISTS trial_funnel_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id),
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'registration_started', 'email_verified', 'first_search', 'trial_used', 'upgrade_viewed', 'converted'
    event_step INTEGER NOT NULL, -- 1=registration, 2=verification, 3=first_use, 4=conversion
    
    -- Context
    page_url TEXT,
    referrer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Event data
    event_data JSONB,
    
    -- Geographic/technical
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Trial tracking indexes
CREATE INDEX IF NOT EXISTS idx_users_trial_status ON users (trial_status);
CREATE INDEX IF NOT EXISTS idx_users_cognito_id ON users (cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_users_marketing_consent ON users (marketing_consent);
CREATE INDEX IF NOT EXISTS idx_users_trial_expires ON users (trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users (last_active_at);

-- Trial usage tracking
CREATE INDEX IF NOT EXISTS idx_trial_usage_user_id ON trial_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_trial_usage_created ON trial_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_trial_usage_type ON trial_usage (usage_type);
CREATE INDEX IF NOT EXISTS idx_trial_usage_location ON trial_usage USING GIST (property_location);

-- Conversion tracking
CREATE INDEX IF NOT EXISTS idx_trial_conversions_user_id ON trial_conversions (user_id);
CREATE INDEX IF NOT EXISTS idx_trial_conversions_type ON trial_conversions (conversion_type);
CREATE INDEX IF NOT EXISTS idx_trial_conversions_created ON trial_conversions (created_at);

-- Marketing consent tracking
CREATE INDEX IF NOT EXISTS idx_marketing_consent_user_id ON marketing_consent_history (user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_consent_created ON marketing_consent_history (created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_consent_type ON marketing_consent_history (consent_type);

-- Email campaign tracking
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns (campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_send_at ON email_campaigns (send_at);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends (campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user_id ON email_sends (user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends (status);

-- Funnel analytics
CREATE INDEX IF NOT EXISTS idx_trial_funnel_user_id ON trial_funnel_events (user_id);
CREATE INDEX IF NOT EXISTS idx_trial_funnel_event_type ON trial_funnel_events (event_type);
CREATE INDEX IF NOT EXISTS idx_trial_funnel_step ON trial_funnel_events (event_step);
CREATE INDEX IF NOT EXISTS idx_trial_funnel_created ON trial_funnel_events (created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_trial_status_active ON users (trial_status, last_active_at) WHERE trial_status = 'active';
CREATE INDEX IF NOT EXISTS idx_trial_usage_user_type ON trial_usage (user_id, usage_type, created_at);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_status ON email_sends (campaign_id, status);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically set trial start date
CREATE OR REPLACE FUNCTION initialize_trial()
RETURNS TRIGGER AS $$
BEGIN
    -- Set trial started when user is first created with trial status
    IF NEW.trial_status = 'active' AND OLD.trial_started_at IS NULL THEN
        NEW.trial_started_at = NOW();
        NEW.trial_expires_at = NOW() + INTERVAL '90 days'; -- 3 month trial period
    END IF;
    
    -- Update last active timestamp
    NEW.last_active_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for trial initialization
CREATE TRIGGER trigger_initialize_trial
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION initialize_trial();

-- Function to track trial usage
CREATE OR REPLACE FUNCTION track_trial_usage()
RETURNS TRIGGER AS $$
DECLARE
    current_user_record users%ROWTYPE;
BEGIN
    -- Get current user trial status
    SELECT * INTO current_user_record FROM users WHERE id = NEW.user_id;
    
    -- Update user's trial usage count if this is a trial user
    IF current_user_record.trial_status = 'active' AND NEW.usage_type = 'risk_assessment' THEN
        UPDATE users 
        SET 
            trial_reports_used = trial_reports_used + 1,
            trial_status = CASE 
                WHEN trial_reports_used + 1 >= trial_reports_limit THEN 'used'
                ELSE 'active'
            END,
            last_active_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic trial usage tracking
CREATE TRIGGER trigger_track_trial_usage
    AFTER INSERT ON trial_usage
    FOR EACH ROW EXECUTE FUNCTION track_trial_usage();

-- Function to log consent changes
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log consent changes for GDPR compliance
    IF NEW.marketing_consent != OLD.marketing_consent THEN
        INSERT INTO marketing_consent_history (
            user_id,
            consent_given,
            consent_type,
            consent_source,
            created_at
        ) VALUES (
            NEW.id,
            NEW.marketing_consent,
            'preference_update',
            'profile_settings',
            NOW()
        );
        
        NEW.marketing_consent_date = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for consent logging
CREATE TRIGGER trigger_log_consent_change
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION log_consent_change();

-- =====================================================
-- VIEWS FOR TRIAL ANALYTICS
-- =====================================================

-- Trial user summary view
CREATE OR REPLACE VIEW trial_user_summary AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.trial_status,
    u.trial_reports_used,
    u.trial_reports_limit,
    u.trial_started_at,
    u.trial_expires_at,
    u.marketing_consent,
    u.intended_use,
    u.referral_source,
    u.lead_score,
    u.last_active_at,
    u.created_at as registration_date,
    
    -- Trial metrics
    EXTRACT(days FROM NOW() - u.trial_started_at) as trial_days_active,
    EXTRACT(days FROM u.trial_expires_at - NOW()) as trial_days_remaining,
    
    -- Usage metrics
    COUNT(tu.id) as total_usage_events,
    MAX(tu.created_at) as last_usage_date,
    
    -- Conversion potential
    CASE 
        WHEN u.trial_status = 'used' AND u.last_active_at > NOW() - INTERVAL '7 days' THEN 'high'
        WHEN u.trial_status = 'active' AND u.trial_reports_used > 0 THEN 'medium'
        WHEN u.trial_status = 'active' AND u.created_at > NOW() - INTERVAL '30 days' THEN 'low'
        ELSE 'minimal'
    END as conversion_likelihood
    
FROM users u
LEFT JOIN trial_usage tu ON u.id = tu.user_id
WHERE u.trial_status IN ('active', 'used')
GROUP BY u.id;

-- Trial conversion funnel view
CREATE OR REPLACE VIEW trial_funnel_analysis AS
SELECT 
    COUNT(*) FILTER (WHERE event_type = 'registration_started') as registrations_started,
    COUNT(*) FILTER (WHERE event_type = 'email_verified') as email_verifications,
    COUNT(*) FILTER (WHERE event_type = 'first_search') as first_searches,
    COUNT(*) FILTER (WHERE event_type = 'trial_used') as trial_usage,
    COUNT(*) FILTER (WHERE event_type = 'upgrade_viewed') as upgrade_views,
    COUNT(*) FILTER (WHERE event_type = 'converted') as conversions,
    
    -- Conversion rates
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE event_type = 'email_verified') / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'registration_started'), 0), 2
    ) as verification_rate,
    
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE event_type = 'trial_used') / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'email_verified'), 0), 2
    ) as activation_rate,
    
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE event_type = 'converted') / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'trial_used'), 0), 2
    ) as trial_to_paid_rate
    
FROM trial_funnel_events
WHERE created_at >= NOW() - INTERVAL '30 days';

-- =====================================================
-- INITIAL DATA AND CONFIGURATION
-- =====================================================

-- Update existing free tier to reflect trial system
UPDATE subscription_tiers 
SET 
    tier_display_name = 'Free Trial',
    searches_per_month = 1,
    data_sources = ARRAY['fema']
WHERE tier_name = 'free';

-- Add trial conversion triggers to premium tiers
UPDATE subscription_tiers 
SET premium_data = true, projections = true
WHERE tier_name IN ('premium', 'professional', 'enterprise');

-- =====================================================
-- SAMPLE TRIAL CAMPAIGN DATA
-- =====================================================

-- Welcome sequence email campaign
INSERT INTO email_campaigns (
    campaign_name,
    campaign_type,
    campaign_segment,
    subject_line,
    email_template,
    status
) VALUES (
    'Trial Welcome Sequence',
    'welcome_sequence',
    'new_trials',
    '🌊 Welcome to Seawater - Your climate risk assessment is ready!',
    'Welcome email template with trial activation instructions',
    'draft'
), (
    'Trial Reminder - Day 7',
    'trial_reminder',
    'active_trials',
    '⏰ Don''t forget your free climate risk report!',
    'Reminder email for users who haven''t used their trial',
    'draft'
), (
    'Trial Conversion - Limit Reached',
    'conversion_nudge',
    'used_trials',
    '🎯 Ready for unlimited climate risk assessments?',
    'Conversion email when trial limit is reached',
    'draft'
);

COMMENT ON TABLE trial_usage IS 'Tracks every trial usage event with detailed context for analytics and fraud prevention';
COMMENT ON TABLE trial_conversions IS 'Records trial-to-paid conversions with attribution and context';
COMMENT ON TABLE marketing_consent_history IS 'GDPR-compliant audit trail of all marketing consent changes';
COMMENT ON VIEW trial_user_summary IS 'Comprehensive view of trial users with engagement metrics and conversion likelihood';