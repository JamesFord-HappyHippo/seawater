import React, { useState } from 'react';
import { ChevronDownIcon, ArrowTopRightOnSquareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface RiskSource {
  authority: string;
  source: string;
  value: string;
  url?: string;
  confidence: number;
  effectiveDate?: string;
  notes?: string;
}

interface RiskAttributionProps {
  riskType: string;
  score: number;
  category: string;
  confidence: number;
  sources: RiskSource[];
  methodology: string;
  uncertaintyRange?: {
    low: number;
    high: number;
  };
  lastUpdated: string;
}

const RiskAttribution: React.FC<RiskAttributionProps> = ({
  riskType,
  score,
  category,
  confidence,
  sources,
  methodology,
  uncertaintyRange,
  lastUpdated
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const formatConfidence = (conf: number) => {
    return `${Math.round(conf * 100)}%`;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600';
    if (conf >= 0.8) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getSourceIcon = (authority: string) => {
    const authority_lower = authority.toLowerCase();
    if (authority_lower.includes('fema')) return '🏛️';
    if (authority_lower.includes('noaa')) return '🌊';
    if (authority_lower.includes('usgs')) return '🌍';
    if (authority_lower.includes('local') || authority_lower.includes('planning')) return '🏘️';
    return '📊';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isDataOld = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    return date < fiveYearsAgo;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      {/* Risk Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900">
              {riskType}: {score}/100
            </span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              category === 'HIGH' || category === 'VERY_HIGH' 
                ? 'bg-red-100 text-red-800'
                : category === 'MODERATE' 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {category}
            </span>
          </div>
          
          {/* Confidence Indicator */}
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">Confidence:</span>
            <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
              {formatConfidence(confidence)}
            </span>
          </div>

          {/* Uncertainty Range */}
          {uncertaintyRange && (
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Range:</span>
              <span className="text-sm text-gray-700">
                {uncertaintyRange.low}-{uncertaintyRange.high}
              </span>
            </div>
          )}
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
        >
          <span>View Sources</span>
          <ChevronDownIcon 
            className={`h-4 w-4 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Data Sources */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Data Sources:</h4>
            <div className="space-y-3">
              {sources.map((source, index) => (
                <div key={index} className="bg-white rounded border border-gray-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{getSourceIcon(source.authority)}</span>
                        <span className="font-medium text-gray-900">{source.authority}</span>
                        <span className={`text-sm ${getConfidenceColor(source.confidence)}`}>
                          ({formatConfidence(source.confidence)} confidence)
                        </span>
                        {source.effectiveDate && isDataOld(source.effectiveDate) && (
                          <div className="flex items-center space-x-1 text-orange-600">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <span className="text-xs">Data &gt;5 years old</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-1">
                        <strong>{source.source}:</strong> {source.value}
                      </div>
                      
                      {source.effectiveDate && (
                        <div className="text-xs text-gray-500">
                          Effective: {formatDate(source.effectiveDate)}
                        </div>
                      )}
                      
                      {source.notes && (
                        <div className="text-xs text-gray-600 mt-1 italic">
                          {source.notes}
                        </div>
                      )}
                    </div>
                    
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm ml-3"
                      >
                        <span>View Source</span>
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Methodology */}
          <div>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="flex items-center space-x-1 text-sm font-medium text-gray-900 hover:text-gray-700"
            >
              <span>How we calculate this score</span>
              <ChevronDownIcon 
                className={`h-4 w-4 transform transition-transform ${
                  showMethodology ? 'rotate-180' : ''
                }`} 
              />
            </button>
            
            {showMethodology && (
              <div className="mt-2 text-sm text-gray-700 bg-blue-50 rounded p-3">
                {methodology}
              </div>
            )}
          </div>

          {/* Report Issue */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Last updated: {formatDate(lastUpdated)}
              </div>
              <button
                onClick={() => {
                  // TODO: Implement dispute/feedback mechanism
                  window.open('mailto:feedback@seawater.io?subject=Data%20Dispute%20-%20' + encodeURIComponent(riskType), '_blank');
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Report an issue with this data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAttribution;