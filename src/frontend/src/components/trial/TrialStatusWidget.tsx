import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SeawaterCognitoAuth } from '../../auth/cognito';

interface TrialStatus {
  trial_status: 'active' | 'used' | 'expired' | 'converted' | 'paid';
  allowed: boolean;
  reports_used: number;
  reports_limit: number;
  remaining_requests: number;
  trial_started?: string;
  trial_expires?: string;
  subscription_tier: string;
}

interface TrialStatusWidgetProps {
  className?: string;
  compact?: boolean;
  showUpgradeButton?: boolean;
}

const TrialStatusWidget: React.FC<TrialStatusWidgetProps> = ({
  className = '',
  compact = false,
  showUpgradeButton = true
}) => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  const fetchTrialStatus = async () => {
    try {
      const token = SeawaterCognitoAuth.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Extract trial status from profile response
        if (data.success && data.profile) {
          setTrialStatus({
            trial_status: data.profile.trial.status,
            allowed: data.profile.trial.allowed,
            reports_used: data.profile.trial.reports_used,
            reports_limit: data.profile.trial.reports_limit,
            remaining_requests: data.profile.trial.remaining_requests,
            trial_started: data.profile.trial.trial_started,
            trial_expires: data.profile.trial.trial_expires,
            subscription_tier: data.profile.subscription.tier
          });
        } else {
          setError('Invalid profile data');
        }
      } else {
        setError('Failed to load trial status');
      }
    } catch (err) {
      console.error('Failed to fetch trial status:', err);
      setError('Failed to load trial status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'used':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'expired':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'paid':
      case 'converted':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🎯';
      case 'used':
        return '⚠️';
      case 'expired':
        return '⏰';
      case 'paid':
      case 'converted':
        return '⭐';
      default:
        return '📊';
    }
  };

  const getStatusMessage = (status: TrialStatus) => {
    if (status.subscription_tier !== 'trial') {
      return {
        title: 'Premium Account',
        message: 'Unlimited climate risk assessments',
        cta: null
      };
    }

    switch (status.trial_status) {
      case 'active':
        return {
          title: 'Free Trial Active',
          message: `${status.remaining_requests} free report${status.remaining_requests !== 1 ? 's' : ''} remaining`,
          cta: status.remaining_requests === 0 ? 'Upgrade for More' : null
        };
      case 'used':
        return {
          title: 'Trial Complete',
          message: 'You\'ve used your free climate risk report',
          cta: 'Upgrade for Unlimited Access'
        };
      case 'expired':
        return {
          title: 'Trial Expired',
          message: 'Your free trial has expired',
          cta: 'Upgrade to Continue'
        };
      default:
        return {
          title: 'Trial Status',
          message: 'Check your trial status',
          cta: 'Learn More'
        };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !trialStatus) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-gray-500">Trial status unavailable</p>
      </div>
    );
  }

  const statusInfo = getStatusMessage(trialStatus);

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm ${getStatusColor(trialStatus.trial_status)} ${className}`}>
        <span>{getStatusIcon(trialStatus.trial_status)}</span>
        <span className="font-medium">{statusInfo.title}</span>
        {trialStatus.trial_status === 'active' && (
          <span className="text-xs">
            ({trialStatus.remaining_requests} left)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(trialStatus.trial_status)} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon(trialStatus.trial_status)}</span>
          <h3 className="font-semibold text-sm">{statusInfo.title}</h3>
        </div>
        {trialStatus.subscription_tier !== 'free' && (
          <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {trialStatus.subscription_tier.toUpperCase()}
          </span>
        )}
      </div>

      {/* Status Message */}
      <p className="text-sm mb-3">{statusInfo.message}</p>

      {/* Progress Bar for Active Trials */}
      {trialStatus.trial_status === 'active' && trialStatus.reports_limit > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Reports Used</span>
            <span>{trialStatus.reports_used} / {trialStatus.reports_limit}</span>
          </div>
          <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
            <div 
              className="bg-current h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, (trialStatus.reports_used / trialStatus.reports_limit) * 100)}%` 
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Trial Details */}
      {trialStatus.trial_started && trialStatus.trial_status !== 'converted' && (
        <div className="text-xs space-y-1 mb-3">
          {trialStatus.trial_started && (
            <div className="flex justify-between">
              <span>Trial Started:</span>
              <span>{formatDate(trialStatus.trial_started)}</span>
            </div>
          )}
          {trialStatus.trial_expires && (
            <div className="flex justify-between">
              <span>Expires:</span>
              <span>{formatDate(trialStatus.trial_expires)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {showUpgradeButton && statusInfo.cta && (
        <div className="space-y-2">
          <Link
            to="/upgrade"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {statusInfo.cta}
          </Link>
          
          {trialStatus.trial_status === 'used' && (
            <Link
              to="/features"
              className="block w-full text-center text-blue-600 hover:text-blue-500 text-xs"
            >
              See what you're missing
            </Link>
          )}
        </div>
      )}

      {/* Premium Features Teaser */}
      {trialStatus.subscription_tier === 'trial' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-xs font-medium mb-1">Upgrade Benefits:</p>
          <ul className="text-xs space-y-1">
            <li>• Unlimited property assessments</li>
            <li>• Premium data sources & projections</li>
            <li>• Historical trend analysis</li>
            <li>• Professional reporting tools</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TrialStatusWidget;