import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Check, X, Star, Zap, TrendingUp, Users, Shield, Download } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  monthlyPrice: number;
  annualPrice: number;
  isPopular?: boolean;
  features: Array<{
    name: string;
    included: boolean;
    description?: string;
    highlight?: boolean;
  }>;
  cta: string;
  benefits: string[];
  limitations?: string[];
}

interface PricingComparisonProps {
  className?: string;
  onSelectPlan: (planId: string, billing: 'monthly' | 'annual') => void;
  onStartTrial?: (planId: string) => void;
  showAnnualDiscount?: boolean;
  earlyBirdDiscount?: number; // Percentage discount for early adopters
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for first-time home buyers',
    targetAudience: 'Individual Home Buyers',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      { name: '3 property assessments per month', included: true, highlight: true },
      { name: 'FEMA flood zone data', included: true },
      { name: 'Basic risk scores (1-10 scale)', included: true },
      { name: 'Educational climate resources', included: true },
      { name: 'State disclosure law guides', included: true },
      { name: 'Multi-source risk analysis', included: false },
      { name: '30-year climate projections', included: false },
      { name: 'Property comparison tools', included: false },
      { name: 'PDF report exports', included: false },
      { name: 'Professional support', included: false },
    ],
    cta: 'Start Free',
    benefits: [
      'Always free',
      'No credit card required',
      'Access to basic climate data',
      'Perfect for occasional searches'
    ],
    limitations: [
      'Limited to 3 assessments per month',
      'Basic FEMA data only',
      'No comparison features'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For serious home buyers and investors',
    targetAudience: 'Active Home Buyers',
    monthlyPrice: 19,
    annualPrice: 15, // 20% discount for annual
    isPopular: true,
    features: [
      { name: 'Unlimited property assessments', included: true, highlight: true },
      { name: 'Multi-source risk analysis', included: true, highlight: true, description: 'FEMA + First Street + ClimateCheck' },
      { name: '30-year climate projections', included: true, highlight: true },
      { name: 'Property comparison tools', included: true },
      { name: 'Interactive risk mapping', included: true },
      { name: 'Detailed insurance estimates', included: true },
      { name: 'PDF report exports', included: true },
      { name: 'Email support', included: true },
      { name: 'Mobile app access', included: true },
      { name: 'API access', included: false },
      { name: 'White-label reports', included: false },
      { name: 'Bulk property analysis', included: false },
    ],
    cta: 'Get Premium',
    benefits: [
      'Save $1,000s on your home purchase',
      'Most comprehensive risk data',
      'Perfect for comparing properties',
      '30-day money-back guarantee'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For real estate agents and professionals',
    targetAudience: 'Real Estate Professionals',
    monthlyPrice: 99,
    annualPrice: 79, // 20% discount for annual
    features: [
      { name: 'Everything in Premium', included: true, highlight: true },
      { name: 'Bulk property analysis (CSV upload)', included: true, highlight: true },
      { name: 'White-label branded reports', included: true, highlight: true },
      { name: 'Client management dashboard', included: true },
      { name: 'API access for integrations', included: true },
      { name: 'Professional directory listing', included: true },
      { name: 'Priority phone & email support', included: true },
      { name: 'Custom branding options', included: true },
      { name: 'Team collaboration tools', included: true },
      { name: 'Advanced analytics dashboard', included: true },
      { name: 'Continuing education credits', included: true },
      { name: 'Dedicated account manager', included: true },
    ],
    cta: 'Go Professional',
    benefits: [
      'Charge clients $50-200 per report',
      '200-400% ROI potential',
      'Competitive advantage in market',
      'Full business integration'
    ]
  }
];

