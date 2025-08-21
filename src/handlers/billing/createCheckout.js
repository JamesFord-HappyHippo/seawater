/**
 * Create Stripe Checkout Session Handler
 * Handles subscription upgrades with conversion tracking
 */

const { lambdaWrapper } = require('../../helpers/lambdaWrapper');
const { TrialManager } = require('../../helpers/trialMiddleware');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Database connection
const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

/**
 * Create Stripe checkout session for subscription upgrade
 */
async function createCheckoutHandler(event, context) {
    try {
        // Extract user context from JWT
        const userContext = event.requestContext?.authorizer;
        if (!userContext || !userContext.user_id) {
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

        const userId = userContext.user_id;
        const body = JSON.parse(event.body);
        const { 
            tier, 
            billing_cycle = 'monthly', 
            conversion_trigger = 'manual',
            feature_requested,
            promo_code 
        } = body;

        console.log('Creating checkout session:', {
            userId,
            tier,
            billing_cycle,
            conversion_trigger,
            feature_requested
        });

        // Validate tier
        const validTiers = ['premium', 'professional', 'enterprise'];
        if (!validTiers.includes(tier)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid subscription tier',
                    valid_tiers: validTiers
                })
            };
        }

        // Get user data
        const userQuery = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.trial_status,
                u.trial_reports_used,
                u.trial_started_at,
                u.created_at,
                us.stripe_customer_id
            FROM users u
            LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
            WHERE u.id = $1
            LIMIT 1
        `;

        const userResult = await dbPool.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        const userData = userResult.rows[0];

        // Get subscription tier configuration
        const tierQuery = `
            SELECT 
                tier_name,
                tier_display_name,
                monthly_price_cents,
                annual_price_cents
            FROM subscription_tiers
            WHERE tier_name = $1 AND is_active = true
            LIMIT 1
        `;

        const tierResult = await dbPool.query(tierQuery, [tier]);
        
        if (tierResult.rows.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid or inactive subscription tier' })
            };
        }

        const tierData = tierResult.rows[0];
        const priceInCents = billing_cycle === 'annual' 
            ? tierData.annual_price_cents 
            : tierData.monthly_price_cents;

        // Create or get Stripe customer
        let customerId = userData.stripe_customer_id;
        
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userData.email,
                name: `${userData.first_name} ${userData.last_name}`.trim(),
                metadata: {
                    user_id: userId,
                    trial_status: userData.trial_status,
                    conversion_trigger,
                    feature_requested: feature_requested || ''
                }
            });
            
            customerId = customer.id;

            // Update user with Stripe customer ID
            await dbPool.query(
                'UPDATE users SET updated_at = NOW() WHERE id = $1',
                [userId]
            );
        }

        // Create Stripe Price object (if not exists)
        const priceId = await getOrCreateStripePrice(tier, billing_cycle, priceInCents, tierData.tier_display_name);

        // Calculate trial conversion metrics
        const trialDurationHours = userData.trial_started_at 
            ? Math.floor((new Date() - new Date(userData.trial_started_at)) / (1000 * 60 * 60))
            : 0;
        
        const daysSinceRegistration = Math.floor(
            (new Date() - new Date(userData.created_at)) / (1000 * 60 * 60 * 24)
        );

        // Create checkout session
        const sessionConfig = {
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/upgrade?cancelled=true`,
            metadata: {
                user_id: userId,
                tier,
                billing_cycle,
                conversion_trigger,
                feature_requested: feature_requested || '',
                trial_reports_used: userData.trial_reports_used || '0',
                trial_duration_hours: trialDurationHours.toString(),
                days_since_registration: daysSinceRegistration.toString()
            },
            subscription_data: {
                metadata: {
                    user_id: userId,
                    tier,
                    conversion_trigger,
                    feature_requested: feature_requested || ''
                }
            },
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            tax_id_collection: {
                enabled: true
            }
        };

        // Apply promo code if provided
        if (promo_code) {
            try {
                const promoCodes = await stripe.promotionCodes.list({
                    code: promo_code,
                    active: true,
                    limit: 1
                });
                
                if (promoCodes.data.length > 0) {
                    sessionConfig.discounts = [{
                        promotion_code: promoCodes.data[0].id
                    }];
                }
            } catch (promoError) {
                console.warn('Invalid promo code:', promo_code, promoError.message);
            }
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        // Track conversion funnel event
        const trialManager = new TrialManager();
        
        try {
            // Log checkout initiated event
            await logFunnelEvent(userId, 'checkout_initiated', {
                tier,
                billing_cycle,
                price_cents: priceInCents,
                conversion_trigger,
                feature_requested,
                checkout_session_id: session.id,
                trial_reports_used: userData.trial_reports_used,
                trial_duration_hours: trialDurationHours,
                days_since_registration: daysSinceRegistration
            });
        } catch (trackingError) {
            console.error('Failed to track checkout event:', trackingError);
            // Don't fail the checkout for tracking errors
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                checkout_url: session.url,
                session_id: session.id,
                tier,
                billing_cycle,
                price_cents: priceInCents,
                customer_id: customerId
            })
        };

    } catch (error) {
        console.error('Checkout creation failed:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to create checkout session',
                error_code: 'CHECKOUT_ERROR',
                details: error.message
            })
        };
    }
}

/**
 * Get or create Stripe Price object
 */
async function getOrCreateStripePrice(tier, billingCycle, priceInCents, displayName) {
    const priceId = `seawater-${tier}-${billingCycle}`;
    
    try {
        // Try to retrieve existing price
        const price = await stripe.prices.retrieve(priceId);
        return price.id;
    } catch (error) {
        if (error.code === 'resource_missing') {
            // Create new price
            const price = await stripe.prices.create({
                id: priceId,
                unit_amount: priceInCents,
                currency: 'usd',
                recurring: {
                    interval: billingCycle === 'annual' ? 'year' : 'month'
                },
                product_data: {
                    name: `Seawater ${displayName}`,
                    description: `Seawater Climate Risk Platform - ${displayName} subscription`,
                    metadata: {
                        tier,
                        billing_cycle: billingCycle
                    }
                },
                metadata: {
                    tier,
                    billing_cycle: billingCycle,
                    platform: 'seawater'
                }
            });
            
            return price.id;
        }
        throw error;
    }
}

/**
 * Log funnel event for analytics
 */
async function logFunnelEvent(userId, eventType, eventData) {
    const { v4: uuidv4 } = require('uuid');
    
    const eventSteps = {
        'upgrade_viewed': 6,
        'checkout_initiated': 7,
        'payment_completed': 8,
        'converted': 9
    };

    const query = `
        INSERT INTO trial_funnel_events (
            id,
            user_id,
            event_type,
            event_step,
            event_data,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await dbPool.query(query, [
        uuidv4(),
        userId,
        eventType,
        eventSteps[eventType] || 0,
        JSON.stringify(eventData)
    ]);
}

module.exports = {
    handler: lambdaWrapper(createCheckoutHandler)
};