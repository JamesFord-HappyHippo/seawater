/**
 * Seawater Marketing Consent Management
 * GDPR-compliant consent collection, tracking, and management
 * Handles opt-ins, preference updates, and unsubscribe flows
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { lambdaWrapper } = require('../../helpers/lambdaWrapper');

// Database connection
const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

/**
 * Main Lambda handler - routes consent management requests
 */
exports.handler = lambdaWrapper(async (event, context) => {
    console.log('Marketing consent request:', JSON.stringify(event, null, 2));

    const path = event.path || event.pathParameters?.proxy;
    const method = event.httpMethod;

    // Route consent management requests
    switch (true) {
        case path === '/consent/grant' && method === 'POST':
            return await handleConsentGrant(event);
            
        case path === '/consent/withdraw' && method === 'POST':
            return await handleConsentWithdrawal(event);
            
        case path === '/consent/preferences' && method === 'GET':
            return await getConsentPreferences(event);
            
        case path === '/consent/preferences' && method === 'PUT':
            return await updateConsentPreferences(event);
            
        case path === '/consent/unsubscribe' && method === 'GET':
            return await handleUnsubscribeLink(event);
            
        case path === '/consent/unsubscribe' && method === 'POST':
            return await processUnsubscribe(event);
            
        case path === '/consent/resubscribe' && method === 'POST':
            return await handleResubscribe(event);
            
        case path === '/consent/history' && method === 'GET':
            return await getConsentHistory(event);

        case path === '/consent/export' && method === 'GET':
            return await exportUserData(event);

        default:
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Endpoint not found' })
            };
    }
});

/**
 * Handle initial consent grant (registration time)
 */
async function handleConsentGrant(event) {
    try {
        const body = JSON.parse(event.body);
        const { 
            user_id, 
            email, 
            consent_types = ['marketing'], 
            consent_source = 'registration_form',
            privacy_policy_version = '1.0',
            terms_version = '1.0',
            consent_text,
            ip_address,
            user_agent
        } = body;

        // Validate required fields
        if (!user_id && !email) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Either user_id or email is required'
                })
            };
        }

        // Get or find user
        let userId = user_id;
        if (!userId && email) {
            const userResult = await dbPool.query(
                'SELECT id FROM users WHERE email = $1 LIMIT 1',
                [email]
            );
            if (userResult.rows.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }
            userId = userResult.rows[0].id;
        }

        const client = await dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Update user consent status
            const updateUserQuery = `
                UPDATE users SET 
                    marketing_consent = true,
                    marketing_consent_date = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING email, first_name
            `;
            
            const userResult = await client.query(updateUserQuery, [userId]);
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }

            const user = userResult.rows[0];

            // Log consent in history table
            for (const consentType of consent_types) {
                await logConsentEvent(client, {
                    user_id: userId,
                    consent_given: true,
                    consent_type: 'registration',
                    consent_source,
                    consent_text: consent_text || getDefaultConsentText(consentType),
                    privacy_policy_version,
                    terms_version,
                    ip_address: ip_address || event.requestContext?.identity?.sourceIp,
                    user_agent: user_agent || event.headers?.['User-Agent']
                });
            }

            // Create initial preference profile
            await createDefaultPreferences(client, userId);

            await client.query('COMMIT');

            // Queue welcome email (if consent given)
            if (consent_types.includes('marketing')) {
                await queueWelcomeEmail(userId, user.email, user.first_name);
            }

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Marketing consent granted successfully',
                    consent_types,
                    consent_date: new Date().toISOString(),
                    preferences_url: `/consent/preferences?user_id=${userId}`,
                    unsubscribe_url: `/consent/unsubscribe?user_id=${userId}`
                })
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Consent grant failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to grant consent',
                details: error.message 
            })
        };
    }
}

/**
 * Handle consent withdrawal
 */
