import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialStatus?: {
    trial_status: string;
    reports_used: number;
    reports_limit: number;
    remaining_requests: number;
  };
  trigger?: 'limit_reached' | 'expired' | 'feature_request' | 'manual';
  feature?: string;
}

interface PricingTier {
  id: string;
  name: string;
  displayName: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  popular?: boolean;
  features: string[];
  cta: string;
  savings?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  trialStatus,
  trigger = 'manual',
  feature
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('premium');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Track upgrade modal view
      trackEvent('upgrade_modal_viewed', {
        trigger,
        feature,
        trial_status: trialStatus?.trial_status,
        reports_used: trialStatus?.reports_used
      });
    }
  }, [isOpen, trigger, feature, trialStatus]);

  const pricingTiers: PricingTier[] = [
    {
      id: 'premium',
      name: 'premium',
      displayName: 'Premium',
      price: billingCycle === 'monthly' ? 19.99 : 199.99,
      billingCycle,
      popular: true,
      features: [
        '500 monthly property assessments',
        'Premium data sources (First Street, Climate Check)',
        'Future climate projections',
        'Historical trend analysis',
        'PDF report generation',
        'Email support'
      ],
      cta: 'Start Premium',
      savings: billingCycle === 'annual' ? 'Save 17%' : undefined
    },
    {
      id: 'professional',
      name: 'professional',
      displayName: 'Professional',
      price: billingCycle === 'monthly' ? 99.99 : 999.99,
      billingCycle,
      features: [
        'Unlimited property assessments',
        'All premium data sources',
        'API access (10,000 calls/month)',
        'Bulk property analysis',
        'White-label reports',
        'Priority support',
        'Custom integrations'
      ],
      cta: 'Go Professional',
      savings: billingCycle === 'annual' ? 'Save 17%' : undefined
    },
    {
      id: 'enterprise',
      name: 'enterprise',
      displayName: 'Enterprise',
      price: 0, // Custom pricing
      billingCycle,
      features: [
        'Everything in Professional',
        'Unlimited API calls',
        'Custom data sources',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise deployment options',
        'Custom training'
      ],
      cta: 'Contact Sales'
    }
  ];

  const getModalTitle = () => {
    switch (trigger) {
      case 'limit_reached':
        return 'Your Free Trial is Complete!';
      case 'expired':
        return 'Welcome Back to Seawater';
      case 'feature_request':
        return `Unlock ${feature || 'Premium Features'}`;
      default:
        return 'Upgrade Your Seawater Account';
    }
  };

  const getModalSubtitle = () => {
    switch (trigger) {
      case 'limit_reached':
        return `You've used ${trialStatus?.reports_used || 1} of ${trialStatus?.reports_limit || 1} free reports. Upgrade for unlimited access to comprehensive climate risk analysis.`;
      case 'expired':
        return 'Your trial has expired, but we have a special offer to welcome you back!';
      case 'feature_request':
        return `${feature} is available with a Premium or Professional subscription.`;
      default:
        return 'Choose the plan that fits your climate risk assessment needs.';
    }
  };

  const handleUpgrade = async (tier: PricingTier) => {
    setIsLoading(true);
    
    try {
      // Track conversion intent
      trackEvent('upgrade_selected', {
        tier: tier.name,
        billing_cycle: tier.billingCycle,
        price: tier.price,
        trigger,
        feature
      });

      if (tier.name === 'enterprise') {
        // Redirect to contact sales
        window.open('/contact-sales', '_blank');
        return;
      }

      // Create checkout session
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('seawater_token')}`
        },
        body: JSON.stringify({
          tier: tier.name,
          billing_cycle: tier.billingCycle,
          conversion_trigger: trigger,
          feature_requested: feature
        })
      });

      const data = await response.json();

      if (data.success && data.checkout_url) {
        // Track checkout initiated
        trackEvent('checkout_initiated', {
          tier: tier.name,
          billing_cycle: tier.billingCycle,
          checkout_session_id: data.session_id
        });

        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }

    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Upgrade failed. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const trackEvent = (eventType: string, eventData: any) => {
    // Track conversion funnel events
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('seawater_token')}`
      },
      body: JSON.stringify({
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.warn('Tracking failed:', err));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {getModalTitle()}
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  {getModalSubtitle()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Special Offer Banner */}
          {trigger === 'expired' && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">🎉</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Welcome Back Special: 20% off your first month!
                  </p>
                  <p className="text-xs text-yellow-600">
                    Use code WELCOME20 • Expires in 7 days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-700 mr-3">Monthly</span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingCycle === 'annual' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700 ml-3">
                Annual 
                <span className="text-green-600 font-medium ml-1">(Save 17%)</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative border rounded-lg p-6 cursor-pointer transition-all ${
                    tier.popular 
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  } ${selectedTier === tier.name ? 'bg-blue-50' : 'bg-white'}`}
                  onClick={() => setSelectedTier(tier.name)}
                >
                  {/* Popular Badge */}
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Savings Badge */}
                  {tier.savings && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {tier.savings}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {tier.displayName}
                    </h4>
                    {tier.price > 0 ? (
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">
                          ${tier.price}
                        </span>
                        <span className="text-gray-500">
                          /{tier.billingCycle === 'annual' ? 'year' : 'month'}
                        </span>
                        {tier.billingCycle === 'annual' && (
                          <div className="text-sm text-gray-500">
                            ${(tier.price / 12).toFixed(2)}/month billed annually
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <span className="text-2xl font-bold text-gray-900">
                          Custom Pricing
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                      tier.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {isLoading ? 'Processing...' : tier.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Signals */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Secure Billing
              </div>
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                30-Day Guarantee
              </div>
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Cancel Anytime
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-white border-t flex justify-between items-center text-sm text-gray-500">
            <div>
              Questions? <Link to="/contact" className="text-blue-600 hover:text-blue-500">Contact our sales team</Link>
            </div>
            <div>
              <Link to="/pricing" className="text-blue-600 hover:text-blue-500">
                View detailed pricing →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;