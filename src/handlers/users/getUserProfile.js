/**
 * Get User Profile Handler - Seawater Climate Risk Platform
 * Returns comprehensive user profile including trial status, subscription, and usage analytics
 */

const { lambdaWrapper } = require('../../helpers/lambdaWrapper');
const { getTrialStatus } = require('../../helpers/trialMiddleware');
const { Pool } = require('pg');

// Database connection
const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

/**
 * Get comprehensive user profile with trial and subscription information
 */
async function getUserProfileHandler(event, context) {
    try {
        // Extract email from JWT context (set by authorizer) - following Tim-Combo pattern
        const userContext = event.requestContext?.authorizer;
        if (!userContext || !userContext.email_address) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Authentication required',
                    error_code: 'AUTH_REQUIRED'
                })
            };
        }

        const emailAddress = userContext.email_address;

        console.log('Getting user profile for:', emailAddress);

        // Get comprehensive user data following Tim-Combo structure
        const userQuery = `
            SELECT 
                u."Email_Address",
                u."Client_ID",
                u."User_Status",
                u."User_Status_Date",
                u."Last_Login_Date",
                u."User_Display_Name",
                u."Communication_Preference",
                u."Notification_Status",
                u."Create_Date",
                u."Super_Admin",
                u."active",
                u."terms",
                u."terms_date",
                
                -- Seawater-specific user fields
                u."cognito_user_id",
                u."subscription_tier",
                u."email_verified",
                u."email_verified_at",
                u."first_name",
                u."last_name",
                u."company",
                u."job_title",
                u."intended_use",
                u."marketing_consent",
                u."marketing_consent_date",
                u."referral_source",
                u."utm_source",
                u."utm_medium",
                u."utm_campaign",
                u."lead_score",
                
                -- Trial information
                u."trial_status",
                u."trial_reports_used",
                u."trial_reports_limit",
                u."trial_started_at",
                u."trial_expires_at",
                u."trial_converted_at",
                
                -- Subscription information
                COALESCE(st."Tier_Name", u."subscription_tier") as tier_name,
                COALESCE(st."Tier_Display_Name", 'Free Trial') as tier_display_name,
                COALESCE(st."Monthly_Price_Cents", 0) as monthly_price_cents,
                COALESCE(st."Searches_Per_Month", 1) as searches_allowed,
                COALESCE(st."Premium_Data", false) as has_premium_data,
                COALESCE(st."Projections", false) as has_projections,
                COALESCE(st."API_Access", false) as has_api_access,
                
                -- Current subscription details
                us."Status" as subscription_status,
                us."Billing_Cycle",
                us."Current_Period_Start",
                us."Current_Period_End",
                us."Cancel_At_Period_End",
                us."Searches_Used_This_Period",
                us."API_Calls_Used_This_Period",
                us."Stripe_Customer_ID",
                
                -- Usage statistics
                COUNT(DISTINCT tu."Usage_ID") as total_trial_usage_events,
                COUNT(DISTINCT CASE WHEN tu."Usage_Type" = 'risk_assessment' THEN tu."Usage_ID" END) as risk_assessments_made,
                MAX(tu."Created_At") as last_usage_date
                
            FROM "Users" u
            LEFT JOIN "User_Subscriptions" us ON u."Email_Address" = us."Email_Address" AND us."Status" = 'active'
            LEFT JOIN "Subscription_Tiers" st ON us."Tier_ID" = st."Tier_ID"
            LEFT JOIN "Trial_Usage" tu ON u."Email_Address" = tu."Email_Address"
            WHERE u."Email_Address" = $1
            GROUP BY u."Email_Address", st."Tier_ID", us."Subscription_ID"
            LIMIT 1
        `;

        const userResult = await dbPool.query(userQuery, [emailAddress]);
        
        if (userResult.rows.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'User not found',
                    error_code: 'USER_NOT_FOUND'
                })
            };
        }

        const userData = userResult.rows[0];

        // Get trial status with analytics
        const trialStatus = await getTrialStatus(emailAddress);

        // Get recent activity summary
        const activityQuery = `
            SELECT 
                "Event_Type",
                COUNT(*) as count,
                MAX("Created_At") as last_occurrence
            FROM "Trial_Funnel_Events"
            WHERE "Email_Address" = $1
            AND "Created_At" >= NOW() - INTERVAL '30 days'
            GROUP BY "Event_Type"
            ORDER BY last_occurrence DESC
        `;

        const activityResult = await dbPool.query(activityQuery, [emailAddress]);

        // Get usage timeline
        const timelineQuery = `
            SELECT 
                "Usage_Type",
                "Property_Address",
                "Data_Sources_Used",
                "Processing_Time_MS",
                "Created_At"
            FROM "Trial_Usage"
            WHERE "Email_Address" = $1
            ORDER BY "Created_At" DESC
            LIMIT 10
        `;

        const timelineResult = await dbPool.query(timelineQuery, [emailAddress]);

        // Calculate profile completeness
        const profileCompleteness = calculateProfileCompleteness(userData);

        // Prepare response following Tim-Combo structure
        const profile = {
            // Basic user information
            email_address: userData.Email_Address,
            client_id: userData.Client_ID,
            email: userData.Email_Address, // Alias for frontend compatibility
            first_name: userData.first_name,
            last_name: userData.last_name,
            full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
            user_display_name: userData.User_Display_Name,
            user_status: userData.User_Status,
            account_status: userData.User_Status,
            
            // Account verification
            email_verified: userData.email_verified,
            email_verified_at: userData.email_verified_at,
            active: userData.active,
            super_admin: userData.Super_Admin,
            
            // Marketing and preferences
            marketing_consent: userData.marketing_consent,
            marketing_consent_date: userData.marketing_consent_date,
            intended_use: userData.intended_use,
            referral_source: userData.referral_source,
            utm_source: userData.utm_source,
            utm_medium: userData.utm_medium,
            utm_campaign: userData.utm_campaign,
            lead_score: userData.lead_score,
            
            // Account activity
            last_login_date: userData.Last_Login_Date,
            registration_date: new Date(userData.Create_Date * 1000), // Convert epoch to date
            communication_preference: userData.Communication_Preference,
            notification_status: userData.Notification_Status,
            
            // Trial information
            trial: {
                status: userData.trial_status,
                allowed: userData.trial_status === 'active',
                reports_used: userData.trial_reports_used,
                reports_limit: userData.trial_reports_limit,
                remaining_requests: Math.max(0, userData.trial_reports_limit - userData.trial_reports_used),
                trial_started: userData.trial_started_at,
                trial_expires: userData.trial_expires_at,
                converted_at: userData.trial_converted_at
            },
            
            // Subscription information
            subscription: {
                tier: userData.tier_name,
                display_name: userData.tier_display_name,
                status: userData.subscription_status || 'inactive',
                billing_cycle: userData.Billing_Cycle,
                monthly_price_cents: userData.monthly_price_cents,
                current_period_start: userData.Current_Period_Start,
                current_period_end: userData.Current_Period_End,
                cancel_at_period_end: userData.Cancel_At_Period_End,
                has_stripe_customer: !!userData.Stripe_Customer_ID
            },
            
            // Feature access
            features: {
                searches_allowed: userData.searches_allowed,
                searches_used_this_period: userData.Searches_Used_This_Period || 0,
                api_calls_used_this_period: userData.API_Calls_Used_This_Period || 0,
                has_premium_data: userData.has_premium_data,
                has_projections: userData.has_projections,
                has_api_access: userData.has_api_access,
                unlimited_searches: userData.searches_allowed === -1 || userData.subscription_tier !== 'trial'
            },
            
            // Usage statistics
            usage_stats: {
                total_trial_events: parseInt(userData.total_trial_usage_events) || 0,
                risk_assessments_made: parseInt(userData.risk_assessments_made) || 0,
                last_usage_date: userData.last_usage_date,
                recent_activity: activityResult.rows,
                usage_timeline: timelineResult.rows
            },
            
            // Profile metadata
            profile_completeness: profileCompleteness,
            is_trial_user: userData.subscription_tier === 'trial',
            is_paid_user: userData.subscription_tier !== 'trial',
            needs_upgrade: userData.trial_status === 'used' || userData.trial_status === 'expired',
            
            // Action URLs
            actions: {
                update_profile: '/api/users/profile',
                update_preferences: '/api/consent/preferences',
                upgrade_subscription: '/upgrade',
                billing_portal: userData.stripe_customer_id ? '/api/billing/portal' : null,
                download_data: '/api/consent/export',
                delete_account: '/api/users/delete'
            }
        };

        // Add upgrade recommendations for trial users
        if (profile.is_trial_user && profile.needs_upgrade) {
            profile.upgrade_recommendations = getUpgradeRecommendations(userData, profile.trial);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({
                success: true,
                profile,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error getting user profile:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to get user profile',
                error_code: 'PROFILE_ERROR',
                details: error.message
            })
        };
    }
}

