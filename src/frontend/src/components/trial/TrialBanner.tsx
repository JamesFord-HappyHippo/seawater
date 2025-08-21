import React from 'react';
import { Alert, Button } from 'flowbite-react';
import { Link } from 'react-router-dom';

interface TrialBannerProps {
  canUseTrial: boolean;
  hasUsedTrial: boolean;
  onStartTrial?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({
  canUseTrial,
  hasUsedTrial,
  onStartTrial
}) => {
  if (hasUsedTrial) {
    return (
      <Alert color="warning" className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">🎯</span>
            <span className="font-medium">
              You've used your free assessment! 
            </span>
            <span className="ml-1">Ready for unlimited access?</span>
          </div>
          <Button
            as={Link}
            to="/register"
            size="sm"
            color="warning"
            className="ml-4"
          >
            Get Full Access
          </Button>
        </div>
      </Alert>
    );
  }

  if (canUseTrial) {
    return (
      <Alert color="success" className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">🎉</span>
            <span className="font-medium">
              Free Trial Available! 
            </span>
            <span className="ml-1">
              Try one comprehensive location risk assessment - perfect for any address or destination.
            </span>
          </div>
          {onStartTrial && (
            <Button
              onClick={onStartTrial}
              size="sm"
              color="success"
              className="ml-4"
            >
              Start Free Assessment
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  return null;
};

export default TrialBanner;