import { RiskLevel } from '@types';

/**
 * Get the CSS color class for a risk level
 */
export function getRiskLevelColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'LOW':
      return 'text-risk-low';
    case 'MODERATE':
      return 'text-risk-moderate';
    case 'HIGH':
      return 'text-risk-high';
    case 'VERY_HIGH':
      return 'text-risk-high';
    case 'EXTREME':
      return 'text-risk-extreme';
    default:
      return 'text-neutral-600';
  }
}

/**
 * Get the background color class for a risk level
 */
export function getRiskLevelBgColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'LOW':
      return 'bg-green-50 border-green-200';
    case 'MODERATE':
      return 'bg-yellow-50 border-yellow-200';
    case 'HIGH':
      return 'bg-orange-50 border-orange-200';
    case 'VERY_HIGH':
      return 'bg-red-50 border-red-200';
    case 'EXTREME':
      return 'bg-red-100 border-red-300';
    default:
      return 'bg-neutral-50 border-neutral-200';
  }
}

/**
 * Get the emoji icon for a risk level
 */
export function getRiskLevelIcon(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'LOW':
      return '✅';
    case 'MODERATE':
      return '⚠️';
    case 'HIGH':
      return '🚨';
    case 'VERY_HIGH':
      return '🔴';
    case 'EXTREME':
      return '🆘';
    default:
      return '❓';
  }
}

/**
 * Get a human-readable description for a risk level
 */
export function getRiskLevelDescription(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'LOW':
      return 'Low risk with minimal impact expected';
    case 'MODERATE':
      return 'Moderate risk requiring some precautions';
    case 'HIGH':
      return 'High risk requiring significant preparation';
    case 'VERY_HIGH':
      return 'Very high risk with serious potential impacts';
    case 'EXTREME':
      return 'Extreme risk with catastrophic potential impacts';
    default:
      return 'Risk level unknown';
  }
}

/**
 * Calculate risk level from a numeric score (0-100)
 */
export function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'EXTREME';
  if (score >= 60) return 'VERY_HIGH';
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MODERATE';
  return 'LOW';
}

/**
 * Get the risk score range for a given risk level
 */
export function getRiskLevelRange(riskLevel: RiskLevel): [number, number] {
  switch (riskLevel) {
    case 'LOW':
      return [0, 19];
    case 'MODERATE':
      return [20, 39];
    case 'HIGH':
      return [40, 59];
    case 'VERY_HIGH':
      return [60, 79];
    case 'EXTREME':
      return [80, 100];
    default:
      return [0, 100];
  }
}

/**
 * Normalize risk scores from different sources to a 0-100 scale
 */
export function normalizeRiskScore(score: number, sourceScale: [number, number] = [0, 100]): number {
  const [min, max] = sourceScale;
  const normalized = ((score - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

/**
 * Calculate weighted average of multiple risk scores
 */
export function calculateWeightedAverage(
  scores: Array<{ score: number; weight: number }>
): number {
  if (scores.length === 0) return 0;
  
  const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * Get risk trend direction and magnitude
 */
export function calculateRiskTrend(
  currentScore: number,
  projectedScore: number
): {
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: 'slight' | 'moderate' | 'significant';
  change: number;
  changePercent: number;
} {
  const change = projectedScore - currentScore;
  const changePercent = currentScore > 0 ? (change / currentScore) * 100 : 0;
  
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(change) < 2) {
    direction = 'stable';
  } else if (change > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }
  
  let magnitude: 'slight' | 'moderate' | 'significant';
  if (Math.abs(changePercent) < 10) {
    magnitude = 'slight';
  } else if (Math.abs(changePercent) < 25) {
    magnitude = 'moderate';
  } else {
    magnitude = 'significant';
  }
  
  return {
    direction,
    magnitude,
    change,
    changePercent: Math.round(changePercent),
  };
}

/**
 * Get risk comparison result between two properties
 */
export function compareRiskScores(
  score1: number,
  score2: number,
  threshold: number = 5
): {
  result: 'better' | 'worse' | 'similar';
  difference: number;
  significantDifference: boolean;
} {
  const difference = score2 - score1;
  const significantDifference = Math.abs(difference) >= threshold;
  
  let result: 'better' | 'worse' | 'similar';
  if (!significantDifference) {
    result = 'similar';
  } else if (difference < 0) {
    result = 'better'; // score2 is lower (better)
  } else {
    result = 'worse'; // score2 is higher (worse)
  }
  
  return {
    result,
    difference,
    significantDifference,
  };
}

/**
 * Format risk score for display
 */
export function formatRiskScore(
  score: number,
  options: {
    showDecimals?: boolean;
    showOutOf100?: boolean;
    showRiskLevel?: boolean;
  } = {}
): string {
  const { showDecimals = false, showOutOf100 = false, showRiskLevel = false } = options;
  
  let formatted = showDecimals ? score.toFixed(1) : Math.round(score).toString();
  
  if (showOutOf100) {
    formatted += '/100';
  }
  
  if (showRiskLevel) {
    const riskLevel = calculateRiskLevel(score);
    formatted += ` (${riskLevel.replace('_', ' ')})`;
  }
  
  return formatted;
}

/**
 * Get color for risk score visualization
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 80) return '#991b1b'; // red-800
  if (score >= 60) return '#ef4444'; // red-500
  if (score >= 40) return '#f59e0b'; // amber-500
  if (score >= 20) return '#eab308'; // yellow-500
  return '#10b981'; // emerald-500
}

/**
 * Validate risk score is within valid range
 */
export function isValidRiskScore(score: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

/**
 * Get risk assessment confidence level description
 */
export function getConfidenceDescription(confidence: number): string {
  if (confidence >= 0.9) return 'Very High Confidence';
  if (confidence >= 0.7) return 'High Confidence';
  if (confidence >= 0.5) return 'Moderate Confidence';
  if (confidence >= 0.3) return 'Low Confidence';
  return 'Very Low Confidence';
}