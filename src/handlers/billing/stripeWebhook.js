/**
 * Stripe Webhook Handler
 * Processes subscription events and completes trial conversions
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
 * Handle Stripe webhook events
 */
async function stripeWebhookHandler(event, context) {
    try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const signature = event.headers['stripe-signature'];
        const body = event.body;

        // Verify webhook signature
        let stripeEvent;
        try {
            stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid signature' })
            };
        }

        console.log('Processing Stripe webhook:', {
            type: stripeEvent.type,
            id: stripeEvent.id,
            object: stripeEvent.data.object.object
        });

        // Route webhook events
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                return await handleCheckoutCompleted(stripeEvent.data.object);
                
            case 'customer.subscription.created':
                return await handleSubscriptionCreated(stripeEvent.data.object);
                
            case 'customer.subscription.updated':
                return await handleSubscriptionUpdated(stripeEvent.data.object);
                
            case 'customer.subscription.deleted':
                return await handleSubscriptionDeleted(stripeEvent.data.object);
                
            case 'invoice.payment_succeeded':
                return await handlePaymentSucceeded(stripeEvent.data.object);
                
            case 'invoice.payment_failed':
                return await handlePaymentFailed(stripeEvent.data.object);
                
            default:
                console.log('Unhandled webhook event type:', stripeEvent.type);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ received: true })
                };
        }

    } catch (error) {
        console.error('Webhook processing error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook processing failed' })
        };
    }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(session) {
    try {
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier;
        const billingCycle = session.metadata?.billing_cycle;
        const conversionTrigger = session.metadata?.conversion_trigger;
        const featureRequested = session.metadata?.feature_requested;

        if (!userId || !tier) {
            console.error('Missing required metadata in checkout session:', session.id);
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing metadata' }) };
        }

        console.log('Processing successful checkout:', {
            sessionId: session.id,
            userId,
            tier,
            customerId: session.customer
        });

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        const client = await dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Update user with Stripe customer ID
            await client.query(`
                UPDATE users SET 
                    updated_at = NOW()
                WHERE id = $1
            `, [userId]);

            // Get subscription tier configuration
            const tierQuery = `
                SELECT id, tier_name, monthly_price_cents, annual_price_cents
                FROM subscription_tiers
                WHERE tier_name = $1
                LIMIT 1
            `;
            
            const tierResult = await client.query(tierQuery, [tier]);
            
            if (tierResult.rows.length === 0) {
                throw new Error(`Subscription tier not found: ${tier}`);
            }

            const tierData = tierResult.rows[0];

            // Create user subscription record
            const { v4: uuidv4 } = require('uuid');
            const subscriptionId = uuidv4();
            
            const insertSubscriptionQuery = `
                INSERT INTO user_subscriptions (
                    id,
                    user_id,
                    tier_id,
                    status,
                    billing_cycle,
                    current_period_start,
                    current_period_end,
                    stripe_subscription_id,
                    stripe_customer_id,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    tier_id = EXCLUDED.tier_id,
                    status = EXCLUDED.status,
                    billing_cycle = EXCLUDED.billing_cycle,
                    current_period_start = EXCLUDED.current_period_start,
                    current_period_end = EXCLUDED.current_period_end,
                    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                    stripe_customer_id = EXCLUDED.stripe_customer_id,
                    updated_at = NOW()
            `;

            await client.query(insertSubscriptionQuery, [
                subscriptionId,
                userId,
                tierData.id,
                subscription.status,
                billingCycle,
                new Date(subscription.current_period_start * 1000),
                new Date(subscription.current_period_end * 1000),
                subscription.id,
                session.customer
            ]);

            // Convert trial to paid subscription
            const trialManager = new TrialManager();
            
            const conversionData = {
                conversion_type: 'subscription',
                subscription_tier: tier,
                conversion_value_cents: billingCycle === 'annual' 
                    ? tierData.annual_price_cents 
                    : tierData.monthly_price_cents,
                trial_reports_used: parseInt(session.metadata?.trial_reports_used) || 0,
                trial_duration_hours: parseInt(session.metadata?.trial_duration_hours) || 0,
                days_since_registration: parseInt(session.metadata?.days_since_registration) || 0,
                conversion_trigger: conversionTrigger,
                stripe_customer_id: session.customer,
                stripe_subscription_id: subscription.id
            };

            await trialManager.convertTrial(userId, conversionData);

            // Log successful conversion
            await logFunnelEvent(client, userId, 'payment_completed', {
                tier,
                billing_cycle: billingCycle,
                stripe_session_id: session.id,
                stripe_subscription_id: subscription.id,
                conversion_trigger: conversionTrigger,
                feature_requested: featureRequested,
                amount_paid: session.amount_total
            });

            await logFunnelEvent(client, userId, 'converted', {
                tier,
                conversion_type: 'subscription',
                conversion_value_cents: conversionData.conversion_value_cents,
                trial_reports_used: conversionData.trial_reports_used,
                trial_duration_hours: conversionData.trial_duration_hours,
                days_since_registration: conversionData.days_since_registration
            });

            await client.query('COMMIT');

            // Send welcome email for new subscriber
            await sendWelcomeEmail(userId, tier, session.customer_details?.email);

            console.log('Checkout completed successfully:', {
                userId,
                tier,
                subscriptionId: subscription.id
            });

            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    received: true,
                    processed: true,
                    user_id: userId,
                    tier
                })
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Checkout completion failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Processing failed' })
        };
    }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);
    
    // Update subscription status if needed
    const userId = subscription.metadata?.user_id;
    
    if (userId) {
        await dbPool.query(`
            UPDATE user_subscriptions SET 
                status = $1,
                updated_at = NOW()
            WHERE stripe_subscription_id = $2
        `, [subscription.status, subscription.id]);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);
    
    // Update subscription details
    await dbPool.query(`
        UPDATE user_subscriptions SET 
            status = $1,
            current_period_start = $2,
            current_period_end = $3,
            updated_at = NOW()
        WHERE stripe_subscription_id = $4
    `, [
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.id
    ]);

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);
    
    // Update subscription status to canceled
    await dbPool.query(`
        UPDATE user_subscriptions SET 
            status = 'canceled',
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE stripe_subscription_id = $1
    `, [subscription.id]);

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
    console.log('Payment succeeded:', invoice.id);
    
    // Reset usage counters for new billing period
    if (invoice.subscription) {
        await dbPool.query(`
            UPDATE user_subscriptions SET 
                searches_used_this_period = 0,
                api_calls_used_this_period = 0,
                last_usage_reset = NOW(),
                updated_at = NOW()
            WHERE stripe_subscription_id = $1
        `, [invoice.subscription]);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
    console.error('Payment failed:', invoice.id);
    
    // TODO: Implement dunning management
    // - Send payment failure notification
    // - Update subscription status if needed
    // - Implement retry logic

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
}

/**
 * Log funnel event for analytics
 */
async function logFunnelEvent(client, userId, eventType, eventData) {
    const { v4: uuidv4 } = require('uuid');
    
    const eventSteps = {
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

    await client.query(query, [
        uuidv4(),
        userId,
        eventType,
        eventSteps[eventType] || 0,
        JSON.stringify(eventData)
    ]);
}

/**
 * Send welcome email to new subscriber
 */
async function sendWelcomeEmail(userId, tier, email) {
    try {
        // TODO: Integrate with email service (SES/SendGrid)
        console.log('Sending welcome email:', { userId, tier, email });
        
        // For now, just log the email intent
        // In production, this would trigger a welcome email campaign
        const emailData = {
            to: email,
            template: 'subscription_welcome',
            data: {
                tier,
                dashboard_url: `${process.env.FRONTEND_URL}/dashboard`,
                support_url: `${process.env.FRONTEND_URL}/support`
            }
        };

        console.log('Welcome email queued:', emailData);
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't fail the webhook for email errors
    }
}

module.exports = {
    handler: lambdaWrapper(stripeWebhookHandler)
};