-- Seawater Registration-Based Trial System Database Schema
-- Migration 002: User registration, trial tracking, and marketing consent
-- Follows Tim-Combo user table patterns with Seawater-specific adaptations

-- Users table following Tim-Combo structure with Seawater adaptations
CREATE TABLE IF NOT EXISTS "Users" (
    "Email_Address" VARCHAR(255) PRIMARY KEY,
    "Client_ID" VARCHAR(20) DEFAULT 'SEAWATER',
    "User_Status" VARCHAR(50) DEFAULT 'Pending',
    "User_Status_Date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Last_Login_Date" DATE,
    "Login_History" JSONB DEFAULT '[]',
    "User_Code" VARCHAR(100),
    "User_Display_Name" VARCHAR(255),
    "User_SMS" VARCHAR(50),
    "Communication_Preference" VARCHAR(50) DEFAULT 'email',
    "Notification_Status" BOOLEAN DEFAULT true,
    "Create_Date" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    "Super_Admin" BOOLEAN DEFAULT false,
    "active" BOOLEAN DEFAULT true,
    "splash" BOOLEAN DEFAULT false,
    "terms" BOOLEAN DEFAULT false,
    "terms_date" TIMESTAMP,
    
    -- Seawater-specific fields
    "cognito_user_id" VARCHAR(255) UNIQUE,
    "subscription_tier" VARCHAR(50) DEFAULT 'trial',
    "email_verified" BOOLEAN DEFAULT false,
    "email_verified_at" TIMESTAMP,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "company" VARCHAR(255),
    "job_title" VARCHAR(255),
    "intended_use" VARCHAR(100), -- 'personal', 'business', 'real_estate', 'research'
    
    -- Marketing and attribution
    "marketing_consent" BOOLEAN DEFAULT false,
    "marketing_consent_date" TIMESTAMP,
    "marketing_consent_ip" VARCHAR(45),
    "referral_source" VARCHAR(100),
    "utm_source" VARCHAR(100),
    "utm_medium" VARCHAR(100),
    "utm_campaign" VARCHAR(100),
    "utm_content" VARCHAR(100),
    "lead_score" INTEGER DEFAULT 0,
    
    -- Trial tracking (replaces separate trial table)
    "trial_status" VARCHAR(50) DEFAULT 'active', -- active, used, expired, converted
    "trial_reports_used" INTEGER DEFAULT 0,
    "trial_reports_limit" INTEGER DEFAULT 1,
    "trial_started_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "trial_expires_at" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    "trial_converted_at" TIMESTAMP,
    
    -- Account cleanup
    "deleted_at" TIMESTAMP,
    
    CONSTRAINT valid_user_status CHECK ("User_Status" IN ('Pending', 'Active', 'Suspended', 'Deleted')),
    CONSTRAINT valid_subscription_tier CHECK ("subscription_tier" IN ('trial', 'individual', 'professional', 'enterprise')),
    CONSTRAINT valid_trial_status CHECK ("trial_status" IN ('active', 'used', 'expired', 'converted')),
    CONSTRAINT valid_intended_use CHECK ("intended_use" IN ('personal', 'business', 'real_estate', 'research', 'other'))
);

-- Trial usage events for detailed analytics (replaces user_trials table)
CREATE TABLE IF NOT EXISTS "Trial_Usage" (
    "Usage_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email_Address" VARCHAR(255) NOT NULL REFERENCES "Users"("Email_Address") ON DELETE CASCADE,
    "Usage_Type" VARCHAR(100) NOT NULL, -- 'risk_assessment', 'modal_shown', 'upgrade_click', 'page_view'
    "Property_Address" TEXT,
    "Assessment_Data" JSONB,
    "Data_Sources_Used" TEXT[],
    "Processing_Time_MS" INTEGER,
    "User_Agent" TEXT,
    "IP_Address" VARCHAR(45),
    "Session_ID" VARCHAR(255),
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional context
    "Context_Data" JSONB DEFAULT '{}',
    "Conversion_Funnel_Step" INTEGER,
    "AB_Test_Variant" VARCHAR(50)
);

-- Email preferences following Tim-Combo pattern (marketing consent moved to Users table)
CREATE TABLE IF NOT EXISTS "User_Email_Preferences" (
    "Email_Address" VARCHAR(255) PRIMARY KEY REFERENCES "Users"("Email_Address") ON DELETE CASCADE,
    "Email_Notifications" BOOLEAN DEFAULT true,
    "Product_Updates" BOOLEAN DEFAULT false,
    "Climate_Alerts" BOOLEAN DEFAULT false,
    "Real_Estate_Insights" BOOLEAN DEFAULT false,
    "Email_Frequency" VARCHAR(50) DEFAULT 'weekly',
    "Last_Email_Sent_At" TIMESTAMP,
    "Unsubscribed" BOOLEAN DEFAULT false,
    "Unsubscribed_At" TIMESTAMP,
    "Unsubscribe_Reason" VARCHAR(255),
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Updated_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email_frequency CHECK ("Email_Frequency" IN ('daily', 'weekly', 'monthly', 'never'))
);

