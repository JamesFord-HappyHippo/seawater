/**
 * Seawater User Registration Handler
 * Handles user registration, trial initialization, and marketing consent
 * Integrates with Cognito post-confirmation triggers
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
 * Main Lambda handler - routes different registration events
 */
exports.handler = lambdaWrapper(async (event, context) => {
    console.log('Registration event:', JSON.stringify(event, null, 2));

    // Handle Cognito post-confirmation trigger
    if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
        return await handlePostConfirmation(event);
    }

    // Handle direct API registration calls
    if (event.httpMethod) {
        const path = event.path || event.pathParameters?.proxy;
        
        switch (path) {
            case '/register':
                return await handleApiRegistration(event);
            case '/register/verify':
                return await handleEmailVerification(event);
            case '/register/resend':
                return await handleResendVerification(event);
            case '/register/marketing-consent':
                return await handleMarketingConsentUpdate(event);
            default:
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Endpoint not found' })
                };
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid event type' })
    };
});

/**
 * Handle Cognito post-confirmation trigger
 * Called automatically when user confirms their email
 */
async function handlePostConfirmation(event) {
    try {
        const { userAttributes, userName } = event.request;
        
        console.log('Post-confirmation for user:', userName, userAttributes);

        // Extract user data from Cognito attributes
        const userData = {
            cognito_user_id: userAttributes.sub,
            email: userAttributes.email,
            first_name: userAttributes.given_name || '',
            last_name: userAttributes.family_name || '',
            marketing_consent: userAttributes['custom:marketing_consent'] === 'true',
            intended_use: userAttributes['custom:intended_use'] || 'personal',
            referral_source: userAttributes['custom:referral_source'] || 'direct'
        };

        // Create or update user in database
        const user = await createOrUpdateUser(userData);

        // Initialize trial
        await initializeTrial(user.id, userData);

        // Log funnel event
        await logFunnelEvent(user.id, 'email_verified', {
            cognito_user_id: userData.cognito_user_id,
            registration_source: 'cognito_confirmation'
        });

        // Send welcome email (async)
        await sendWelcomeEmail(user.id, userData).catch(err => {
            console.warn('Welcome email failed:', err.message);
        });

        console.log('Post-confirmation completed for user:', user.id);

        // Return the event for Cognito (required for triggers)
        return event;

    } catch (error) {
        console.error('Post-confirmation failed:', error);
        // Don't fail the Cognito flow for database errors
        return event;
    }
}

/**
 * Handle direct API registration (alternative to Cognito hosted UI)
 */
async function handleApiRegistration(event) {
    try {
        const body = JSON.parse(event.body);
        const { 
            email, 
            password, 
            first_name, 
            last_name, 
            marketing_consent = false,
            intended_use = 'personal',
            referral_source = 'direct',
            utm_source,
            utm_medium,
            utm_campaign
        } = body;

        // Validate required fields
        if (!email || !password || !first_name || !last_name) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Missing required fields',
                    required: ['email', 'password', 'first_name', 'last_name']
                })
            };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid email format' })
            };
        }

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return {
                statusCode: 409,
                body: JSON.stringify({ 
                    error: 'User already exists',
                    action: 'login'
                })
            };
        }

        // Create user in database (before Cognito for transaction safety)
        const userData = {
            email,
            first_name,
            last_name,
            marketing_consent,
            intended_use,
            referral_source: utm_source || referral_source,
            user_type: intended_use === 'business' ? 'professional' : 'individual'
        };

        const user = await createUser(userData);

        // Log funnel event
        await logFunnelEvent(user.id, 'registration_started', {
            registration_method: 'api',
            utm_source,
            utm_medium,
            utm_campaign,
            ip_address: event.requestContext?.identity?.sourceIp
        });

        // Initialize trial immediately for API registrations
        await initializeTrial(user.id, userData);

        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                user_id: user.id,
                trial_status: 'active',
                trial_reports_limit: 1,
                message: 'Registration successful. You can now access your free climate risk assessment!',
                next_steps: [
                    'Search for any US property address',
                    'Get your comprehensive climate risk report',
                    'Explore upgrade options for unlimited access'
                ]
            })
        };

    } catch (error) {
        console.error('API registration failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Registration failed',
                details: error.message 
            })
        };
    }
}

