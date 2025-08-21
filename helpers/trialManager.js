/**
 * Seawater Trial Manager
 * Server-side trial tracking and validation
 * Prevents circumvention of trial limits
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class TrialManager {
    constructor(databaseUrl = process.env.DATABASE_URL) {
        this.dbPool = new Pool({
            connectionString: databaseUrl,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }

    /**
     * Check if user can make a trial request
     * @param {string} userId - User ID
     * @param {string} requestType - Type of request (risk_assessment, property_search, etc.)
     * @returns {Object} - Trial status and validation result
     */
    async validateTrialRequest(userId, requestType = 'risk_assessment') {
        try {
            const userQuery = `
                SELECT 
                    id,
                    email,
                    trial_status,
                    trial_reports_used,
                    trial_reports_limit,
                    trial_started_at,
                    trial_expires_at,
                    trial_converted_at,
                    last_active_at,
                    
                    -- Subscription info
                    COALESCE(st.tier_name, 'free') as subscription_tier,
                    COALESCE(us.status, 'inactive') as subscription_status
                    
                FROM users u
                LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
                LEFT JOIN subscription_tiers st ON us.tier_id = st.id
                WHERE u.id = $1
                LIMIT 1
            `;

            const result = await this.dbPool.query(userQuery, [userId]);
            
            if (result.rows.length === 0) {
                return {
                    allowed: false,
                    reason: 'User not found',
                    trial_status: 'invalid',
                    error_code: 'USER_NOT_FOUND'
                };
            }

            const user = result.rows[0];

            // Paid subscribers always allowed
            if (user.subscription_tier !== 'free' && user.subscription_status === 'active') {
                return {
                    allowed: true,
                    reason: 'Paid subscriber',
                    trial_status: 'paid',
                    subscription_tier: user.subscription_tier,
                    remaining_requests: -1 // Unlimited
                };
            }

            // Check trial expiration
            if (user.trial_expires_at && new Date(user.trial_expires_at) < new Date()) {
                await this.expireTrial(userId);
                return {
                    allowed: false,
                    reason: 'Trial expired',
                    trial_status: 'expired',
                    error_code: 'TRIAL_EXPIRED',
                    expired_at: user.trial_expires_at,
                    days_since_expiry: Math.floor((new Date() - new Date(user.trial_expires_at)) / (1000 * 60 * 60 * 24))
                };
            }

            // Check trial usage limits
            if (user.trial_status === 'active') {
                const remaining = user.trial_reports_limit - user.trial_reports_used;
                
                if (remaining <= 0) {
                    await this.markTrialUsed(userId);
                    return {
                        allowed: false,
                        reason: 'Trial limit reached',
                        trial_status: 'used',
                        error_code: 'TRIAL_LIMIT_REACHED',
                        reports_used: user.trial_reports_used,
                        reports_limit: user.trial_reports_limit,
                        trial_started: user.trial_started_at
                    };
                }

                return {
                    allowed: true,
                    reason: 'Trial user within limits',
                    trial_status: 'active',
                    reports_used: user.trial_reports_used,
                    reports_limit: user.trial_reports_limit,
                    remaining_requests: remaining,
                    trial_started: user.trial_started_at,
                    trial_expires: user.trial_expires_at
                };
            }

            // Trial already used
            if (user.trial_status === 'used') {
                return {
                    allowed: false,
                    reason: 'Trial already used',
                    trial_status: 'used',
                    error_code: 'TRIAL_ALREADY_USED',
                    reports_used: user.trial_reports_used,
                    reports_limit: user.trial_reports_limit,
                    trial_started: user.trial_started_at
                };
            }

            // Trial converted to paid
            if (user.trial_status === 'converted') {
                return {
                    allowed: true,
                    reason: 'Converted trial user',
                    trial_status: 'converted',
                    subscription_tier: user.subscription_tier,
                    converted_at: user.trial_converted_at
                };
            }

            // Default deny for unknown trial status
            return {
                allowed: false,
                reason: 'Invalid trial status',
                trial_status: user.trial_status,
                error_code: 'INVALID_TRIAL_STATUS'
            };

        } catch (error) {
            console.error('Trial validation failed:', error);
            return {
                allowed: false,
                reason: 'Validation error',
                trial_status: 'error',
                error_code: 'VALIDATION_ERROR',
                error: error.message
            };
        }
    }

    /**
     * Record trial usage
     * @param {string} userId - User ID
     * @param {Object} usageData - Usage details
     * @returns {Object} - Usage tracking result
     */
    async recordTrialUsage(userId, usageData = {}) {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Get current user state
            const userQuery = `
                SELECT trial_status, trial_reports_used, trial_reports_limit
                FROM users 
                WHERE id = $1 
                FOR UPDATE
            `;
            
            const userResult = await client.query(userQuery, [userId]);
            
            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];

            // Record usage event
            const usageId = uuidv4();
            const usageQuery = `
                INSERT INTO trial_usage (
                    id,
                    user_id,
                    usage_type,
                    resource_id,
                    trial_status_at_time,
                    reports_used_before,
                    reports_remaining,
                    ip_address,
                    user_agent,
                    session_id,
                    property_address,
                    property_location,
                    processing_time_ms,
                    data_sources_used,
                    api_cost_cents,
                    created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
                    ST_SetSRID(ST_MakePoint($12, $13), 4326), $14, $15, $16, NOW()
                )
            `;

            const reportsRemaining = Math.max(0, user.trial_reports_limit - user.trial_reports_used - 1);

            await client.query(usageQuery, [
                usageId,
                userId,
                usageData.usage_type || 'risk_assessment',
                usageData.resource_id,
                user.trial_status,
                user.trial_reports_used,
                reportsRemaining,
                usageData.ip_address,
                usageData.user_agent,
                usageData.session_id,
                usageData.property_address,
                usageData.longitude || null,
                usageData.latitude || null,
                usageData.processing_time_ms,
                usageData.data_sources_used || [],
                usageData.api_cost_cents || 0
            ]);

            // Update user trial usage count
            const newUsageCount = user.trial_reports_used + 1;
            const newTrialStatus = newUsageCount >= user.trial_reports_limit ? 'used' : 'active';

            const updateQuery = `
                UPDATE users SET 
                    trial_reports_used = $1,
                    trial_status = $2,
                    last_active_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
            `;

            await client.query(updateQuery, [newUsageCount, newTrialStatus, userId]);

            // Log funnel event
            await this.logFunnelEvent(client, userId, 'trial_used', {
                usage_type: usageData.usage_type,
                reports_used: newUsageCount,
                reports_remaining: Math.max(0, user.trial_reports_limit - newUsageCount),
                trial_status: newTrialStatus,
                property_address: usageData.property_address
            });

            // If trial limit reached, log limit reached event
            if (newTrialStatus === 'used') {
                await this.logFunnelEvent(client, userId, 'trial_limit_reached', {
                    reports_used: newUsageCount,
                    reports_limit: user.trial_reports_limit,
                    trial_duration_hours: this.calculateTrialDuration(user.trial_started_at)
                });
            }

            await client.query('COMMIT');

            return {
                success: true,
                usage_id: usageId,
                reports_used: newUsageCount,
                reports_limit: user.trial_reports_limit,
                reports_remaining: Math.max(0, user.trial_reports_limit - newUsageCount),
                trial_status: newTrialStatus,
                trial_limit_reached: newTrialStatus === 'used'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Failed to record trial usage:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get trial usage analytics for user
     * @param {string} userId - User ID
     * @returns {Object} - Usage analytics
     */
    async getTrialAnalytics(userId) {
        try {
            const analyticsQuery = `
                SELECT 
                    u.trial_status,
                    u.trial_reports_used,
                    u.trial_reports_limit,
                    u.trial_started_at,
                    u.trial_expires_at,
                    
                    -- Usage statistics
                    COUNT(tu.id) as total_usage_events,
                    MIN(tu.created_at) as first_usage,
                    MAX(tu.created_at) as last_usage,
                    
                    -- Geographic diversity
                    COUNT(DISTINCT tu.property_address) as unique_properties_searched,
                    
                    -- Performance metrics
                    AVG(tu.processing_time_ms) as avg_processing_time,
                    SUM(tu.api_cost_cents) as total_api_cost_cents,
                    
                    -- Engagement metrics
                    EXTRACT(days FROM NOW() - u.trial_started_at) as trial_days_active,
                    EXTRACT(days FROM u.trial_expires_at - NOW()) as trial_days_remaining
                    
                FROM users u
                LEFT JOIN trial_usage tu ON u.id = tu.user_id
                WHERE u.id = $1
                GROUP BY u.id
            `;

            const result = await this.dbPool.query(analyticsQuery, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const analytics = result.rows[0];

            // Calculate engagement score (0-100)
            const engagementScore = this.calculateEngagementScore(analytics);

            // Get recent usage timeline
            const timelineQuery = `
                SELECT 
                    usage_type,
                    property_address,
                    data_sources_used,
                    processing_time_ms,
                    created_at
                FROM trial_usage
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 10
            `;

            const timelineResult = await this.dbPool.query(timelineQuery, [userId]);

            return {
                ...analytics,
                engagement_score: engagementScore,
                usage_timeline: timelineResult.rows,
                conversion_likelihood: this.assessConversionLikelihood(analytics, engagementScore)
            };

        } catch (error) {
            console.error('Failed to get trial analytics:', error);
            throw error;
        }
    }

    /**
     * Check for trial abuse patterns
     * @param {string} identifier - IP address, email, or device fingerprint
     * @param {string} identifierType - Type of identifier
     * @returns {Object} - Abuse detection result
     */
    async checkTrialAbuse(identifier, identifierType = 'ip_address') {
        try {
            let query;
            let params;

            switch (identifierType) {
                case 'ip_address':
                    query = `
                        SELECT 
                            COUNT(DISTINCT u.id) as unique_users,
                            COUNT(tu.id) as total_usage_events,
                            MIN(tu.created_at) as first_usage,
                            MAX(tu.created_at) as last_usage,
                            ARRAY_AGG(DISTINCT u.email) as emails
                        FROM trial_usage tu
                        JOIN users u ON tu.user_id = u.id
                        WHERE tu.ip_address = $1
                        AND tu.created_at >= NOW() - INTERVAL '30 days'
                    `;
                    params = [identifier];
                    break;

                case 'email_domain':
                    query = `
                        SELECT 
                            COUNT(DISTINCT u.id) as unique_users,
                            COUNT(tu.id) as total_usage_events,
                            MIN(u.created_at) as first_registration,
                            MAX(u.created_at) as last_registration,
                            ARRAY_AGG(u.email) as emails
                        FROM users u
                        LEFT JOIN trial_usage tu ON u.id = tu.user_id
                        WHERE u.email LIKE $1
                        AND u.created_at >= NOW() - INTERVAL '30 days'
                    `;
                    params = [`%@${identifier}`];
                    break;

                default:
                    throw new Error('Invalid identifier type');
            }

            const result = await this.dbPool.query(query, params);
            const data = result.rows[0];

            // Define abuse thresholds
            const abuseThresholds = {
                max_users_per_ip: 5,
                max_usage_events_per_ip: 20,
                max_users_per_domain: 10
            };

            let abuseScore = 0;
            const flags = [];

            if (identifierType === 'ip_address') {
                if (data.unique_users > abuseThresholds.max_users_per_ip) {
                    abuseScore += 50;
                    flags.push('multiple_users_same_ip');
                }
                
                if (data.total_usage_events > abuseThresholds.max_usage_events_per_ip) {
                    abuseScore += 30;
                    flags.push('excessive_usage_same_ip');
                }
            }

            if (identifierType === 'email_domain') {
                if (data.unique_users > abuseThresholds.max_users_per_domain) {
                    abuseScore += 40;
                    flags.push('bulk_registration_domain');
                }
            }

            // Check for rapid sequential registrations
            if (data.first_registration && data.last_registration) {
                const timeDiff = new Date(data.last_registration) - new Date(data.first_registration);
                if (timeDiff < 60000 && data.unique_users > 2) { // 1 minute
                    abuseScore += 60;
                    flags.push('rapid_sequential_registrations');
                }
            }

            return {
                abuse_score: abuseScore,
                risk_level: this.getRiskLevel(abuseScore),
                flags,
                data: {
                    unique_users: parseInt(data.unique_users),
                    total_usage_events: parseInt(data.total_usage_events),
                    first_seen: data.first_usage || data.first_registration,
                    last_seen: data.last_usage || data.last_registration
                },
                action_recommended: this.getRecommendedAction(abuseScore, flags)
            };

        } catch (error) {
            console.error('Abuse check failed:', error);
            return {
                abuse_score: 0,
                risk_level: 'unknown',
                flags: ['check_failed'],
                error: error.message
            };
        }
    }

    /**
     * Mark trial as expired
     */
    async expireTrial(userId) {
        const query = `
            UPDATE users SET 
                trial_status = 'expired',
                updated_at = NOW()
            WHERE id = $1 AND trial_status != 'converted'
        `;
        
        await this.dbPool.query(query, [userId]);
    }

    /**
     * Mark trial as used
     */
    async markTrialUsed(userId) {
        const query = `
            UPDATE users SET 
                trial_status = 'used',
                updated_at = NOW()
            WHERE id = $1 AND trial_status = 'active'
        `;
        
        await this.dbPool.query(query, [userId]);
    }

    /**
     * Convert trial to paid subscription
     */
    async convertTrial(userId, subscriptionData) {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Update user trial status
            const updateUserQuery = `
                UPDATE users SET 
                    trial_status = 'converted',
                    trial_converted_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            `;
            
            await client.query(updateUserQuery, [userId]);

            // Record conversion event
            const conversionId = uuidv4();
            const conversionQuery = `
                INSERT INTO trial_conversions (
                    id,
                    user_id,
                    conversion_type,
                    subscription_tier,
                    conversion_value_cents,
                    trial_reports_used,
                    trial_duration_hours,
                    days_since_registration,
                    conversion_trigger,
                    stripe_customer_id,
                    stripe_subscription_id,
                    created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
                )
            `;

            await client.query(conversionQuery, [
                conversionId,
                userId,
                subscriptionData.conversion_type || 'subscription',
                subscriptionData.subscription_tier,
                subscriptionData.conversion_value_cents || 0,
                subscriptionData.trial_reports_used || 0,
                subscriptionData.trial_duration_hours || 0,
                subscriptionData.days_since_registration || 0,
                subscriptionData.conversion_trigger || 'upgrade_button',
                subscriptionData.stripe_customer_id,
                subscriptionData.stripe_subscription_id
            ]);

            // Log funnel event
            await this.logFunnelEvent(client, userId, 'converted', {
                conversion_type: subscriptionData.conversion_type,
                subscription_tier: subscriptionData.subscription_tier,
                conversion_value_cents: subscriptionData.conversion_value_cents
            });

            await client.query('COMMIT');

            return {
                success: true,
                conversion_id: conversionId,
                trial_status: 'converted'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Trial conversion failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Helper methods
     */

    async logFunnelEvent(client, userId, eventType, eventData = {}) {
        const eventSteps = {
            'registration_started': 1,
            'email_verified': 2,
            'trial_initialized': 3,
            'first_search': 4,
            'trial_used': 5,
            'trial_limit_reached': 6,
            'upgrade_viewed': 7,
            'converted': 8
        };

        const query = `
            INSERT INTO trial_funnel_events (
                id, user_id, event_type, event_step, event_data, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
        `;

        await client.query(query, [
            uuidv4(),
            userId,
            eventType,
            eventSteps[eventType] || 0,
            JSON.stringify(eventData)
        ]);
    }

    calculateTrialDuration(trialStartedAt) {
        if (!trialStartedAt) return 0;
        return Math.floor((new Date() - new Date(trialStartedAt)) / (1000 * 60 * 60));
    }

    calculateEngagementScore(analytics) {
        let score = 0;
        
        // Usage frequency (0-40 points)
        const usageRatio = analytics.trial_reports_used / analytics.trial_reports_limit;
        score += usageRatio * 40;
        
        // Property diversity (0-20 points)
        if (analytics.unique_properties_searched > 1) {
            score += Math.min(20, analytics.unique_properties_searched * 5);
        }
        
        // Recency (0-20 points)
        if (analytics.last_usage) {
            const daysSinceLastUsage = (new Date() - new Date(analytics.last_usage)) / (1000 * 60 * 60 * 24);
            score += Math.max(0, 20 - daysSinceLastUsage * 2);
        }
        
        // Trial age (0-20 points)
        if (analytics.trial_days_active > 0 && analytics.trial_days_active <= 30) {
            score += 20 - (analytics.trial_days_active * 0.5);
        }
        
        return Math.min(100, Math.round(score));
    }

    assessConversionLikelihood(analytics, engagementScore) {
        if (analytics.trial_status === 'used' && engagementScore > 70) {
            return 'high';
        } else if (analytics.trial_status === 'active' && analytics.trial_reports_used > 0 && engagementScore > 50) {
            return 'medium';
        } else if (analytics.trial_status === 'active' && analytics.trial_days_active <= 7) {
            return 'low';
        } else {
            return 'minimal';
        }
    }

    getRiskLevel(abuseScore) {
        if (abuseScore >= 80) return 'high';
        if (abuseScore >= 50) return 'medium';
        if (abuseScore >= 20) return 'low';
        return 'none';
    }

    getRecommendedAction(abuseScore, flags) {
        if (abuseScore >= 80) {
            return 'block_immediately';
        } else if (abuseScore >= 50) {
            return 'require_manual_review';
        } else if (flags.includes('rapid_sequential_registrations')) {
            return 'add_rate_limiting';
        } else if (abuseScore >= 20) {
            return 'monitor_closely';
        } else {
            return 'allow';
        }
    }

    /**
     * Cleanup method
     */
    async close() {
        await this.dbPool.end();
    }
}

module.exports = TrialManager;