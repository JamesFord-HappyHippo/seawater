/**
 * Utility functions for formatting data for display
 */

/**
 * Format a date string or Date object for display
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Format a date as a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  };
  
  return new Intl.NumberFormat('en-US', defaultOptions).format(value);
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  };
  
  return new Intl.NumberFormat('en-US', defaultOptions).format(value / 100);
}

/**
 * Format a number in compact notation (e.g., 1.2K, 3.4M)
 */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format a duration in milliseconds to human readable format
 */
export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return '0ms';
  }
  
  const units = [
    { label: 'ms', value: 1 },
    { label: 's', value: 1000 },
    { label: 'm', value: 60000 },
    { label: 'h', value: 3600000 },
    { label: 'd', value: 86400000 },
  ];
  
  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i];
    if (milliseconds >= unit.value) {
      const value = milliseconds / unit.value;
      return `${value.toFixed(value < 10 ? 1 : 0)}${unit.label}`;
    }
  }
  
  return `${milliseconds}ms`;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision: number = 4
): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'Invalid coordinates';
  }
  
  const lat = latitude.toFixed(precision);
  const lng = longitude.toFixed(precision);
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';
  
  return `${Math.abs(Number(lat))}°${latDir}, ${Math.abs(Number(lng))}°${lngDir}`;
}

/**
 * Format address for display (truncate if too long)
 */
export function formatAddress(address: string, maxLength: number = 50): string {
  if (!address) return '';
  
  if (address.length <= maxLength) {
    return address;
  }
  
  // Try to truncate at a comma or space
  const truncated = address.substring(0, maxLength);
  const lastComma = truncated.lastIndexOf(',');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastComma > maxLength * 0.7) {
    return truncated.substring(0, lastComma) + '...';
  } else if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  } else {
    return truncated + '...';
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle different lengths
  if (digits.length === 10) {
    // US format: (123) 456-7890
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    // US format with country code: +1 (123) 456-7890
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else {
    // Return original if not recognized format
    return phoneNumber;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(
  distanceInKm: number,
  unit: 'metric' | 'imperial' = 'imperial'
): string {
  if (!Number.isFinite(distanceInKm)) {
    return '—';
  }
  
  if (unit === 'imperial') {
    const miles = distanceInKm * 0.621371;
    if (miles < 0.1) {
      const feet = miles * 5280;
      return `${Math.round(feet)} ft`;
    } else {
      return `${miles.toFixed(1)} mi`;
    }
  } else {
    if (distanceInKm < 1) {
      const meters = distanceInKm * 1000;
      return `${Math.round(meters)} m`;
    } else {
      return `${distanceInKm.toFixed(1)} km`;
    }
  }
}

/**
 * Format area for display
 */
export function formatArea(
  areaInSqKm: number,
  unit: 'metric' | 'imperial' = 'imperial'
): string {
  if (!Number.isFinite(areaInSqKm)) {
    return '—';
  }
  
  if (unit === 'imperial') {
    const sqMiles = areaInSqKm * 0.386102;
    if (sqMiles < 0.01) {
      const acres = sqMiles * 640;
      return `${acres.toFixed(1)} acres`;
    } else {
      return `${sqMiles.toFixed(2)} sq mi`;
    }
  } else {
    if (areaInSqKm < 1) {
      const sqMeters = areaInSqKm * 1000000;
      return `${formatCompactNumber(sqMeters)} sq m`;
    } else {
      return `${areaInSqKm.toFixed(2)} sq km`;
    }
  }
}

/**
 * Capitalize first letter of each word
 */
export function formatTitle(text: string): string {
  if (!text) return '';
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format text to sentence case
 */
export function formatSentence(text: string): string {
  if (!text) return '';
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format API response time for display
 */
export function formatResponseTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  if (!Number.isFinite(confidence)) {
    return '—';
  }
  
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Format risk score with color coding
 */
export function formatRiskScore(score: number): {
  formatted: string;
  color: string;
  level: string;
} {
  if (!Number.isFinite(score)) {
    return {
      formatted: '—',
      color: 'text-neutral-500',
      level: 'Unknown',
    };
  }
  
  const rounded = Math.round(score);
  
  let color: string;
  let level: string;
  
  if (rounded >= 80) {
    color = 'text-red-700';
    level = 'Extreme';
  } else if (rounded >= 60) {
    color = 'text-red-600';
    level = 'Very High';
  } else if (rounded >= 40) {
    color = 'text-orange-600';
    level = 'High';
  } else if (rounded >= 20) {
    color = 'text-yellow-600';
    level = 'Moderate';
  } else {
    color = 'text-green-600';
    level = 'Low';
  }
  
  return {
    formatted: rounded.toString(),
    color,
    level,
  };
}