/**
 * Calculate profile completeness percentage
 */
function calculateProfileCompleteness(userData) {
    const fields = {
        first_name: !!userData.first_name,
        last_name: !!userData.last_name,
        email_verified: userData.email_verified,
        intended_use: !!userData.intended_use,
        marketing_consent_set: userData.marketing_consent_date !== null
    };

    const completed = Object.values(fields).filter(Boolean).length;
    const total = Object.keys(fields).length;
    
    return {
        percentage: Math.round((completed / total) * 100),
        completed_fields: completed,
        total_fields: total,
        missing_fields: Object.keys(fields).filter(key => !fields[key])
    };
}

/**
 * Get personalized upgrade recommendations
 */
function getUpgradeRecommendations(userData, trialStatus) {
    const recommendations = [];

    if (userData.intended_use === 'business') {
        recommendations.push({
            tier: 'professional',
            reason: 'business_user',
            title: 'Perfect for Business Use',
            description: 'Unlimited assessments, API access, and priority support for your business needs.',
            primary: true
        });
    }

    if (trialStatus.analytics?.unique_properties_searched > 3) {
        recommendations.push({
            tier: 'premium',
            reason: 'high_usage',
            title: 'You\'re an Active User',
            description: 'With your usage patterns, Premium gives you the best value with unlimited reports.',
            primary: !recommendations.length
        });
    }

    if (!recommendations.length) {
        recommendations.push({
            tier: 'premium',
            reason: 'general',
            title: 'Continue Your Climate Risk Analysis',
            description: 'Upgrade to Premium for unlimited property assessments and premium data sources.',
            primary: true
        });
    }

    return recommendations;
}

module.exports = {
    handler: lambdaWrapper(getUserProfileHandler)
};