async function handleConsentWithdrawal(event) {
    try {
        const body = JSON.parse(event.body);
        const { 
            user_id, 
            email, 
            withdrawal_reason = 'user_request',
            consent_source = 'preference_update'
        } = body;

        // Get user ID
        let userId = user_id;
        if (!userId && email) {
            const userResult = await dbPool.query(
                'SELECT id FROM users WHERE email = $1 LIMIT 1',
                [email]
            );
            if (userResult.rows.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }
            userId = userResult.rows[0].id;
        }

        const client = await dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Update user consent status
            const updateUserQuery = `
                UPDATE users SET 
                    marketing_consent = false,
                    marketing_consent_date = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING email, first_name
            `;
            
            const userResult = await client.query(updateUserQuery, [userId]);
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }

            // Log consent withdrawal
            await logConsentEvent(client, {
                user_id: userId,
                consent_given: false,
                consent_type: 'withdrawal',
                consent_source,
                consent_text: `Consent withdrawn. Reason: ${withdrawal_reason}`,
                ip_address: event.requestContext?.identity?.sourceIp,
                user_agent: event.headers?.['User-Agent']
            });

            // Update all email preferences to opt-out
            await client.query(`
                UPDATE users SET 
                    notification_settings = jsonb_set(
                        notification_settings,
                        '{marketing}',
                        'false'
                    )
                WHERE id = $1
            `, [userId]);

            await client.query('COMMIT');

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Marketing consent withdrawn successfully',
                    withdrawal_date: new Date().toISOString(),
                    resubscribe_url: `/consent/resubscribe?user_id=${userId}`
                })
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Consent withdrawal failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to withdraw consent',
                details: error.message 
            })
        };
    }
}

/**
 * Get user consent preferences
 */