-- Property assessments following Tim-Combo naming conventions
CREATE TABLE IF NOT EXISTS "Property_Assessments" (
    "Assessment_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email_Address" VARCHAR(255) NOT NULL REFERENCES "Users"("Email_Address") ON DELETE CASCADE,
    
    -- Property information
    "Address" TEXT NOT NULL,
    "Normalized_Address" TEXT,
    "Latitude" DECIMAL(10, 8),
    "Longitude" DECIMAL(11, 8),
    
    -- Assessment data
    "Assessment_Data" JSONB NOT NULL,
    "Risk_Scores" JSONB,
    "Overall_Risk_Score" INTEGER,
    "Confidence_Score" DECIMAL(3, 2),
    
    -- Data sources and performance
    "Data_Sources" TEXT[],
    "Premium_Data_Used" BOOLEAN DEFAULT false,
    "Assessment_Duration_MS" INTEGER,
    "API_Calls_Made" INTEGER,
    "Cache_Hit_Ratio" DECIMAL(3, 2),
    
    -- Context
    "Is_Trial_Assessment" BOOLEAN DEFAULT false,
    "Assessment_Source" VARCHAR(50) DEFAULT 'web',
    "User_Agent" TEXT,
    "IP_Address" VARCHAR(45),
    
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_overall_risk_score CHECK ("Overall_Risk_Score" >= 0 AND "Overall_Risk_Score" <= 100)
);

