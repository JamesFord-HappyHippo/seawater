import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  Lock, 
  Star, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Zap, 
  Gift,
  X,
  CreditCard,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionTier } from '../../api/seawaterApiClient';

interface PaywallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: (planId: SubscriptionTier) => void;
  onStartTrial?: () => void;
  trigger: 'assessment_limit' | 'premium_feature' | 'report_export' | 'comparison_tool';
  userUsage?: {
    assessmentsUsed: number;
    assessmentsLimit: number;
    daysUntilReset: number;
  };
  className?: string;
}

interface UpgradeFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}

interface PaywallContent {
  title: string;
  subtitle: string;
  urgency?: string;
  features: UpgradeFeature[];
  primaryCTA: string;
  secondaryCTA?: string;
}

export const PaywallPrompt: React.FC<PaywallPromptProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  onStartTrial,
  trigger,
  userUsage,
  className,
}) => {
  const { upgradeSubscription, isAuthenticated, usageInfo } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('premium');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Update countdown timer for limited-time offers
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight
      
      const timeDiff = midnight.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    if (isOpen) {
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Use actual usage info from context if available
  const effectiveUsage = userUsage || usageInfo || {
    assessmentsUsed: 0,
    assessmentsLimit: 3,
    daysUntilReset: 30
  };

  const getPaywallContent = (): PaywallContent => {
    switch (trigger) {
      case 'assessment_limit':
        return {
          title: 'You\'ve reached your monthly limit',
          subtitle: `You've used all ${effectiveUsage.assessmentsLimit} free assessments this month. Upgrade for unlimited access.`,
          urgency: effectiveUsage.daysUntilReset ? `Resets in ${effectiveUsage.daysUntilReset} days` : undefined,
          features: [
            {
              icon: <Zap className="h-5 w-5 text-yellow-500" />,
              title: 'Unlimited Assessments',
              description: 'Analyze as many properties as you need',
              highlight: true
            },
            {
              icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
              title: 'Multi-Source Risk Data',
              description: 'FEMA + First Street + ClimateCheck combined',
              highlight: true
            },
            {
              icon: <Star className="h-5 w-5 text-purple-500" />,
              title: '30-Year Projections',
              description: 'See how risks change over time'
            },
            {
              icon: <CheckCircle className="h-5 w-5 text-green-500" />,
              title: 'Property Comparisons',
              description: 'Compare multiple properties side-by-side'
            }
          ],
          primaryCTA: 'Upgrade to Premium',
          secondaryCTA: 'Start Free Trial'
        };

      case 'premium_feature':
        return {
          title: 'Unlock Premium Climate Intelligence',
          subtitle: 'Get the complete picture with multi-source risk analysis and 30-year projections.',
          features: [
            {
              icon: <Shield className="h-5 w-5 text-green-500" />,
              title: 'Comprehensive Risk Analysis',
              description: 'Data from 3+ authoritative sources',
              highlight: true
            },
            {
              icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
              title: 'Future Risk Projections',
              description: 'See 30-year climate change impacts',
              highlight: true
            },
            {
              icon: <CreditCard className="h-5 w-5 text-purple-500" />,
              title: 'Insurance Cost Estimates',
              description: 'Accurate premium calculations'
            },
            {
              icon: <CheckCircle className="h-5 w-5 text-green-500" />,
              title: 'PDF Report Exports',
              description: 'Professional reports for documentation'
            }
          ],
          primaryCTA: 'Get Premium Access',
          secondaryCTA: 'Start Free Trial'
        };

      case 'report_export':
        return {
          title: 'Export Professional Reports',
          subtitle: 'Generate PDF reports perfect for insurance, documentation, and sharing with professionals.',
          features: [
            {
              icon: <Gift className="h-5 w-5 text-red-500" />,
              title: 'Professional PDF Reports',
              description: 'Branded reports with detailed analysis',
              highlight: true
            },
            {
              icon: <Shield className="h-5 w-5 text-green-500" />,
              title: 'Insurance Documentation',
              description: 'Reports accepted by insurance companies'
            },
            {
              icon: <Star className="h-5 w-5 text-yellow-500" />,
              title: 'White-label Option',
              description: 'Add your branding (Professional plan)'
            },
            {
              icon: <CheckCircle className="h-5 w-5 text-green-500" />,
              title: 'Unlimited Exports',
              description: 'Export as many reports as you need'
            }
          ],
          primaryCTA: 'Unlock Report Exports',
          secondaryCTA: 'Start Free Trial'
        };

      case 'comparison_tool':
        return {
          title: 'Compare Properties Like a Pro',
          subtitle: 'Make informed decisions by comparing climate risks across multiple properties.',
          features: [
            {
              icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
              title: 'Side-by-Side Comparison',
              description: 'Compare up to 10 properties at once',
              highlight: true
            },
            {
              icon: <Zap className="h-5 w-5 text-yellow-500" />,
              title: 'Risk Score Rankings',
              description: 'Automatically rank properties by risk',
              highlight: true
            },
            {
              icon: <Star className="h-5 w-5 text-purple-500" />,
              title: 'Advanced Filters',
              description: 'Filter by risk type, insurance cost, etc.'
            },
            {
              icon: <CheckCircle className="h-5 w-5 text-green-500" />,
              title: 'Save Comparisons',
              description: 'Save and share your analysis'
            }
          ],
          primaryCTA: 'Access Comparison Tools',
          secondaryCTA: 'Start Free Trial'
        };

      default:
        return {
          title: 'Upgrade for Premium Features',
          subtitle: 'Get access to advanced climate risk intelligence.',
          features: [],
          primaryCTA: 'Upgrade Now'
        };
    }
  };

  const content = getPaywallContent();

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      if (onUpgrade) {
        onUpgrade(selectedPlan);
      } else {
        // Use the auth context upgrade function
        const result = await upgradeSubscription(selectedPlan);
        if (result.success) {
          onClose();
        } else {
          console.error('Upgrade failed:', result.error);
          // TODO: Show error message to user
        }
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleStartTrial = () => {
    if (onStartTrial) {
      onStartTrial();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={clsx(
        'bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto',
        className
      )}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{content.title}</h2>
              <p className="text-blue-100 mt-1">{content.subtitle}</p>
            </div>
          </div>

          {/* Urgency Timer */}
          {content.urgency && (
            <div className="bg-white bg-opacity-20 rounded-lg p-3 mt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">{content.urgency}</span>
              </div>
            </div>
          )}

          {/* Limited Time Offer */}
          <div className="bg-yellow-400 text-yellow-900 rounded-lg p-3 mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4" />
              <span className="font-semibold">Limited Time: 50% Off First Year!</span>
            </div>
            <p className="text-sm">Offer expires in {timeLeft}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Plan Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Choose Your Plan:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPlan('premium')}
                className={clsx(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  selectedPlan === 'premium'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">Premium</h4>
                  <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-gray-900">$9.50</span>
                  <span className="text-gray-500">/month</span>
                  <span className="text-xs text-green-600 font-medium">(50% off)</span>
                </div>
                <p className="text-sm text-gray-600">Perfect for home buyers and investors</p>
              </button>

              <button
                onClick={() => setSelectedPlan('professional')}
                className={clsx(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  selectedPlan === 'professional'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">Professional</h4>
                  <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                    Best Value
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-gray-900">$49.50</span>
                  <span className="text-gray-500">/month</span>
                  <span className="text-xs text-green-600 font-medium">(50% off)</span>
                </div>
                <p className="text-sm text-gray-600">For agents and professionals</p>
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">What You'll Get:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.features.map((feature, index) => (
                <div key={index} className={clsx(
                  'flex items-start gap-3 p-3 rounded-lg',
                  feature.highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                )}>
                  <div className="flex-shrink-0 mt-0.5">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className={clsx(
                      'font-medium mb-1',
                      feature.highlight ? 'text-blue-900' : 'text-gray-900'
                    )}>
                      {feature.title}
                    </h4>
                    <p className={clsx(
                      'text-sm',
                      feature.highlight ? 'text-blue-700' : 'text-gray-600'
                    )}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Proof */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="font-semibold text-gray-900">4.9/5 from 1,200+ users</span>
            </div>
            <p className="text-sm text-gray-600">
              "Saved me from buying a flood-prone property. The detailed analysis was exactly what I needed."
              <span className="font-medium"> - Sarah M., Home Buyer</span>
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className={clsx(
                'w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg',
                isUpgrading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
              )}
            >
              {isUpgrading ? 'Processing...' : `${content.primaryCTA} - 50% Off First Year`}
            </button>
            
            {content.secondaryCTA && onStartTrial && (
              <button
                onClick={handleStartTrial}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                {content.secondaryCTA} (14 Days Free)
              </button>
            )}
          </div>

          {/* Guarantee */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              <Shield className="h-4 w-4 inline mr-1" />
              30-day money-back guarantee • Cancel anytime • No hidden fees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallPrompt;