import React, { memo, useMemo } from 'react';
import { clsx } from 'clsx';
import { RiskLevel, ComponentSize } from '../../types';
import { getRiskLevelColor } from '../../utils/risk';

interface RiskMeterProps extends ComponentSize {
  value: number;
  maxValue?: number;
  showNeedle?: boolean;
  showLabels?: boolean;
  showScale?: boolean;
  animate?: boolean;
  thresholds?: Array<{
    value: number;
    color: string;
    label: RiskLevel;
  }>;
  className?: string;
  title?: string;
}

const DEFAULT_THRESHOLDS = [
  { value: 20, color: '#10b981', label: 'LOW' as RiskLevel },
  { value: 40, color: '#f59e0b', label: 'MODERATE' as RiskLevel },
  { value: 60, color: '#ef4444', label: 'HIGH' as RiskLevel },
  { value: 80, color: '#dc2626', label: 'VERY_HIGH' as RiskLevel },
  { value: 100, color: '#991b1b', label: 'EXTREME' as RiskLevel },
];

export const RiskMeter: React.FC<RiskMeterProps> = memo(({
  value,
  maxValue = 100,
  showNeedle = true,
  showLabels = true,
  showScale = true,
  animate = true,
  thresholds = DEFAULT_THRESHOLDS,
  size = 'medium',
  className,
  title,
}) => {
  const normalizedValue = Math.max(0, Math.min(value, maxValue));
  const percentage = (normalizedValue / maxValue) * 100;
  
  // Calculate meter dimensions based on size
  const dimensions = useMemo(() => {
    switch (size) {
      case 'small':
        return { radius: 60, strokeWidth: 8, fontSize: 12 };
      case 'large':
        return { radius: 120, strokeWidth: 16, fontSize: 18 };
      default:
        return { radius: 80, strokeWidth: 12, fontSize: 14 };
    }
  }, [size]);
  
  const { radius, strokeWidth, fontSize } = dimensions;
  const center = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate arc parameters (semi-circle)
  const startAngle = -180; // Start from left
  const endAngle = 0; // End at right
  const arcLength = circumference / 2; // Half circle
  
  // Calculate needle angle (0-180 degrees)
  const needleAngle = (percentage / 100) * 180 - 180;
  
  // Generate gradient stops for the meter
  const gradientStops = useMemo(() => {
    return thresholds.map((threshold, index) => {
      const offset = (threshold.value / maxValue) * 100;
      return {
        offset: `${offset}%`,
        color: threshold.color,
      };
    });
  }, [thresholds, maxValue]);
  
  // Current risk level
  const currentRiskLevel = useMemo(() => {
    for (let i = 0; i < thresholds.length; i++) {
      if (normalizedValue <= thresholds[i].value) {
        return thresholds[i];
      }
    }
    return thresholds[thresholds.length - 1];
  }, [normalizedValue, thresholds]);
  
  // Create path for the meter arc
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };
  
  // Convert polar coordinates to cartesian
  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }
  
  const backgroundPath = createArcPath(startAngle, endAngle, radius);
  const valuePath = createArcPath(startAngle, startAngle + (percentage / 100) * 180, radius);
  
  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {title && (
        <h4 className={clsx(
          'font-semibold text-neutral-900 mb-2',
          size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
        )}>
          {title}
        </h4>
      )}
      
      <div className="relative">
        <svg
          width={center * 2}
          height={center + strokeWidth / 2}
          className="overflow-visible"
        >
          <defs>
            {/* Gradient for the meter */}
            <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops.map((stop, index) => (
                <stop
                  key={index}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
            
            {/* Drop shadow filter */}
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.1)" />
            </filter>
          </defs>
          
          {/* Background arc */}
          <path
            d={backgroundPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Value arc */}
          <path
            d={valuePath}
            fill="none"
            stroke="url(#riskGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#dropShadow)"
            className={animate ? 'transition-all duration-1000 ease-out' : ''}
            style={{
              strokeDasharray: arcLength,
              strokeDashoffset: animate ? 0 : arcLength - (arcLength * percentage / 100),
            }}
          />
          
          {/* Needle */}
          {showNeedle && (
            <g
              transform={`rotate(${needleAngle} ${center} ${center})`}
              className={animate ? 'transition-transform duration-1000 ease-out' : ''}
            >
              {/* Needle line */}
              <line
                x1={center}
                y1={center}
                x2={center}
                y2={center - radius + strokeWidth / 2}
                stroke="#374151"
                strokeWidth="3"
                strokeLinecap="round"
              />
              
              {/* Needle center dot */}
              <circle
                cx={center}
                cy={center}
                r="6"
                fill="#374151"
              />
            </g>
          )}
          
          {/* Scale marks */}
          {showScale && (
            <g>
              {[0, 25, 50, 75, 100].map((mark) => {
                const angle = -180 + (mark / 100) * 180;
                const outerPoint = polarToCartesian(center, center, radius + 5, angle);
                const innerPoint = polarToCartesian(center, center, radius - 5, angle);
                
                return (
                  <line
                    key={mark}
                    x1={innerPoint.x}
                    y1={innerPoint.y}
                    x2={outerPoint.x}
                    y2={outerPoint.y}
                    stroke="#6b7280"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}
        </svg>
        
        {/* Center value display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <div
            className={clsx(
              'font-bold',
              getRiskLevelColor(currentRiskLevel.label),
              size === 'small' ? 'text-xl' : size === 'large' ? 'text-4xl' : 'text-3xl'
            )}
          >
            {Math.round(normalizedValue)}
          </div>
          {showLabels && (
            <div
              className={clsx(
                'text-neutral-600 font-medium',
                size === 'small' ? 'text-xs' : size === 'large' ? 'text-sm' : 'text-xs'
              )}
            >
              {currentRiskLevel.label.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>
      
      {/* Scale labels */}
      {showLabels && showScale && (
        <div className="flex justify-between w-full mt-2 px-4">
          <span className={clsx(
            'text-neutral-500',
            size === 'small' ? 'text-xs' : 'text-sm'
          )}>
            Low
          </span>
          <span className={clsx(
            'text-neutral-500',
            size === 'small' ? 'text-xs' : 'text-sm'
          )}>
            High
          </span>
        </div>
      )}
      
      {/* Risk level indicators */}
      {showLabels && (
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {thresholds.map((threshold, index) => (
            <div
              key={threshold.label}
              className={clsx(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs',
                normalizedValue <= threshold.value && (index === 0 || normalizedValue > thresholds[index - 1].value)
                  ? 'bg-neutral-100 border border-neutral-300'
                  : 'text-neutral-400'
              )}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: threshold.color }}
              />
              <span>{threshold.label.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

RiskMeter.displayName = 'RiskMeter';