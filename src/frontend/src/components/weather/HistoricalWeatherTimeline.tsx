import React, { memo, useMemo } from 'react';
import { 
  Calendar,
  MapPin,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Clock
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  ProcessedStormEvent, 
  HazardType,
  ComponentSize 
} from '../../types';
import { formatDate } from '../../utils/formatting';

interface HistoricalWeatherTimelineProps extends ComponentSize {
  events: ProcessedStormEvent[];
  showFilters?: boolean;
  maxEvents?: number;
  className?: string;
}

const HAZARD_COLORS: Record<HazardType, string> = {
  flood: 'bg-blue-500',
  wildfire: 'bg-orange-500',
  hurricane: 'bg-purple-500',
  tornado: 'bg-gray-600',
  earthquake: 'bg-amber-600',
  heat: 'bg-red-500',
  drought: 'bg-yellow-600',
  hail: 'bg-cyan-500',
  avalanche: 'bg-slate-400',
  coastal_flooding: 'bg-teal-500',
  cold_wave: 'bg-blue-700',
  ice_storm: 'bg-indigo-400',
  landslide: 'bg-stone-600',
  lightning: 'bg-yellow-400',
  riverine_flooding: 'bg-blue-600',
  strong_wind: 'bg-gray-500',
  tsunami: 'bg-blue-800',
  volcanic_activity: 'bg-red-700',
  winter_weather: 'bg-slate-500'
};

const HAZARD_ICONS: Record<HazardType, string> = {
  flood: '🌊',
  wildfire: '🔥',
  hurricane: '🌀',
  tornado: '🌪️',
  earthquake: '🏠',
  heat: '🌡️',
  drought: '🏜️',
  hail: '🧊',
  avalanche: '🏔️',
  coastal_flooding: '🌊',
  cold_wave: '🥶',
  ice_storm: '🧊',
  landslide: '🗻',
  lightning: '⚡',
  riverine_flooding: '🌊',
  strong_wind: '💨',
  tsunami: '🌊',
  volcanic_activity: '🌋',
  winter_weather: '❄️'
};