-- User sessions following Tim-Combo patterns
CREATE TABLE IF NOT EXISTS "User_Sessions" (
    "Session_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email_Address" VARCHAR(255) REFERENCES "Users"("Email_Address") ON DELETE CASCADE,
    
    -- Session tracking
    "Session_Start" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Session_End" TIMESTAMP,
    "Session_Duration_Seconds" INTEGER,
    
    -- Technical details
    "IP_Address" VARCHAR(45),
    "User_Agent" TEXT,
    "Device_Type" VARCHAR(50),
    "Browser" VARCHAR(100),
    "Operating_System" VARCHAR(100),
    
    -- Analytics
    "Pages_Viewed" INTEGER DEFAULT 0,
    "Assessments_Performed" INTEGER DEFAULT 0,
    "Upgrade_Modal_Shown" BOOLEAN DEFAULT false,
    "Conversion_Funnel_Stage" VARCHAR(50),
    
    -- Geographic information
    "Country_Code" CHAR(2),
    "Region" VARCHAR(100),
    "City" VARCHAR(100),
    
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription tiers configuration
CREATE TABLE IF NOT EXISTS "Subscription_Tiers" (
    "Tier_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Tier_Name" VARCHAR(50) UNIQUE NOT NULL,
    "Tier_Display_Name" VARCHAR(100) NOT NULL,
    "Monthly_Price_Cents" INTEGER NOT NULL,
    "Annual_Price_Cents" INTEGER NOT NULL,
    "Searches_Per_Month" INTEGER DEFAULT -1, -- -1 for unlimited
    "Premium_Data" BOOLEAN DEFAULT false,
    "Projections" BOOLEAN DEFAULT false,
    "API_Access" BOOLEAN DEFAULT false,
    "Priority_Support" BOOLEAN DEFAULT false,
    "Is_Active" BOOLEAN DEFAULT true,
    "Sort_Order" INTEGER DEFAULT 0,
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions following Tim-Combo pattern
CREATE TABLE IF NOT EXISTS "User_Subscriptions" (
    "Subscription_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email_Address" VARCHAR(255) UNIQUE NOT NULL REFERENCES "Users"("Email_Address") ON DELETE CASCADE,
    "Tier_ID" UUID NOT NULL REFERENCES "Subscription_Tiers"("Tier_ID"),
    
    -- Status and billing
    "Status" VARCHAR(50) DEFAULT 'active',
    "Billing_Cycle" VARCHAR(20) DEFAULT 'monthly',
    "Current_Period_Start" TIMESTAMP,
    "Current_Period_End" TIMESTAMP,
    "Cancel_At_Period_End" BOOLEAN DEFAULT false,
    "Canceled_At" TIMESTAMP,
    
    -- Stripe integration
    "Stripe_Subscription_ID" VARCHAR(255) UNIQUE,
    "Stripe_Customer_ID" VARCHAR(255),
    
    -- Usage tracking
    "Searches_Used_This_Period" INTEGER DEFAULT 0,
    "API_Calls_Used_This_Period" INTEGER DEFAULT 0,
    "Last_Usage_Reset" TIMESTAMP,
    
    -- Conversion tracking
    "Converted_From_Trial" BOOLEAN DEFAULT false,
    "Trial_Conversion_Date" TIMESTAMP,
    "Discount_Applied" VARCHAR(100),
    
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Updated_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_subscription_status CHECK ("Status" IN ('active', 'past_due', 'canceled', 'unpaid')),
    CONSTRAINT valid_billing_cycle CHECK ("Billing_Cycle" IN ('monthly', 'annual'))
);

-- Trial funnel events for conversion analytics
CREATE TABLE IF NOT EXISTS "Trial_Funnel_Events" (
    "Event_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email_Address" VARCHAR(255) NOT NULL REFERENCES "Users"("Email_Address") ON DELETE CASCADE,
    "Event_Type" VARCHAR(100) NOT NULL,
    "Event_Step" INTEGER NOT NULL, -- 1=landing, 2=registration, 3=email_verify, 4=trial_start, etc.
    "Event_Data" JSONB DEFAULT '{}',
    "Session_ID" VARCHAR(255),
    "User_Agent" TEXT,
    "IP_Address" VARCHAR(45),
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email campaigns using Tim-Combo email system integration
CREATE TABLE IF NOT EXISTS "Seawater_Email_Campaigns" (
    "Campaign_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email_Address" VARCHAR(255) NOT NULL REFERENCES "Users"("Email_Address") ON DELETE CASCADE,
    "Campaign_Type" VARCHAR(100) NOT NULL,
    "Email_Subject" VARCHAR(255),
    "Template_ID" VARCHAR(100),
    "Sent_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Delivered_At" TIMESTAMP,
    "Opened_At" TIMESTAMP,
    "Clicked_At" TIMESTAMP,
    "Bounced_At" TIMESTAMP,
    "Personalization_Data" JSONB DEFAULT '{}',
    "Click_Count" INTEGER DEFAULT 0,
    "Conversion_Attributed" BOOLEAN DEFAULT false,
    "Created_At" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (following Tim-Combo naming)
CREATE INDEX IF NOT EXISTS "idx_users_cognito_user_id" ON "Users"("cognito_user_id");
CREATE INDEX IF NOT EXISTS "idx_users_client_id" ON "Users"("Client_ID");
CREATE INDEX IF NOT EXISTS "idx_users_status" ON "Users"("User_Status");
CREATE INDEX IF NOT EXISTS "idx_users_subscription_tier" ON "Users"("subscription_tier");
CREATE INDEX IF NOT EXISTS "idx_users_trial_status" ON "Users"("trial_status");
CREATE INDEX IF NOT EXISTS "idx_users_create_date" ON "Users"("Create_Date");
CREATE INDEX IF NOT EXISTS "idx_users_marketing_consent" ON "Users"("marketing_consent");

CREATE INDEX IF NOT EXISTS "idx_trial_usage_email" ON "Trial_Usage"("Email_Address");
CREATE INDEX IF NOT EXISTS "idx_trial_usage_type" ON "Trial_Usage"("Usage_Type");
CREATE INDEX IF NOT EXISTS "idx_trial_usage_created_at" ON "Trial_Usage"("Created_At");

CREATE INDEX IF NOT EXISTS "idx_email_preferences_email" ON "User_Email_Preferences"("Email_Address");
CREATE INDEX IF NOT EXISTS "idx_email_preferences_unsubscribed" ON "User_Email_Preferences"("Unsubscribed");

CREATE INDEX IF NOT EXISTS "idx_property_assessments_email" ON "Property_Assessments"("Email_Address");
CREATE INDEX IF NOT EXISTS "idx_property_assessments_created_at" ON "Property_Assessments"("Created_At");
CREATE INDEX IF NOT EXISTS "idx_property_assessments_trial" ON "Property_Assessments"("Is_Trial_Assessment");
CREATE INDEX IF NOT EXISTS "idx_property_assessments_address" ON "Property_Assessments"("Normalized_Address");

CREATE INDEX IF NOT EXISTS "idx_user_sessions_email" ON "User_Sessions"("Email_Address");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_created_at" ON "User_Sessions"("Created_At");

CREATE INDEX IF NOT EXISTS "idx_subscription_tiers_name" ON "Subscription_Tiers"("Tier_Name");
CREATE INDEX IF NOT EXISTS "idx_subscription_tiers_active" ON "Subscription_Tiers"("Is_Active");

CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_email" ON "User_Subscriptions"("Email_Address");
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_stripe_id" ON "User_Subscriptions"("Stripe_Subscription_ID");
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_status" ON "User_Subscriptions"("Status");

CREATE INDEX IF NOT EXISTS "idx_trial_funnel_events_email" ON "Trial_Funnel_Events"("Email_Address");
CREATE INDEX IF NOT EXISTS "idx_trial_funnel_events_type" ON "Trial_Funnel_Events"("Event_Type");
CREATE INDEX IF NOT EXISTS "idx_trial_funnel_events_step" ON "Trial_Funnel_Events"("Event_Step");
CREATE INDEX IF NOT EXISTS "idx_trial_funnel_events_created_at" ON "Trial_Funnel_Events"("Created_At");

CREATE INDEX IF NOT EXISTS "idx_seawater_email_campaigns_email" ON "Seawater_Email_Campaigns"("Email_Address");
CREATE INDEX IF NOT EXISTS "idx_seawater_email_campaigns_type" ON "Seawater_Email_Campaigns"("Campaign_Type");
CREATE INDEX IF NOT EXISTS "idx_seawater_email_campaigns_sent_at" ON "Seawater_Email_Campaigns"("Sent_At");

-- Create triggers for updated_at columns (Tim-Combo style)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."Updated_At" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON "User_Email_Preferences"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON "User_Subscriptions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription tiers
INSERT INTO "Subscription_Tiers" (
    "Tier_Name", "Tier_Display_Name", "Monthly_Price_Cents", "Annual_Price_Cents", 
    "Searches_Per_Month", "Premium_Data", "Projections", "API_Access", "Priority_Support", "Sort_Order"
) VALUES 
('individual', 'Individual Plan', 2900, 29000, 25, true, false, false, false, 1),
('professional', 'Professional Plan', 4900, 49000, -1, true, true, true, true, 2),
('enterprise', 'Enterprise Plan', 9900, 99000, -1, true, true, true, true, 3)
ON CONFLICT ("Tier_Name") DO NOTHING;

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seawater_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seawater_app_user;

-- Insert sample data for testing (remove in production)
INSERT INTO "Users" (
    "Email_Address", "cognito_user_id", "User_Status", "subscription_tier", 
    "first_name", "last_name", "User_Display_Name"
) VALUES
('test@example.com', 'test-user-1', 'Active', 'trial', 'Test', 'User', 'Test User'),
('premium@example.com', 'test-user-2', 'Active', 'individual', 'Premium', 'User', 'Premium User')
ON CONFLICT ("Email_Address") DO NOTHING;

-- Insert email preferences for test users
INSERT INTO "User_Email_Preferences" ("Email_Address", "Email_Notifications") 
VALUES 
('test@example.com', true),
('premium@example.com', true)
ON CONFLICT ("Email_Address") DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE "Users" IS 'Seawater platform users following Tim-Combo structure with climate risk adaptations';
COMMENT ON TABLE "Trial_Usage" IS 'Detailed trial usage tracking and analytics';
COMMENT ON TABLE "User_Email_Preferences" IS 'GDPR-compliant email preference management';
COMMENT ON TABLE "Property_Assessments" IS 'History of all climate risk assessments';
COMMENT ON TABLE "User_Sessions" IS 'User session tracking for analytics';
COMMENT ON TABLE "Subscription_Tiers" IS 'Available subscription plans configuration';
COMMENT ON TABLE "User_Subscriptions" IS 'User subscription management with Stripe integration';
COMMENT ON TABLE "Trial_Funnel_Events" IS 'Conversion funnel tracking for trial optimization';
COMMENT ON TABLE "Seawater_Email_Campaigns" IS 'Email marketing campaign tracking';

COMMENT ON COLUMN "Users"."cognito_user_id" IS 'AWS Cognito user identifier';
COMMENT ON COLUMN "Users"."subscription_tier" IS 'Current subscription level: trial, individual, professional, enterprise';
COMMENT ON COLUMN "Users"."trial_status" IS 'Trial usage status: active, used, expired, converted';
COMMENT ON COLUMN "Users"."marketing_consent" IS 'Explicit consent for marketing communications (GDPR)';
COMMENT ON COLUMN "Property_Assessments"."Assessment_Data" IS 'Complete JSON climate risk assessment results';
COMMENT ON COLUMN "Property_Assessments"."Is_Trial_Assessment" IS 'Whether this was a trial (free) assessment';
COMMENT ON COLUMN "Trial_Usage"."Usage_Type" IS 'Type of trial interaction: risk_assessment, modal_shown, upgrade_click, page_view';
COMMENT ON COLUMN "User_Subscriptions"."Searches_Used_This_Period" IS 'Number of climate risk searches used in current billing period';