async function getConsentPreferences(event) {
    try {
        const userId = event.queryStringParameters?.user_id;
        const email = event.queryStringParameters?.email;

        if (!userId && !email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'user_id or email required' })
            };
        }

        const query = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.marketing_consent,
                u.marketing_consent_date,
                u.notification_settings,
                u.intended_use,
                u.created_at,
                
                -- Latest consent history
                mch.consent_given as last_consent_action,
                mch.consent_source as last_consent_source,
                mch.created_at as last_consent_date
                
            FROM users u
            LEFT JOIN LATERAL (
                SELECT consent_given, consent_source, created_at
                FROM marketing_consent_history
                WHERE user_id = u.id
                ORDER BY created_at DESC
                LIMIT 1
            ) mch ON true
            WHERE u.id = $1 OR u.email = $2
            LIMIT 1
        `;

        const result = await dbPool.query(query, [userId, email]);
        
        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        const user = result.rows[0];
        const preferences = user.notification_settings || {};

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                user_id: user.id,
                email: user.email,
                marketing_consent: user.marketing_consent,
                consent_date: user.marketing_consent_date,
                preferences: {
                    marketing_emails: user.marketing_consent && (preferences.marketing !== false),
                    product_updates: preferences.product_updates !== false,
                    security_alerts: preferences.security_alerts !== false,
                    weekly_digest: preferences.weekly_digest === true,
                    climate_alerts: preferences.climate_alerts === true
                },
                preference_categories: {
                    essential: {
                        label: 'Essential Communications',
                        description: 'Account security, billing, and service updates',
                        required: true,
                        preferences: ['security_alerts', 'product_updates']
                    },
                    marketing: {
                        label: 'Marketing Communications',
                        description: 'Product announcements, tips, and promotional offers',
                        required: false,
                        preferences: ['marketing_emails', 'weekly_digest']
                    },
                    alerts: {
                        label: 'Climate Risk Alerts',
                        description: 'Notifications about climate events affecting your monitored properties',
                        required: false,
                        preferences: ['climate_alerts']
                    }
                },
                legal_info: {
                    last_consent_action: user.last_consent_action,
                    last_consent_source: user.last_consent_source,
                    last_consent_date: user.last_consent_date,
                    data_retention_period: '7 years from last activity',
                    privacy_policy_url: '/privacy',
                    terms_of_service_url: '/terms'
                },
                actions: {
                    update_preferences_url: '/consent/preferences',
                    withdraw_consent_url: '/consent/withdraw',
                    export_data_url: '/consent/export',
                    delete_account_url: '/account/delete'
                }
            })
        };

    } catch (error) {
        console.error('Failed to get consent preferences:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get preferences' })
        };
    }
}

/**
 * Update consent preferences
 */
async function updateConsentPreferences(event) {
    try {
        const body = JSON.parse(event.body);
        const { 
            user_id, 
            email, 
            preferences = {},
            marketing_consent 
        } = body;

        // Get user
        let userId = user_id;
        if (!userId && email) {
            const userResult = await dbPool.query(
                'SELECT id FROM users WHERE email = $1 LIMIT 1',
                [email]
            );
            if (userResult.rows.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }
            userId = userResult.rows[0].id;
        }

        const client = await dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Update notification preferences
            const updateQuery = `
                UPDATE users SET 
                    notification_settings = $1,
                    marketing_consent = COALESCE($2, marketing_consent),
                    marketing_consent_date = CASE 
                        WHEN $2 IS NOT NULL AND $2 != marketing_consent THEN NOW() 
                        ELSE marketing_consent_date 
                    END,
                    updated_at = NOW()
                WHERE id = $3
                RETURNING marketing_consent, notification_settings
            `;
            
            const result = await client.query(updateQuery, [
                JSON.stringify(preferences),
                marketing_consent,
                userId
            ]);

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }

            // Log preference update
            await logConsentEvent(client, {
                user_id: userId,
                consent_given: result.rows[0].marketing_consent,
                consent_type: 'preference_update',
                consent_source: 'preference_settings',
                consent_text: `Preferences updated: ${JSON.stringify(preferences)}`,
                ip_address: event.requestContext?.identity?.sourceIp,
                user_agent: event.headers?.['User-Agent']
            });

            await client.query('COMMIT');

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Preferences updated successfully',
                    marketing_consent: result.rows[0].marketing_consent,
                    preferences: result.rows[0].notification_settings,
                    updated_at: new Date().toISOString()
                })
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Failed to update preferences:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update preferences' })
        };
    }
}

/**
 * Handle unsubscribe link (GET request from email)
 */
async function handleUnsubscribeLink(event) {
    try {
        const userId = event.queryStringParameters?.user_id;
        const token = event.queryStringParameters?.token;
        const email = event.queryStringParameters?.email;

        if (!userId && !email) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'text/html' },
                body: generateUnsubscribePage({
                    error: 'Invalid unsubscribe link. Please contact support.'
                })
            };
        }

        // Get user information
        const query = 'SELECT id, email, first_name, marketing_consent FROM users WHERE id = $1 OR email = $2 LIMIT 1';
        const result = await dbPool.query(query, [userId, email]);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/html' },
                body: generateUnsubscribePage({
                    error: 'User not found. Please contact support.'
                })
            };
        }

        const user = result.rows[0];

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: generateUnsubscribePage({
                user,
                action_url: `/consent/unsubscribe`,
                csrf_token: generateCSRFToken(user.id)
            })
        };

    } catch (error) {
        console.error('Unsubscribe link failed:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: generateUnsubscribePage({
                error: 'Service temporarily unavailable. Please try again later.'
            })
        };
    }
}

/**
 * Process unsubscribe form submission
 */
async function processUnsubscribe(event) {
    try {
        const body = JSON.parse(event.body);
        const { user_id, reason = 'unsubscribe_link', feedback } = body;

        const client = await dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Update user consent
            const updateQuery = `
                UPDATE users SET 
                    marketing_consent = false,
                    marketing_consent_date = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING email, first_name
            `;
            
            const result = await client.query(updateQuery, [user_id]);

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }

            // Log unsubscribe
            await logConsentEvent(client, {
                user_id,
                consent_given: false,
                consent_type: 'withdrawal',
                consent_source: 'email_unsubscribe',
                consent_text: `Unsubscribed via email link. Reason: ${reason}. Feedback: ${feedback || 'None'}`,
                ip_address: event.requestContext?.identity?.sourceIp,
                user_agent: event.headers?.['User-Agent']
            });

            await client.query('COMMIT');

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: generateUnsubscribeSuccessPage({
                    email: result.rows[0].email,
                    resubscribe_url: `/consent/resubscribe?user_id=${user_id}`
                })
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Unsubscribe processing failed:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: generateUnsubscribePage({
                error: 'Failed to process unsubscribe. Please try again.'
            })
        };
    }
}

/**
 * Helper functions
 */

async function logConsentEvent(client, eventData) {
    const query = `
        INSERT INTO marketing_consent_history (
            id,
            user_id,
            consent_given,
            consent_type,
            consent_source,
            consent_text,
            privacy_policy_version,
            terms_version,
            ip_address,
            user_agent,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `;

    await client.query(query, [
        uuidv4(),
        eventData.user_id,
        eventData.consent_given,
        eventData.consent_type,
        eventData.consent_source,
        eventData.consent_text,
        eventData.privacy_policy_version || '1.0',
        eventData.terms_version || '1.0',
        eventData.ip_address,
        eventData.user_agent
    ]);
}

async function createDefaultPreferences(client, userId) {
    const defaultPreferences = {
        marketing: true,
        product_updates: true,
        security_alerts: true,
        weekly_digest: false,
        climate_alerts: false
    };

    await client.query(`
        UPDATE users SET 
            notification_settings = $1
        WHERE id = $2
    `, [JSON.stringify(defaultPreferences), userId]);
}

function getDefaultConsentText(consentType) {
    const consentTexts = {
        marketing: 'I agree to receive marketing communications from Seawater, including product updates, tips, and promotional offers. I understand I can unsubscribe at any time.',
        analytics: 'I agree to the collection of anonymized usage data to help improve the Seawater platform.',
        cookies: 'I agree to the use of cookies for essential site functionality and analytics.'
    };

    return consentTexts[consentType] || 'Consent granted for platform communications.';
}

async function queueWelcomeEmail(userId, email, firstName) {
    // TODO: Integrate with email service (SES/SendGrid)
    console.log('Queueing welcome email:', { userId, email, firstName });
}

function generateCSRFToken(userId) {
    // Simple CSRF token generation - in production, use crypto
    return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

function generateUnsubscribePage(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Unsubscribe - Seawater</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .form { background: #f8f9fa; padding: 30px; border-radius: 8px; }
            .error { color: #dc3545; background: #f8d7da; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            .btn-danger { background: #dc3545; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌊 Seawater</h1>
            <h2>Unsubscribe from Marketing Emails</h2>
        </div>
        
        ${data.error ? `<div class="error">${data.error}</div>` : ''}
        
        ${data.user ? `
        <div class="form">
            <p>Hi ${data.user.first_name || 'there'},</p>
            <p>We're sorry to see you go! You can unsubscribe from marketing emails below. You'll still receive important account and security notifications.</p>
            
            <form method="post" action="${data.action_url}">
                <input type="hidden" name="user_id" value="${data.user.id}">
                <input type="hidden" name="csrf_token" value="${data.csrf_token}">
                
                <div class="form-group">
                    <label>Why are you unsubscribing? (Optional)</label>
                    <select name="reason">
                        <option value="too_frequent">Too many emails</option>
                        <option value="not_relevant">Content not relevant</option>
                        <option value="never_signed_up">Never signed up</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Additional feedback (Optional)</label>
                    <textarea name="feedback" rows="3" placeholder="Help us improve..."></textarea>
                </div>
                
                <button type="submit" class="btn btn-danger">Unsubscribe</button>
                <a href="/login" class="btn" style="margin-left: 10px; text-decoration: none;">Keep Subscription</a>
            </form>
        </div>
        ` : ''}
    </body>
    </html>
    `;
}

function generateUnsubscribeSuccessPage(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Unsubscribed - Seawater</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #155724; background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>🌊 Seawater</h1>
        <div class="success">
            <h2>Successfully Unsubscribed</h2>
            <p>You have been unsubscribed from marketing emails for ${data.email}.</p>
            <p>You'll still receive important account and security notifications.</p>
        </div>
        
        <p>Changed your mind? <a href="${data.resubscribe_url}" class="btn">Resubscribe</a></p>
        <p><a href="/">Return to Seawater</a></p>
    </body>
    </html>
    `;
}

// Cleanup database connections on process termination
process.on('SIGTERM', async () => {
    await dbPool.end();
});

process.on('SIGINT', async () => {
    await dbPool.end();
});