export const HistoricalWeatherTimeline: React.FC<HistoricalWeatherTimelineProps> = memo(({
  events,
  showFilters = true,
  maxEvents = 20,
  size = 'medium',
  className
}) => {
  // Process and sort events
  const processedEvents = useMemo(() => {
    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, maxEvents);
  }, [events, maxEvents]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const eventsByHazard: Record<string, number> = {};
    const eventsByYear: Record<string, number> = {};
    let totalDamages = 0;
    let totalCasualties = 0;

    events.forEach(event => {
      // Count by hazard type
      eventsByHazard[event.event_type] = (eventsByHazard[event.event_type] || 0) + 1;
      
      // Count by year
      const year = new Date(event.date).getFullYear().toString();
      eventsByYear[year] = (eventsByYear[year] || 0) + 1;
      
      // Sum damages and casualties
      if (event.damages.property_damage_usd) {
        totalDamages += event.damages.property_damage_usd;
      }
      totalCasualties += event.damages.injuries + event.damages.fatalities;
    });

    const mostCommonHazard = Object.entries(eventsByHazard)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    const avgEventsPerYear = events.length / Math.max(1, Object.keys(eventsByYear).length);

    return {
      totalEvents: events.length,
      mostCommonHazard: mostCommonHazard as HazardType,
      avgEventsPerYear: Math.round(avgEventsPerYear * 10) / 10,
      totalDamages,
      totalCasualties,
      eventsByHazard,
      eventsByYear
    };
  }, [events]);

  const sizeStyles = {
    small: {
      container: 'p-3',
      title: 'text-lg',
      subtitle: 'text-sm',
      text: 'text-xs',
      icon: 'h-4 w-4',
      eventCard: 'p-2',
      hazardIcon: 'text-lg'
    },
    medium: {
      container: 'p-4',
      title: 'text-xl',
      subtitle: 'text-base',
      text: 'text-sm',
      icon: 'h-5 w-5',
      eventCard: 'p-3',
      hazardIcon: 'text-xl'
    },
    large: {
      container: 'p-6',
      title: 'text-2xl',
      subtitle: 'text-lg',
      text: 'text-base',
      icon: 'h-6 w-6',
      eventCard: 'p-4',
      hazardIcon: 'text-2xl'
    }
  };

  const styles = sizeStyles[size];

  if (events.length === 0) {
    return (
      <div className={clsx('card bg-neutral-50', styles.container, className)}>
        <div className="flex items-center space-x-2 text-neutral-600">
          <Calendar className={styles.icon} />
          <span className={styles.text}>No historical weather events found for this location</span>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('card', styles.container, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className={clsx('text-neutral-700', styles.icon)} />
          <h3 className={clsx('font-semibold text-neutral-900', styles.title)}>
            Historical Weather Events
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className={clsx('text-neutral-500', styles.icon)} />
          <span className={clsx('text-neutral-600', styles.text)}>
            {statistics.totalEvents} events
          </span>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Events"
          value={statistics.totalEvents.toString()}
          icon="📊"
          size={size}
        />
        <StatCard
          label="Most Common"
          value={statistics.mostCommonHazard ? statistics.mostCommonHazard.replace('_', ' ') : 'N/A'}
          icon={statistics.mostCommonHazard ? HAZARD_ICONS[statistics.mostCommonHazard] : '❓'}
          size={size}
        />
        <StatCard
          label="Per Year"
          value={statistics.avgEventsPerYear.toString()}
          icon="📈"
          size={size}
        />
        <StatCard
          label="Total Damage"
          value={statistics.totalDamages > 0 ? `$${(statistics.totalDamages / 1000000).toFixed(1)}M` : 'N/A'}
          icon="💰"
          size={size}
        />
      </div>

      {/* Events Timeline */}
      <div className="space-y-3">
        <h4 className={clsx('font-medium text-neutral-700 mb-3', styles.subtitle)}>
          Recent Events ({processedEvents.length} of {statistics.totalEvents})
        </h4>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {processedEvents.map((event, index) => (
            <WeatherEventCard
              key={event.event_id}
              event={event}
              size={size}
              isRecent={index < 5}
            />
          ))}
        </div>
      </div>

      {/* Frequency Analysis */}
      {showFilters && (
        <div className="mt-6 pt-4 border-t border-neutral-200">
          <h4 className={clsx('font-medium text-neutral-700 mb-3', styles.subtitle)}>
            Event Frequency by Type
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(statistics.eventsByHazard)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([hazardType, count]) => (
                <div 
                  key={hazardType}
                  className="flex items-center space-x-2 p-2 bg-neutral-50 rounded-lg"
                >
                  <span className="text-sm">{HAZARD_ICONS[hazardType as HazardType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('font-medium text-neutral-900 truncate capitalize', styles.text)}>
                      {hazardType.replace('_', ' ')}
                    </p>
                    <p className={clsx('text-neutral-600', styles.text)}>
                      {count} event{count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Statistics Card Component
interface StatCardProps extends ComponentSize {
  label: string;
  value: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = memo(({ label, value, icon, size = 'medium' }) => {
  const sizeStyles = {
    small: {
      container: 'p-2',
      icon: 'text-lg',
      value: 'text-sm',
      label: 'text-xs'
    },
    medium: {
      container: 'p-3',
      icon: 'text-xl',
      value: 'text-base',
      label: 'text-xs'
    },
    large: {
      container: 'p-4',
      icon: 'text-2xl',
      value: 'text-lg',
      label: 'text-sm'
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className={clsx('bg-neutral-50 rounded-lg text-center', styles.container)}>
      <div className={clsx('mb-1', styles.icon)}>{icon}</div>
      <div className={clsx('font-semibold text-neutral-900', styles.value)}>{value}</div>
      <div className={clsx('text-neutral-600', styles.label)}>{label}</div>
    </div>
  );
});

// Weather Event Card Component
interface WeatherEventCardProps extends ComponentSize {
  event: ProcessedStormEvent;
  isRecent?: boolean;
}

const WeatherEventCard: React.FC<WeatherEventCardProps> = memo(({ 
  event, 
  isRecent = false,
  size = 'medium' 
}) => {
  const hazardColor = HAZARD_COLORS[event.event_type];
  const hazardIcon = HAZARD_ICONS[event.event_type];

  const sizeStyles = {
    small: {
      container: 'p-2',
      text: 'text-xs',
      icon: 'h-3 w-3',
      hazardIcon: 'text-sm'
    },
    medium: {
      container: 'p-3',
      text: 'text-sm',
      icon: 'h-4 w-4',
      hazardIcon: 'text-base'
    },
    large: {
      container: 'p-4',
      text: 'text-base',
      icon: 'h-5 w-5',
      hazardIcon: 'text-lg'
    }
  };

  const styles = sizeStyles[size];

  const severityColor = 
    event.severity_score >= 80 ? 'text-red-600' :
    event.severity_score >= 60 ? 'text-orange-600' :
    event.severity_score >= 40 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className={clsx(
      'border border-neutral-200 rounded-lg transition-all duration-200 hover:shadow-md',
      isRecent && 'border-seawater-primary/30 bg-seawater-primary/5',
      styles.container
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center text-white',
            hazardColor
          )}>
            <span className={styles.hazardIcon}>{hazardIcon}</span>
          </div>
          <div>
            <h5 className={clsx('font-medium text-neutral-900 capitalize', styles.text)}>
              {event.event_type.replace('_', ' ')} Event
            </h5>
            <div className="flex items-center space-x-2">
              <Calendar className={clsx('text-neutral-500', styles.icon)} />
              <span className={clsx('text-neutral-600', styles.text)}>
                {formatDate(event.date)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={clsx('font-semibold', severityColor, styles.text)}>
            {event.severity_score}/100
          </div>
          <div className={clsx('text-neutral-500', styles.text)}>
            Severity
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="mb-3">
        <p className={clsx('text-neutral-700', styles.text)}>
          {event.description || `${event.event_type.replace('_', ' ')} event occurred`}
        </p>
      </div>

      {/* Impact Information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {event.damages.property_damage_usd && event.damages.property_damage_usd > 0 && (
            <div className="flex items-center space-x-1">
              <span className={clsx('text-neutral-500', styles.text)}>💰</span>
              <span className={clsx('text-neutral-700', styles.text)}>
                ${(event.damages.property_damage_usd / 1000).toFixed(0)}K
              </span>
            </div>
          )}
          
          {(event.damages.injuries > 0 || event.damages.fatalities > 0) && (
            <div className="flex items-center space-x-1">
              <AlertCircle className={clsx('text-red-500', styles.icon)} />
              <span className={clsx('text-neutral-700', styles.text)}>
                {event.damages.injuries + event.damages.fatalities} casualties
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <MapPin className={clsx('text-neutral-500', styles.icon)} />
          <span className={clsx('text-neutral-600', styles.text)}>
            {event.distance_km.toFixed(1)}km away
          </span>
        </div>
      </div>

      {/* Confidence Indicator */}
      <div className="mt-2 pt-2 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <span className={clsx('text-neutral-500', styles.text)}>
            Data Confidence
          </span>
          <div className={clsx(
            'px-2 py-1 rounded text-xs font-medium',
            event.confidence > 0.8 ? 'bg-green-100 text-green-800' :
            event.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          )}>
            {Math.round(event.confidence * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
WeatherEventCard.displayName = 'WeatherEventCard';
HistoricalWeatherTimeline.displayName = 'HistoricalWeatherTimeline';