/**
 * Handle email verification for API registrations
 */
async function handleEmailVerification(event) {
    try {
        const body = JSON.parse(event.body);
        const { email, verification_code } = body;

        if (!email || !verification_code) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email and verification code required' })
            };
        }

        // Update user as verified
        const user = await markEmailVerified(email);
        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        // Log funnel event
        await logFunnelEvent(user.id, 'email_verified', {
            verification_method: 'api'
        });

        // Send welcome email
        await sendWelcomeEmail(user.id, user).catch(err => {
            console.warn('Welcome email failed:', err.message);
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Email verified successfully',
                trial_status: user.trial_status,
                trial_reports_limit: user.trial_reports_limit
            })
        };

    } catch (error) {
        console.error('Email verification failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Verification failed' })
        };
    }
}

/**
 * Create or update user in database
 */
async function createOrUpdateUser(userData) {
    const client = await dbPool.connect();
    
    try {
        await client.query('BEGIN');

        // Check if user exists by Cognito ID or email
        const existingQuery = `
            SELECT id, email, trial_status 
            FROM users 
            WHERE cognito_user_id = $1 OR email = $2
            LIMIT 1
        `;
        const existingResult = await client.query(existingQuery, [
            userData.cognito_user_id, 
            userData.email
        ]);

        let user;

        if (existingResult.rows.length > 0) {
            // Update existing user
            const updateQuery = `
                UPDATE users SET 
                    cognito_user_id = $1,
                    email = $2,
                    first_name = COALESCE($3, first_name),
                    last_name = COALESCE($4, last_name),
                    email_verified = true,
                    email_verified_at = NOW(),
                    marketing_consent = $5,
                    marketing_consent_date = CASE WHEN $5 THEN NOW() ELSE marketing_consent_date END,
                    intended_use = COALESCE($6, intended_use),
                    referral_source = COALESCE($7, referral_source),
                    updated_at = NOW()
                WHERE id = $8
                RETURNING *
            `;
            
            const updateResult = await client.query(updateQuery, [
                userData.cognito_user_id,
                userData.email,
                userData.first_name,
                userData.last_name,
                userData.marketing_consent,
                userData.intended_use,
                userData.referral_source,
                existingResult.rows[0].id
            ]);
            
            user = updateResult.rows[0];
        } else {
            // Create new user
            user = await createUserInTransaction(client, userData);
        }

        // Log marketing consent if given
        if (userData.marketing_consent) {
            await logMarketingConsent(client, user.id, true, 'registration');
        }

        await client.query('COMMIT');
        return user;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Create new user in database transaction
 */
async function createUserInTransaction(client, userData) {
    const insertQuery = `
        INSERT INTO users (
            id,
            cognito_user_id,
            email,
            first_name,
            last_name,
            user_type,
            email_verified,
            email_verified_at,
            marketing_consent,
            marketing_consent_date,
            intended_use,
            referral_source,
            trial_status,
            trial_reports_limit,
            created_at,
            updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, true, NOW(), $7, 
            CASE WHEN $7 THEN NOW() ELSE NULL END,
            $8, $9, 'active', 1, NOW(), NOW()
        ) RETURNING *
    `;

    const userId = uuidv4();
    const userType = userData.intended_use === 'business' ? 'professional' : 'individual';

    const result = await client.query(insertQuery, [
        userId,
        userData.cognito_user_id,
        userData.email,
        userData.first_name,
        userData.last_name,
        userType,
        userData.marketing_consent,
        userData.intended_use,
        userData.referral_source
    ]);

    return result.rows[0];
}

/**
 * Initialize trial for new user
 */
async function initializeTrial(userId, userData) {
    try {
        const trialQuery = `
            UPDATE users SET 
                trial_status = 'active',
                trial_started_at = NOW(),
                trial_expires_at = NOW() + INTERVAL '90 days',
                trial_reports_used = 0,
                trial_reports_limit = 1,
                updated_at = NOW()
            WHERE id = $1
        `;

        await dbPool.query(trialQuery, [userId]);

        // Log trial initialization event
        await logFunnelEvent(userId, 'trial_initialized', {
            trial_type: 'registration_based',
            trial_limit: 1,
            intended_use: userData.intended_use,
            marketing_consent: userData.marketing_consent
        });

        console.log('Trial initialized for user:', userId);

    } catch (error) {
        console.error('Trial initialization failed:', error);
        throw error;
    }
}

/**
 * Log marketing consent for GDPR compliance
 */
async function logMarketingConsent(client, userId, consentGiven, source, consentText = null) {
    const consentQuery = `
        INSERT INTO marketing_consent_history (
            id,
            user_id,
            consent_given,
            consent_type,
            consent_source,
            consent_text,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    await client.query(consentQuery, [
        uuidv4(),
        userId,
        consentGiven,
        'registration',
        source,
        consentText
    ]);
}

/**
 * Log funnel event for analytics
 */
async function logFunnelEvent(userId, eventType, eventData = {}) {
    try {
        const eventQuery = `
            INSERT INTO trial_funnel_events (
                id,
                user_id,
                event_type,
                event_step,
                event_data,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
        `;

        const eventStep = getEventStep(eventType);
        
        await dbPool.query(eventQuery, [
            uuidv4(),
            userId,
            eventType,
            eventStep,
            JSON.stringify(eventData)
        ]);

    } catch (error) {
        console.error('Failed to log funnel event:', error);
        // Don't throw - this shouldn't break the main flow
    }
}

/**
 * Get event step number for funnel analysis
 */
function getEventStep(eventType) {
    const steps = {
        'registration_started': 1,
        'email_verified': 2,
        'trial_initialized': 3,
        'first_search': 4,
        'trial_used': 5,
        'upgrade_viewed': 6,
        'converted': 7
    };
    
    return steps[eventType] || 0;
}

/**
 * Send welcome email (placeholder - integrate with SES/SendGrid)
 */
async function sendWelcomeEmail(userId, userData) {
    // TODO: Integrate with email service
    console.log('Sending welcome email to:', userData.email);
    
    // For now, just log the welcome email intent
    // In production, this would trigger SES/SendGrid email
    const emailData = {
        to: userData.email,
        template: 'trial_welcome',
        data: {
            first_name: userData.first_name,
            trial_reports_limit: 1,
            platform_url: process.env.FRONTEND_URL || 'https://seawater.io'
        }
    };

    console.log('Welcome email queued:', emailData);
}

/**
 * Get user by email
 */
async function getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 LIMIT 1';
    const result = await dbPool.query(query, [email]);
    return result.rows[0] || null;
}

/**
 * Create user directly (for API registrations)
 */
async function createUser(userData) {
    const client = await dbPool.connect();
    
    try {
        await client.query('BEGIN');
        const user = await createUserInTransaction(client, userData);
        await client.query('COMMIT');
        return user;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Mark email as verified
 */
async function markEmailVerified(email) {
    const query = `
        UPDATE users SET 
            email_verified = true,
            email_verified_at = NOW(),
            updated_at = NOW()
        WHERE email = $1
        RETURNING *
    `;
    
    const result = await dbPool.query(query, [email]);
    return result.rows[0] || null;
}

/**
 * Handle marketing consent updates
 */
async function handleMarketingConsentUpdate(event) {
    try {
        const body = JSON.parse(event.body);
        const { user_id, marketing_consent, consent_source = 'preference_update' } = body;

        if (!user_id || typeof marketing_consent !== 'boolean') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid request data' })
            };
        }

        const client = await dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Update user consent
            const updateQuery = `
                UPDATE users SET 
                    marketing_consent = $1,
                    marketing_consent_date = NOW(),
                    updated_at = NOW()
                WHERE id = $2
                RETURNING email, first_name
            `;
            
            const result = await client.query(updateQuery, [marketing_consent, user_id]);
            
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }

            // Log consent change
            await logMarketingConsent(client, user_id, marketing_consent, consent_source);

            await client.query('COMMIT');

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    marketing_consent,
                    message: marketing_consent 
                        ? 'Marketing consent granted' 
                        : 'Marketing consent withdrawn'
                })
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Marketing consent update failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Update failed' })
        };
    }
}

// Cleanup database connections on process termination
process.on('SIGTERM', async () => {
    await dbPool.end();
});

process.on('SIGINT', async () => {
    await dbPool.end();
});