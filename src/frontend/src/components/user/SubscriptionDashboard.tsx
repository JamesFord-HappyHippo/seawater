import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  Download,
  BarChart3,
  Users,
  Star,
  Zap
} from 'lucide-react';

interface SubscriptionData {
  planId: string;
  planName: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate?: Date;
  amount: number;
  currency: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  usage: {
    assessments: {
      used: number;
      limit: number | null; // null for unlimited
      resetDate: Date;
    };
    reports: {
      generated: number;
      limit: number | null;
    };
    apiCalls?: {
      used: number;
      limit: number;
    };
  };
  features: string[];
  paymentMethod?: {
    type: 'card' | 'bank';
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
  };
}

interface SubscriptionDashboardProps {
  subscription: SubscriptionData;
  onUpgrade: (newPlanId: string) => void;
  onDowngrade: (newPlanId: string) => void;
  onCancel: () => void;
  onReactivate: () => void;
  onUpdatePayment: () => void;
  onDownloadInvoice: (invoiceId: string) => void;
  className?: string;
}

export const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  subscription,
  onUpgrade,
  onDowngrade,
  onCancel,
  onReactivate,
  onUpdatePayment,
  onDownloadInvoice,
  className,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');

  useEffect(() => {
    const updateTimeUntilReset = () => {
      const now = new Date();
      const resetDate = new Date(subscription.usage.assessments.resetDate);
      const timeDiff = resetDate.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeUntilReset('Usage resets today');
        return;
      }
      
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeUntilReset(`Resets in ${days} day${days > 1 ? 's' : ''}`);
      } else {
        setTimeUntilReset(`Resets in ${hours} hour${hours > 1 ? 's' : ''}`);
      }
    };

    updateTimeUntilReset();
    const interval = setInterval(updateTimeUntilReset, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscription.usage.assessments.resetDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'trialing':
        return 'text-blue-600 bg-blue-100';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5" />;
      case 'trialing':
        return <Star className="h-5 w-5" />;
      case 'past_due':
        return <AlertCircle className="h-5 w-5" />;
      case 'canceled':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const getUsagePercentage = (used: number, limit: number | null) => {
    if (limit === null) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const isNearLimit = (used: number, limit: number | null) => {
    if (limit === null) return false;
    return (used / limit) >= 0.8; // 80% or more
  };

  const formatNextBilling = () => {
    if (!subscription.nextBillingDate) return '';
    
    const date = new Date(subscription.nextBillingDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shouldShowUpgradePrompt = () => {
    const { assessments } = subscription.usage;
    return subscription.planId === 'starter' && 
           assessments.limit !== null && 
           assessments.used >= assessments.limit;
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Subscription Dashboard</h2>
            <p className="text-gray-600 mt-1">Manage your Seawater plan and usage</p>
          </div>
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium',
            getStatusColor(subscription.status)
          )}>
            {getStatusIcon(subscription.status)}
            <span className="capitalize">{subscription.status.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{subscription.planName}</h3>
              <p className="text-gray-600">
                ${subscription.amount}/{subscription.billingCycle === 'annual' ? 'year' : 'month'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Next billing</p>
            <p className="font-semibold text-gray-900">{formatNextBilling()}</p>
          </div>
        </div>

        {/* Trial Information */}
        {subscription.status === 'trialing' && subscription.trialEnd && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Free Trial Active</h4>
            </div>
            <p className="text-blue-700">
              Your trial ends on {new Date(subscription.trialEnd).toLocaleDateString()}. 
              Add a payment method to continue with your current plan.
            </p>
          </div>
        )}

        {/* Cancellation Warning */}
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-900">Subscription Ending</h4>
            </div>
            <p className="text-yellow-700 mb-3">
              Your subscription will end on {formatNextBilling()}. You'll lose access to premium features.
            </p>
            <button
              onClick={onReactivate}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Reactivate Subscription
            </button>
          </div>
        )}

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Property Assessments */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Property Assessments</h4>
              <BarChart3 className="h-4 w-4 text-gray-600" />
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {subscription.usage.assessments.used} of {
                    subscription.usage.assessments.limit || 'unlimited'
                  }
                </span>
                <span className={clsx(
                  'font-medium',
                  isNearLimit(subscription.usage.assessments.used, subscription.usage.assessments.limit)
                    ? 'text-red-600'
                    : 'text-gray-900'
                )}>
                  {subscription.usage.assessments.limit 
                    ? `${Math.round(getUsagePercentage(subscription.usage.assessments.used, subscription.usage.assessments.limit))}%`
                    : 'Unlimited'
                  }
                </span>
              </div>
              {subscription.usage.assessments.limit && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={clsx(
                      'h-2 rounded-full transition-all duration-300',
                      isNearLimit(subscription.usage.assessments.used, subscription.usage.assessments.limit)
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    )}
                    style={{
                      width: `${getUsagePercentage(subscription.usage.assessments.used, subscription.usage.assessments.limit)}%`
                    }}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">{timeUntilReset}</p>
          </div>

          {/* Reports Generated */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Reports Generated</h4>
              <Download className="h-4 w-4 text-gray-600" />
            </div>
            <div className="mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {subscription.usage.reports.generated}
              </span>
              <span className="text-gray-600 ml-2">this month</span>
            </div>
          </div>

          {/* API Calls (if applicable) */}
          {subscription.usage.apiCalls && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">API Calls</h4>
                <Zap className="h-4 w-4 text-gray-600" />
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {subscription.usage.apiCalls.used} of {subscription.usage.apiCalls.limit}
                  </span>
                  <span className="font-medium text-gray-900">
                    {Math.round((subscription.usage.apiCalls.used / subscription.usage.apiCalls.limit) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(subscription.usage.apiCalls.used / subscription.usage.apiCalls.limit) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade Prompt */}
        {shouldShowUpgradePrompt() && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-6 w-6" />
              <h4 className="text-lg font-semibold">Ready to upgrade?</h4>
            </div>
            <p className="mb-4">
              You've reached your monthly limit. Upgrade to Premium for unlimited assessments and advanced features.
            </p>
            <button
              onClick={() => onUpgrade('premium')}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Upgrade to Premium
            </button>
          </div>
        )}

        {/* Plan Features */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Your Plan Includes:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {subscription.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {subscription.planId !== 'professional' && (
            <button
              onClick={() => onUpgrade('professional')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upgrade Plan
            </button>
          )}
          
          {subscription.planId !== 'starter' && (
            <button
              onClick={() => onDowngrade('starter')}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Downgrade Plan
            </button>
          )}
          
          {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Payment Method */}
      {subscription.paymentMethod && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
            <button
              onClick={onUpdatePayment}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Update
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
              </p>
              <p className="text-sm text-gray-600">
                Expires {subscription.paymentMethod.expiryMonth}/{subscription.paymentMethod.expiryYear}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">
                  {subscription.planName} - {subscription.billingCycle}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">${subscription.amount}</p>
              <button
                onClick={() => onDownloadInvoice('current')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Subscription</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll lose access to premium features 
              at the end of your current billing period ({formatNextBilling()}).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onCancel();
                  setShowCancelConfirm(false);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex-1"
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex-1"
              >
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;