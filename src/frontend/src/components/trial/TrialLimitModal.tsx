import React from 'react';
import { Modal, Button, Card } from 'flowbite-react';
import { Link } from 'react-router-dom';

interface TrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialDate?: string | null;
}

const TrialLimitModal: React.FC<TrialLimitModalProps> = ({
  isOpen,
  onClose,
  trialDate
}) => {
  const formatTrialDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'recently';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'recently';
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🌊</span>
            <span className="text-xl font-bold">
              Seawater<span className="text-seawater-600">.io</span> - Premium Assessment
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              You've Used Your Free Assessment!
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              You tried our comprehensive location risk assessment on{' '}
              <span className="font-semibold text-seawater-600">
                {formatTrialDate(trialDate)}
              </span>. 
              Ready to access unlimited assessments for all your location decisions - home buying, rentals, vacations, and more?
            </p>
          </div>

          <div className="bg-gradient-to-br from-seawater-50 to-blue-100 p-6 rounded-xl">
            <h4 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              🚀 Get Full Access to All Features
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">Unlimited property assessments</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">All 18 FEMA hazard types</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">Real-time earthquake & flood alerts</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">75+ years weather history</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">Professional PDF reports</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">Priority support</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="mb-4">
                <span className="text-3xl font-bold text-seawater-600">$19</span>
                <span className="text-gray-600">/month</span>
                <span className="ml-2 text-sm text-gray-500">(or $190/year - save 17%)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              as={Link}
              to="/register"
              size="xl"
              color="blue"
              className="font-medium"
            >
              🚀 Start Free Account - No Credit Card
            </Button>
            <Button
              size="xl"
              color="light"
              onClick={onClose}
              className="font-medium"
            >
              Maybe Later
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Join 1,000+ property buyers making smarter climate-informed decisions
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TrialLimitModal;