export const PricingComparison: React.FC<PricingComparisonProps> = ({
  className,
  onSelectPlan,
  onStartTrial,
  showAnnualDiscount = true,
  earlyBirdDiscount = 50,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const processedTiers = useMemo(() => {
    return PRICING_TIERS.map(tier => ({
      ...tier,
      displayPrice: billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice,
      savings: billingCycle === 'annual' && tier.monthlyPrice > 0
        ? Math.round(((tier.monthlyPrice - tier.annualPrice) / tier.monthlyPrice) * 100)
        : 0
    }));
  }, [billingCycle]);

  const handleSelectPlan = (planId: string) => {
    setSelectedTier(planId);
    onSelectPlan(planId, billingCycle);
  };

  const handleStartTrial = (planId: string) => {
    if (onStartTrial) {
      onStartTrial(planId);
    }
  };

  const getFeatureIcon = (included: boolean) => {
    return included ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-gray-400" />
    );
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter':
        return <Shield className="h-6 w-6 text-blue-600" />;
      case 'premium':
        return <Star className="h-6 w-6 text-amber-500" />;
      case 'professional':
        return <TrendingUp className="h-6 w-6 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div className={clsx('py-12', className)}>
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Climate Risk Intelligence Plan
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Start free, upgrade when you need professional features
        </p>
        
        {/* Early Bird Banner */}
        {earlyBirdDiscount > 0 && (
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full mb-6">
            <Zap className="h-4 w-4" />
            <span className="font-semibold">
              Early Bird Special: {earlyBirdDiscount}% off first year!
            </span>
          </div>
        )}

        {/* Billing Toggle */}
        {showAnnualDiscount && (
          <div className="flex items-center justify-center gap-4">
            <span className={clsx(
              'font-medium',
              billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'
            )}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className={clsx(
                'relative w-16 h-8 rounded-full transition-colors duration-200',
                billingCycle === 'annual' ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <div className={clsx(
                'absolute w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 top-1',
                billingCycle === 'annual' ? 'translate-x-9' : 'translate-x-1'
              )} />
            </button>
            <span className={clsx(
              'font-medium flex items-center gap-2',
              billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'
            )}>
              Annual
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold">
                Save 20%
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {processedTiers.map((tier) => (
          <div
            key={tier.id}
            className={clsx(
              'relative bg-white border-2 rounded-2xl p-8 shadow-lg transition-all duration-300',
              tier.isPopular
                ? 'border-blue-500 scale-105 shadow-xl'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-xl',
              selectedTier === tier.id && 'ring-2 ring-blue-500'
            )}
          >
            {/* Popular Badge */}
            {tier.isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-full shadow-lg">
                  <span className="font-semibold text-sm">Most Popular</span>
                </div>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                {getPlanIcon(tier.id)}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
              <p className="text-gray-600 mb-2">{tier.description}</p>
              <p className="text-sm text-gray-500">{tier.targetAudience}</p>
            </div>

            {/* Pricing */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-bold text-gray-900">
                  ${tier.displayPrice}
                </span>
                {tier.monthlyPrice > 0 && (
                  <span className="text-gray-500 ml-2">/month</span>
                )}
              </div>
              
              {tier.monthlyPrice === 0 ? (
                <p className="text-green-600 font-semibold mt-2">Always free</p>
              ) : (
                <>
                  {billingCycle === 'annual' && tier.savings > 0 && (
                    <p className="text-green-600 font-semibold mt-2">
                      Save {tier.savings}% with annual billing
                    </p>
                  )}
                  {earlyBirdDiscount > 0 && tier.monthlyPrice > 0 && (
                    <p className="text-amber-600 font-semibold mt-1">
                      Early bird: ${Math.round(tier.displayPrice * (1 - earlyBirdDiscount / 100))}/month first year
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Features */}
            <div className="mb-8">
              <h4 className="font-semibold text-gray-900 mb-4">Features included:</h4>
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {getFeatureIcon(feature.included)}
                    <div className="flex-1">
                      <span className={clsx(
                        'text-sm',
                        feature.included 
                          ? feature.highlight 
                            ? 'text-gray-900 font-semibold'
                            : 'text-gray-700'
                          : 'text-gray-400'
                      )}>
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits */}
            {tier.benefits.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Key Benefits:</h4>
                <ul className="space-y-2">
                  {tier.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm text-green-700 flex items-center gap-2">
                      <Check className="h-4 w-4 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleSelectPlan(tier.id)}
                className={clsx(
                  'w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200',
                  tier.isPopular
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                )}
              >
                {tier.cta}
              </button>
              
              {tier.id !== 'starter' && onStartTrial && (
                <button
                  onClick={() => handleStartTrial(tier.id)}
                  className="w-full py-2 px-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Start Free Trial
                </button>
              )}
            </div>

            {/* Guarantee */}
            {tier.monthlyPrice > 0 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                30-day money-back guarantee
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Additional Information */}
      <div className="mt-16 text-center">
        <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Why Choose Seawater Climate Risk Intelligence?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Trusted by 10,000+</h4>
              <p className="text-sm text-gray-600">
                Home buyers and professionals rely on our platform
              </p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Data You Can Trust</h4>
              <p className="text-sm text-gray-600">
                Multiple authoritative sources including FEMA and First Street
              </p>
            </div>
            <div className="text-center">
              <Download className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Professional Reports</h4>
              <p className="text-sm text-gray-600">
                Export detailed reports for insurance and documentation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently Asked Questions
        </h3>
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-2">
              Can I change my plan later?
            </h4>
            <p className="text-gray-600">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
              and we'll prorate any billing differences.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-2">
              How accurate is your climate risk data?
            </h4>
            <p className="text-gray-600">
              We aggregate data from multiple authoritative sources including FEMA, First Street Foundation, 
              and ClimateCheck to provide the most comprehensive risk assessment available.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-2">
              Is there a free trial for paid plans?
            </h4>
            <p className="text-gray-600">
              Yes! All paid plans come with a 14-day free trial. No credit card required to start, 
              and you can cancel anytime during the trial period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingComparison;