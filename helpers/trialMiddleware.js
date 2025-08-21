/**
 * Trial Middleware for Seawater API Endpoints
 * Enforces trial limits and tracks usage across all protected endpoints
 */

const TrialManager = require('./trialManager');

/**
 * Trial validation middleware
 * @param {Object} options - Configuration options
 * @returns {Function} - Middleware function
 */
function createTrialMiddleware(options = {}) {
    const trialManager = new TrialManager();
    
    const config = {
        requireTrial: true,
        usageType: 'risk_assessment',
        trackUsage: true,
        allowPaidUsers: true,
        ...options
    };

    return async function trialMiddleware(event, context, next) {
        try {
            // Extract user context from authorizer (Tim-Combo pattern)
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

            // Skip trial validation for paid users if configured
            if (config.allowPaidUsers && userContext.subscription_tier !== 'trial') {
                console.log(`Skipping trial validation for paid user: ${emailAddress}`);
                return await next(event, context);
            }

            // Validate trial request
            const validation = await trialManager.validateTrialRequest(emailAddress, config.usageType);
            
            console.log(`Trial validation for user ${emailAddress}:`, validation);

            if (!validation.allowed) {
                // Return trial limit response with upgrade information
                return createTrialLimitResponse(validation, userContext);
            }

            // Proceed with the request
            const response = await next(event, context);

            // Track usage after successful request (if configured)
            if (config.trackUsage && response.statusCode >= 200 && response.statusCode < 300) {
                const usageData = extractUsageData(event, response, config.usageType);
                
                try {
                    const usageResult = await trialManager.recordTrialUsage(emailAddress, usageData);
                    console.log(`Trial usage recorded for user ${emailAddress}:`, usageResult);
                    
                    // Add trial usage information to response headers
                    if (!response.headers) response.headers = {};
                    response.headers['X-Trial-Reports-Used'] = String(usageResult.reports_used);
                    response.headers['X-Trial-Reports-Remaining'] = String(usageResult.reports_remaining);
                    response.headers['X-Trial-Status'] = usageResult.trial_status;
                    
                    // If trial limit reached, add upgrade prompt to response
                    if (usageResult.trial_limit_reached) {
                        const responseBody = JSON.parse(response.body || '{}');
                        responseBody.trial_limit_reached = true;
                        responseBody.upgrade_prompt = {
                            title: 'Free trial complete!',
                            message: 'You\'ve used your free climate risk assessment. Upgrade for unlimited access to detailed reports and premium data.',
                            cta_text: 'Upgrade Now',
                            benefits: [
                                'Unlimited property risk assessments',
                                'Premium data sources and projections',
                                'Historical trend analysis',
                                'Professional reporting tools'
                            ]
                        };
                        response.body = JSON.stringify(responseBody);
                    }
                    
                } catch (usageError) {
                    console.error('Failed to record trial usage:', usageError);
                    // Don't fail the main request for usage tracking errors
                }
            }

            return response;

        } catch (error) {
            console.error('Trial middleware error:', error);
            
            // Don't fail the request for middleware errors, but log them
            return await next(event, context);
        }
    };
}

/**
 * Create trial limit response with upgrade information
 */
function createTrialLimitResponse(validation, userContext) {
    const baseResponse = {
        statusCode: 403,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Trial-Status': validation.trial_status
        }
    };

    let response;

    switch (validation.error_code) {
        case 'TRIAL_LIMIT_REACHED':
            response = {
                ...baseResponse,
                body: JSON.stringify({
                    error: 'Trial limit reached',
                    error_code: 'TRIAL_LIMIT_REACHED',
                    message: 'You\'ve used your free climate risk assessment. Upgrade for unlimited access.',
                    trial_info: {
                        reports_used: validation.reports_used,
                        reports_limit: validation.reports_limit,
                        trial_started: validation.trial_started
                    },
                    upgrade_options: {
                        premium: {
                            price: '$19.99/month',
                            features: ['500 monthly assessments', 'Premium data sources', 'Future projections'],
                            cta: 'Start Premium Trial'
                        },
                        professional: {
                            price: '$99.99/month', 
                            features: ['Unlimited assessments', 'API access', 'Bulk analysis', 'Priority support'],
                            cta: 'Go Professional'
                        }
                    },
                    actions: {
                        upgrade_url: '/upgrade',
                        contact_sales: '/contact'
                    }
                })
            };
            break;

        case 'TRIAL_EXPIRED':
            response = {
                ...baseResponse,
                body: JSON.stringify({
                    error: 'Trial expired',
                    error_code: 'TRIAL_EXPIRED',
                    message: `Your trial expired ${validation.days_since_expiry} days ago. Upgrade to continue using Seawater.`,
                    trial_info: {
                        expired_at: validation.expired_at,
                        days_since_expiry: validation.days_since_expiry
                    },
                    special_offer: {
                        title: 'Welcome back! Special offer for returning users',
                        discount: '20% off first month',
                        code: 'WELCOME20',
                        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                    },
                    actions: {
                        upgrade_url: '/upgrade?promo=WELCOME20',
                        contact_sales: '/contact'
                    }
                })
            };
            break;

        case 'TRIAL_ALREADY_USED':
            response = {
                ...baseResponse,
                body: JSON.stringify({
                    error: 'Trial already used',
                    error_code: 'TRIAL_ALREADY_USED',
                    message: 'You\'ve already used your free trial. Upgrade for unlimited climate risk assessments.',
                    trial_info: {
                        reports_used: validation.reports_used,
                        reports_limit: validation.reports_limit,
                        trial_started: validation.trial_started
                    },
                    testimonial: {
                        text: "Seawater's climate data helped me make informed decisions about waterfront properties.",
                        author: "Sarah M., Real Estate Investor",
                        rating: 5
                    },
                    actions: {
                        upgrade_url: '/upgrade',
                        learn_more: '/features'
                    }
                })
            };
            break;

        default:
            response = {
                ...baseResponse,
                body: JSON.stringify({
                    error: validation.reason,
                    error_code: validation.error_code || 'TRIAL_ERROR',
                    message: 'Unable to process trial request. Please contact support.',
                    trial_status: validation.trial_status,
                    actions: {
                        contact_support: '/support',
                        upgrade_url: '/upgrade'
                    }
                })
            };
    }

    return response;
}

/**
 * Extract usage data from request and response
 */
function extractUsageData(event, response, usageType) {
    const usageData = {
        usage_type: usageType,
        ip_address: event.requestContext?.identity?.sourceIp,
        user_agent: event.requestContext?.identity?.userAgent || event.headers?.['User-Agent'],
        session_id: event.requestContext?.requestId
    };

    // Extract property-specific data for risk assessments
    if (usageType === 'risk_assessment') {
        try {
            // Try to extract from request body
            if (event.body) {
                const body = JSON.parse(event.body);
                if (body.address) {
                    usageData.property_address = body.address;
                    usageData.latitude = body.latitude;
                    usageData.longitude = body.longitude;
                }
            }

            // Try to extract from query parameters
            if (event.queryStringParameters) {
                const params = event.queryStringParameters;
                if (params.address) {
                    usageData.property_address = params.address;
                    usageData.latitude = parseFloat(params.lat);
                    usageData.longitude = parseFloat(params.lng);
                }
            }

            // Extract processing time from response headers
            if (response.headers && response.headers['X-Processing-Time']) {
                usageData.processing_time_ms = parseInt(response.headers['X-Processing-Time']);
            }

            // Extract data sources from response
            if (response.body) {
                const responseBody = JSON.parse(response.body);
                if (responseBody.data_sources) {
                    usageData.data_sources_used = responseBody.data_sources;
                }
                if (responseBody.api_cost_cents) {
                    usageData.api_cost_cents = responseBody.api_cost_cents;
                }
                if (responseBody.property_id) {
                    usageData.resource_id = responseBody.property_id;
                }
            }

        } catch (error) {
            console.warn('Failed to extract usage data:', error.message);
        }
    }

    return usageData;
}

/**
 * Trial enforcement decorator for Lambda functions
 * Usage: exports.handler = withTrialEnforcement(yourHandler, { usageType: 'risk_assessment' });
 */
function withTrialEnforcement(handler, options = {}) {
    const middleware = createTrialMiddleware(options);
    
    return async (event, context) => {
        return await middleware(event, context, handler);
    };
}

/**
 * Express-style middleware for trial validation only (no usage tracking)
 */
function validateTrialOnly(options = {}) {
    const trialManager = new TrialManager();
    
    return async function validateTrial(event, context, next) {
        const userContext = event.requestContext?.authorizer;
        
        if (!userContext || !userContext.email_address) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Authentication required' })
            };
        }

        // Skip for paid users
        if (userContext.subscription_tier !== 'trial') {
            return await next(event, context);
        }

        const validation = await trialManager.validateTrialRequest(
            userContext.email_address, 
            options.usageType || 'risk_assessment'
        );

        if (!validation.allowed) {
            return createTrialLimitResponse(validation, userContext);
        }

        return await next(event, context);
    };
}

/**
 * Check trial status without enforcement (for informational endpoints)
 * Now uses email address as identifier (Tim-Combo pattern)
 */
async function getTrialStatus(emailAddress) {
    const trialManager = new TrialManager();
    
    try {
        const validation = await trialManager.validateTrialRequest(emailAddress, 'status_check');
        const analytics = await trialManager.getTrialAnalytics(emailAddress);
        
        return {
            trial_status: validation.trial_status,
            allowed: validation.allowed,
            reports_used: validation.reports_used || 0,
            reports_limit: validation.reports_limit || 1,
            remaining_requests: validation.remaining_requests || 0,
            trial_started: validation.trial_started,
            trial_expires: validation.trial_expires,
            subscription_tier: validation.subscription_tier || 'trial',
            analytics: analytics
        };
    } catch (error) {
        console.error('Failed to get trial status:', error);
        return {
            trial_status: 'error',
            allowed: false,
            error: error.message
        };
    }
}

module.exports = {
    createTrialMiddleware,
    withTrialEnforcement,
    validateTrialOnly,
    getTrialStatus,
    TrialManager
};