// Weather Risk Integration Service
// Integrates NOAA weather data with existing Seawater risk assessment system

import { 
  Coordinates, 
  HazardType, 
  RiskAssessment, 
  HazardAssessment, 
  PropertyRiskData,
  NOAAWeatherContextSummary,
  RiskLevel
} from '../types';
import { 
  NOAAWeatherContext,
  ProcessedStormEvent,
  NOAAAlert,
  NOAAObservation,
  NOAAClimateNormals,
  LocationWeatherRisk,
  WeatherRiskRecommendation
} from '../types/noaa';
import { noaaDataClient, NOAAUtils } from './noaaDataClient';
import { seawaterApiClient } from './seawaterApiClient';

// Weather Risk Integration Service
export class WeatherRiskIntegrationService {
  
  /**
   * Enhances existing property risk assessment with NOAA weather context
   */
  async enhancePropertyRiskWithWeather(
    propertyRiskData: PropertyRiskData
  ): Promise<PropertyRiskData> {
    try {
      // Get comprehensive NOAA weather context
      const weatherContextResponse = await noaaDataClient.getComprehensiveWeatherContext(
        propertyRiskData.property.coordinates
      );

      if (!weatherContextResponse.success || !weatherContextResponse.data) {
        console.warn('Failed to get weather context, returning original risk data');
        return propertyRiskData;
      }

      const weatherContext = weatherContextResponse.data;
      
      // Enhance each hazard assessment with weather data
      const enhancedHazards = this.enhanceHazardAssessments(
        propertyRiskData.risk_assessment.hazards,
        weatherContext
      );

      // Calculate weather context summary
      const weatherContextSummary = this.createWeatherContextSummary(weatherContext);

      // Recalculate overall risk score with weather adjustments
      const weatherAdjustedOverallScore = this.calculateWeatherAdjustedOverallScore(
        enhancedHazards,
        weatherContext
      );

      const enhancedRiskAssessment: RiskAssessment = {
        ...propertyRiskData.risk_assessment,
        overall_score: weatherAdjustedOverallScore,
        risk_level: this.determineRiskLevel(weatherAdjustedOverallScore),
        hazards: enhancedHazards,
        weather_context: weatherContextSummary,
        confidence_score: this.calculateEnhancedConfidenceScore(
          propertyRiskData.risk_assessment.confidence_score,
          weatherContext.confidence_score
        ),
        last_updated: new Date().toISOString()
      };

      return {
        property: propertyRiskData.property,
        risk_assessment: enhancedRiskAssessment
      };

    } catch (error) {
      console.error('Error enhancing property risk with weather data:', error);
      return propertyRiskData;
    }
  }

  /**
   * Enhances individual hazard assessments with weather context
   */
  private enhanceHazardAssessments(
    originalHazards: RiskAssessment['hazards'],
    weatherContext: NOAAWeatherContext
  ): RiskAssessment['hazards'] {
    const enhancedHazards = { ...originalHazards };

    // Define hazard types that benefit from weather enhancement
    const weatherEnhancableHazards: HazardType[] = [
      'flood', 'wildfire', 'hurricane', 'tornado', 'heat', 'drought', 'hail',
      'cold_wave', 'ice_storm', 'lightning', 'strong_wind', 'winter_weather'
    ];

    weatherEnhancableHazards.forEach(hazardType => {
      const originalHazard = originalHazards[hazardType];
      if (originalHazard) {
        enhancedHazards[hazardType] = this.enhanceHazardWithWeather(
          originalHazard,
          hazardType,
          weatherContext
        );
      }
    });

    return enhancedHazards;
  }

  /**
   * Enhances a specific hazard assessment with weather data
   */
  private enhanceHazardWithWeather(
    originalHazard: HazardAssessment,
    hazardType: HazardType,
    weatherContext: NOAAWeatherContext
  ): HazardAssessment {
    
    // Calculate weather adjustment factors
    const adjustmentFactors = this.calculateWeatherAdjustmentFactors(
      hazardType,
      weatherContext
    );

    // Calculate weather-adjusted score
    const weatherAdjustedScore = this.applyWeatherAdjustments(
      originalHazard.score,
      adjustmentFactors
    );

    // Generate weather-enhanced recommendations
    const weatherRecommendations = this.generateWeatherRecommendations(
      hazardType,
      weatherContext,
      originalHazard.recommendations || []
    );

    return {
      ...originalHazard,
      weather_adjusted_score: weatherAdjustedScore,
      weather_adjustment_factors: adjustmentFactors,
      recommendations: weatherRecommendations
    };
  }

  /**
   * Calculates weather adjustment factors for a specific hazard
   */
  private calculateWeatherAdjustmentFactors(
    hazardType: HazardType,
    weatherContext: NOAAWeatherContext
  ): {
    historical_frequency: number;
    seasonal_factor: number;
    climate_trend: number;
    current_conditions: number;
  } {
    
    // Historical frequency factor based on NOAA storm events
    const historicalFrequency = this.calculateHistoricalFrequencyFactor(
      hazardType,
      weatherContext.data_sources.historical_events || []
    );

    // Seasonal factor based on current season and climate normals
    const seasonalFactor = this.calculateSeasonalFactor(
      hazardType,
      weatherContext.risk_adjustments.seasonal_factors
    );

    // Climate trend factor based on long-term climate data
    const climateTrend = this.calculateClimateTrendFactor(
      hazardType,
      weatherContext.risk_adjustments.climate_trends
    );

    // Current conditions factor based on active alerts and observations
    const currentConditions = this.calculateCurrentConditionsFactor(
      hazardType,
      weatherContext.data_sources.active_alerts || [],
      weatherContext.data_sources.recent_observations || []
    );

    return {
      historical_frequency: historicalFrequency,
      seasonal_factor: seasonalFactor,
      climate_trend: climateTrend,
      current_conditions: currentConditions
    };
  }

  /**
   * Calculates historical frequency factor from NOAA storm events
   */
  private calculateHistoricalFrequencyFactor(
    hazardType: HazardType,
    historicalEvents: ProcessedStormEvent[]
  ): number {
    const relevantEvents = historicalEvents.filter(event => event.event_type === hazardType);
    
    if (relevantEvents.length === 0) return 1.0;

    // Calculate frequency per year (assuming 20-year analysis period)
    const eventsPerYear = relevantEvents.length / 20;
    
    // Calculate severity weighted frequency
    const avgSeverity = relevantEvents.reduce((sum, event) => sum + event.severity_score, 0) / relevantEvents.length;
    
    // Return factor between 0.8 and 1.3 based on frequency and severity
    const baseFactor = Math.min(1.3, Math.max(0.8, 1.0 + (eventsPerYear * 0.1) + (avgSeverity / 1000)));
    
    return Number(baseFactor.toFixed(2));
  }

  /**
   * Calculates seasonal factor based on current season
   */
  private calculateSeasonalFactor(
    hazardType: HazardType,
    seasonalFactors: any
  ): number {
    if (!seasonalFactors || !seasonalFactors.season_risk_multipliers) {
      return 1.0;
    }

    return seasonalFactors.season_risk_multipliers[hazardType] || 1.0;
  }

  /**
   * Calculates climate trend factor based on long-term trends
   */
  private calculateClimateTrendFactor(
    hazardType: HazardType,
    climateTrends: any
  ): number {
    if (!climateTrends) return 1.0;

    // Map hazard types to climate trend indicators
    const trendMapping: Record<HazardType, number> = {
      heat: climateTrends.temperature_trend?.extreme_heat_days_trend || 0,
      drought: climateTrends.precipitation_trend?.drought_frequency_change || 0,
      flood: climateTrends.precipitation_trend?.extreme_precipitation_frequency_change || 0,
      wildfire: climateTrends.temperature_trend?.annual_change_per_decade || 0,
      hurricane: climateTrends.temperature_trend?.annual_change_per_decade || 0,
      tornado: 0, // No direct climate trend correlation
      hail: 0, // No direct climate trend correlation
      earthquake: 0, // Not weather-related
      avalanche: climateTrends.temperature_trend?.annual_change_per_decade || 0,
      coastal_flooding: climateTrends.precipitation_trend?.extreme_precipitation_frequency_change || 0,
      cold_wave: -(climateTrends.temperature_trend?.annual_change_per_decade || 0),
      ice_storm: -(climateTrends.temperature_trend?.annual_change_per_decade || 0),
      landslide: climateTrends.precipitation_trend?.extreme_precipitation_frequency_change || 0,
      lightning: climateTrends.precipitation_trend?.extreme_precipitation_frequency_change || 0,
      riverine_flooding: climateTrends.precipitation_trend?.extreme_precipitation_frequency_change || 0,
      strong_wind: 0,
      tsunami: 0, // Not weather-related
      volcanic_activity: 0, // Not weather-related
      winter_weather: -(climateTrends.temperature_trend?.annual_change_per_decade || 0)
    };

    const trendValue = trendMapping[hazardType] || 0;
    
    // Convert trend to factor (range 0.9 to 1.1)
    return Number((1.0 + (trendValue * 0.02)).toFixed(2));
  }

  /**
   * Calculates current conditions factor based on active alerts and observations
   */
  private calculateCurrentConditionsFactor(
    hazardType: HazardType,
    activeAlerts: NOAAAlert[],
    recentObservations: NOAAObservation[]
  ): number {
    let factor = 1.0;

    // Check for relevant active alerts
    const relevantAlerts = activeAlerts.filter(alert => 
      this.isAlertRelevantToHazard(alert, hazardType)
    );

    if (relevantAlerts.length > 0) {
      // Increase factor based on alert severity
      const maxSeverity = Math.max(...relevantAlerts.map(alert => {
        switch (alert.severity) {
          case 'Extreme': return 1.5;
          case 'Severe': return 1.3;
          case 'Moderate': return 1.2;
          case 'Minor': return 1.1;
          default: return 1.0;
        }
      }));
      factor = Math.max(factor, maxSeverity);
    }

    // Check recent observations for hazard-specific conditions
    if (recentObservations.length > 0) {
      const latestObs = recentObservations[0];
      factor *= this.getObservationAdjustmentFactor(hazardType, latestObs);
    }

    return Number(factor.toFixed(2));
  }

  /**
   * Determines if an alert is relevant to a specific hazard type
   */
  private isAlertRelevantToHazard(alert: NOAAAlert, hazardType: HazardType): boolean {
    const eventType = alert.event.toLowerCase();
    
    const relevanceMap: Record<HazardType, string[]> = {
      flood: ['flood', 'flash flood', 'urban flood'],
      wildfire: ['fire weather', 'red flag', 'wildfire'],
      hurricane: ['hurricane', 'tropical storm', 'tropical cyclone'],
      tornado: ['tornado'],
      heat: ['excessive heat', 'heat warning', 'heat advisory'],
      drought: ['drought'],
      hail: ['severe thunderstorm'],
      cold_wave: ['cold weather', 'freeze', 'hard freeze'],
      ice_storm: ['ice storm', 'freezing rain'],
      lightning: ['severe thunderstorm'],
      strong_wind: ['wind', 'high wind'],
      winter_weather: ['winter weather', 'winter storm', 'blizzard', 'ice storm'],
      // Add other hazard mappings as needed
      earthquake: [],
      avalanche: ['avalanche'],
      coastal_flooding: ['coastal flood'],
      landslide: [],
      riverine_flooding: ['river flood'],
      tsunami: ['tsunami'],
      volcanic_activity: []
    };

    const relevantTerms = relevanceMap[hazardType] || [];
    return relevantTerms.some(term => eventType.includes(term));
  }

  /**
   * Gets observation-based adjustment factor for specific hazards
   */
  private getObservationAdjustmentFactor(hazardType: HazardType, observation: NOAAObservation): number {
    switch (hazardType) {
      case 'heat':
        if (observation.temperature?.value && observation.temperature.value > 35) { // 95°F
          return 1.2;
        }
        break;
      case 'cold_wave':
        if (observation.temperature?.value && observation.temperature.value < -18) { // 0°F
          return 1.2;
        }
        break;
      case 'strong_wind':
        if (observation.windSpeed?.value && observation.windSpeed.value > 15) { // 30+ mph
          return 1.15;
        }
        break;
      case 'drought':
        if (observation.relativeHumidity?.value && observation.relativeHumidity.value < 30) {
          return 1.1;
        }
        break;
    }
    return 1.0;
  }

  /**
   * Applies weather adjustments to original risk score
   */
  private applyWeatherAdjustments(
    originalScore: number,
    adjustmentFactors: {
      historical_frequency: number;
      seasonal_factor: number;
      climate_trend: number;
      current_conditions: number;
    }
  ): number {
    // Weight the different factors
    const weights = {
      historical_frequency: 0.3,
      seasonal_factor: 0.25,
      climate_trend: 0.25,
      current_conditions: 0.2
    };

    // Calculate weighted adjustment
    const weightedAdjustment = 
      (adjustmentFactors.historical_frequency * weights.historical_frequency) +
      (adjustmentFactors.seasonal_factor * weights.seasonal_factor) +
      (adjustmentFactors.climate_trend * weights.climate_trend) +
      (adjustmentFactors.current_conditions * weights.current_conditions);

    // Apply adjustment to original score
    const adjustedScore = originalScore * weightedAdjustment;

    // Ensure score stays within 0-100 range
    return Math.min(100, Math.max(0, Math.round(adjustedScore)));
  }

  /**
   * Generates weather-enhanced recommendations
   */
  private generateWeatherRecommendations(
    hazardType: HazardType,
    weatherContext: NOAAWeatherContext,
    originalRecommendations: string[]
  ): string[] {
    const weatherRecommendations = [...originalRecommendations];
    
    // Add weather-specific recommendations based on active alerts
    const activeAlerts = weatherContext.data_sources.active_alerts || [];
    const relevantAlerts = activeAlerts.filter(alert => 
      this.isAlertRelevantToHazard(alert, hazardType)
    );

    if (relevantAlerts.length > 0) {
      weatherRecommendations.push(`Monitor active weather alerts: ${relevantAlerts.length} alert(s) in effect`);
    }

    // Add seasonal recommendations
    const currentSeason = weatherContext.risk_adjustments.seasonal_factors.current_season;
    const seasonalRec = this.getSeasonalRecommendation(hazardType, currentSeason);
    if (seasonalRec) {
      weatherRecommendations.push(seasonalRec);
    }

    // Add historical context recommendations
    const historicalEvents = weatherContext.data_sources.historical_events || [];
    const recentEvents = historicalEvents.filter(event => 
      event.event_type === hazardType && 
      new Date(event.date) > new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) // Last 5 years
    );

    if (recentEvents.length > 2) {
      weatherRecommendations.push(
        `Historical data shows ${recentEvents.length} ${hazardType} events in the last 5 years - consider enhanced preparedness measures`
      );
    }

    return weatherRecommendations;
  }

  /**
   * Gets seasonal recommendation for a hazard type
   */
  private getSeasonalRecommendation(hazardType: HazardType, season: string): string | null {
    const seasonalRecommendations: Record<string, Record<HazardType, string>> = {
      spring: {
        flood: 'Spring is peak flood season - review flood emergency plans and insurance coverage',
        tornado: 'Spring tornado season - ensure you have a safety plan and emergency kit ready',
        hail: 'Spring severe weather season - protect vehicles and outdoor property',
        wildfire: 'Early wildfire season - clear defensible space around property',
        heat: '', drought: '', hurricane: '', earthquake: '',
        avalanche: '', coastal_flooding: '', cold_wave: '', ice_storm: '', 
        landslide: '', lightning: '', riverine_flooding: '', strong_wind: '', 
        tsunami: '', volcanic_activity: '', winter_weather: ''
      },
      summer: {
        heat: 'Peak heat season - ensure adequate cooling systems and heat emergency plans',
        wildfire: 'Peak wildfire season - maintain defensible space and evacuation readiness',
        drought: 'Summer dry season - monitor water restrictions and fire danger levels',
        hurricane: 'Hurricane season is active - review evacuation plans and emergency supplies',
        lightning: 'Peak thunderstorm season - review lightning safety procedures',
        flood: '', tornado: '', hail: '', earthquake: '',
        avalanche: '', coastal_flooding: '', cold_wave: '', ice_storm: '', 
        landslide: '', riverine_flooding: '', strong_wind: '', 
        tsunami: '', volcanic_activity: '', winter_weather: ''
      },
      fall: {
        hurricane: 'Late hurricane season - remain vigilant for tropical systems',
        wildfire: 'Extended wildfire season in many areas - maintain fire safety measures',
        strong_wind: 'Fall wind season - secure outdoor items and check tree health',
        flood: '', tornado: '', hail: '', heat: '', drought: '', earthquake: '',
        avalanche: '', coastal_flooding: '', cold_wave: '', ice_storm: '', 
        landslide: '', lightning: '', riverine_flooding: '', 
        tsunami: '', volcanic_activity: '', winter_weather: ''
      },
      winter: {
        cold_wave: 'Winter cold season - ensure heating systems are functional and pipes are protected',
        ice_storm: 'Ice storm season - prepare for power outages and travel disruptions',
        winter_weather: 'Winter weather season - maintain emergency supplies and heating fuel',
        avalanche: 'Winter avalanche season - check local avalanche forecasts if in mountainous areas',
        flood: '', tornado: '', hail: '', heat: '', drought: '', hurricane: '', earthquake: '',
        coastal_flooding: '', landslide: '', lightning: '', riverine_flooding: '', strong_wind: '', 
        tsunami: '', volcanic_activity: '', wildfire: ''
      }
    };

    return seasonalRecommendations[season]?.[hazardType] || null;
  }

  /**
   * Creates weather context summary for risk assessment
   */
  private createWeatherContextSummary(weatherContext: NOAAWeatherContext): NOAAWeatherContextSummary {
    const activeAlerts = weatherContext.data_sources.active_alerts || [];
    const historicalEvents = weatherContext.data_sources.historical_events || [];
    
    // Determine climate trends
    const tempTrend = weatherContext.risk_adjustments.climate_trends.temperature_trend.annual_change_per_decade;
    const precipTrend = weatherContext.risk_adjustments.climate_trends.precipitation_trend.annual_change_per_decade;
    const extremeTrend = weatherContext.risk_adjustments.climate_trends.precipitation_trend.extreme_precipitation_frequency_change;

    // Get elevated hazards for current season
    const seasonalFactors = weatherContext.risk_adjustments.seasonal_factors;
    const elevatedHazards: HazardType[] = Object.entries(seasonalFactors.season_risk_multipliers)
      .filter(([_, multiplier]) => multiplier > 1.1)
      .map(([hazard, _]) => hazard as HazardType);

    return {
      has_weather_data: true,
      active_alerts_count: activeAlerts.length,
      historical_events_count: historicalEvents.length,
      climate_risk_factors: {
        temperature_trend: tempTrend > 0.1 ? 'increasing' : tempTrend < -0.1 ? 'decreasing' : 'stable',
        precipitation_trend: precipTrend > 0.05 ? 'increasing' : precipTrend < -0.05 ? 'decreasing' : 'stable',
        extreme_weather_frequency: extremeTrend > 0.02 ? 'increasing' : extremeTrend < -0.02 ? 'decreasing' : 'stable'
      },
      seasonal_risk_elevation: {
        current_season: seasonalFactors.current_season,
        elevated_hazards: elevatedHazards,
        risk_multiplier: Math.max(...Object.values(seasonalFactors.season_risk_multipliers))
      },
      weather_confidence_score: weatherContext.confidence_score,
      last_weather_update: weatherContext.last_updated,
      significant_weather_insights: this.generateWeatherInsights(weatherContext)
    };
  }

  /**
   * Generates significant weather insights from context
   */
  private generateWeatherInsights(weatherContext: NOAAWeatherContext): string[] {
    const insights: string[] = [];
    
    const activeAlerts = weatherContext.data_sources.active_alerts || [];
    const historicalEvents = weatherContext.data_sources.historical_events || [];
    
    // Active alerts insights
    if (activeAlerts.length > 0) {
      const severeAlerts = activeAlerts.filter(alert => 
        alert.severity === 'Extreme' || alert.severity === 'Severe'
      );
      if (severeAlerts.length > 0) {
        insights.push(`${severeAlerts.length} severe weather alert(s) currently active`);
      }
    }

    // Historical frequency insights
    const recentYears = 5;
    const recentEvents = historicalEvents.filter(event => 
      new Date(event.date) > new Date(Date.now() - recentYears * 365 * 24 * 60 * 60 * 1000)
    );
    
    if (recentEvents.length > 10) {
      insights.push(`High weather event frequency: ${recentEvents.length} events in last ${recentYears} years`);
    }

    // Climate trend insights
    const climateTrends = weatherContext.risk_adjustments.climate_trends;
    if (climateTrends.temperature_trend.extreme_heat_days_trend > 2) {
      insights.push('Increasing trend in extreme heat days');
    }
    
    if (climateTrends.precipitation_trend.extreme_precipitation_frequency_change > 0.05) {
      insights.push('Increasing frequency of extreme precipitation events');
    }

    // Seasonal insights
    const seasonalFactors = weatherContext.risk_adjustments.seasonal_factors;
    const highSeasonalRisks = Object.entries(seasonalFactors.season_risk_multipliers)
      .filter(([_, multiplier]) => multiplier > 1.2)
      .map(([hazard, _]) => hazard);
    
    if (highSeasonalRisks.length > 0) {
      insights.push(`Current season elevates risk for: ${highSeasonalRisks.join(', ')}`);
    }

    return insights;
  }

  /**
   * Calculates weather-adjusted overall risk score
   */
  private calculateWeatherAdjustedOverallScore(
    enhancedHazards: RiskAssessment['hazards'],
    weatherContext: NOAAWeatherContext
  ): number {
    const hazardScores: number[] = [];
    
    Object.values(enhancedHazards).forEach(hazard => {
      if (hazard) {
        // Use weather-adjusted score if available, otherwise use original
        const score = hazard.weather_adjusted_score || hazard.score;
        hazardScores.push(score);
      }
    });

    if (hazardScores.length === 0) return 0;

    // Calculate weighted average with some hazards having higher weight
    const averageScore = hazardScores.reduce((sum, score) => sum + score, 0) / hazardScores.length;
    
    // Apply overall weather confidence adjustment
    const confidenceAdjustment = 0.95 + (weatherContext.confidence_score * 0.1);
    
    return Math.min(100, Math.max(0, Math.round(averageScore * confidenceAdjustment)));
  }

  /**
   * Determines risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'EXTREME';
    if (score >= 60) return 'VERY_HIGH';
    if (score >= 40) return 'HIGH';
    if (score >= 20) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Calculates enhanced confidence score
   */
  private calculateEnhancedConfidenceScore(
    originalConfidence: number,
    weatherConfidence: number
  ): number {
    // Weighted average favoring original confidence but enhanced by weather data
    return Number(((originalConfidence * 0.7) + (weatherConfidence * 0.3)).toFixed(2));
  }

  /**
   * Gets weather-enhanced risk assessment for a property
   */
  async getWeatherEnhancedPropertyRisk(
    address: string,
    coordinates: Coordinates
  ): Promise<LocationWeatherRisk | null> {
    try {
      // Get base risk assessment from Seawater API
      const riskResponse = await seawaterApiClient.assessPropertyRisk({
        address: address
      });

      if (!riskResponse.success || !riskResponse.data) {
        console.error('Failed to get base risk assessment');
        return null;
      }

      // Enhance with weather data
      const enhancedRiskData = await this.enhancePropertyRiskWithWeather(riskResponse.data);
      
      // Get comprehensive weather context
      const weatherContextResponse = await noaaDataClient.getComprehensiveWeatherContext(coordinates);
      
      if (!weatherContextResponse.success || !weatherContextResponse.data) {
        console.error('Failed to get weather context');
        return null;
      }

      // Create enhanced risk scores object
      const enhancedRiskScores: LocationWeatherRisk['enhanced_risk_scores'] = {};
      
      Object.entries(enhancedRiskData.risk_assessment.hazards).forEach(([hazardType, hazardData]) => {
        if (hazardData) {
          enhancedRiskScores[hazardType as HazardType] = {
            base_score: hazardData.score,
            weather_adjusted_score: hazardData.weather_adjusted_score || hazardData.score,
            adjustment_factors: {
              historical_frequency: hazardData.weather_adjustment_factors?.historical_frequency ?? 1.0,
              seasonal_factor: hazardData.weather_adjustment_factors?.seasonal_factor ?? 1.0,
              climate_trend: hazardData.weather_adjustment_factors?.climate_trend ?? 1.0,
              current_conditions: hazardData.weather_adjustment_factors?.current_conditions ?? 1.0
            },
            confidence: hazardData.confidence || 0.8
          };
        }
      });

      // Generate recommendations
      const recommendations = this.generateLocationRecommendations(
        enhancedRiskData,
        weatherContextResponse.data
      );

      return {
        coordinates,
        address,
        noaa_context: weatherContextResponse.data,
        enhanced_risk_scores: enhancedRiskScores,
        recommendations
      };

    } catch (error) {
      console.error('Error getting weather-enhanced property risk:', error);
      return null;
    }
  }

  /**
   * Generates location-specific weather risk recommendations
   */
  private generateLocationRecommendations(
    riskData: PropertyRiskData,
    weatherContext: NOAAWeatherContext
  ): WeatherRiskRecommendation[] {
    const recommendations: WeatherRiskRecommendation[] = [];
    
    // Get top 3 hazards by weather-adjusted score
    const topHazards = Object.entries(riskData.risk_assessment.hazards)
      .filter(([_, hazard]) => hazard)
      .map(([type, hazard]) => ({
        type: type as HazardType,
        score: hazard!.weather_adjusted_score || hazard!.score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Generate recommendations for top hazards
    topHazards.forEach(hazard => {
      const hazardRecs = this.getHazardSpecificRecommendations(hazard.type, hazard.score, weatherContext);
      recommendations.push(...hazardRecs);
    });

    // Add seasonal recommendations
    const seasonalRecs = this.getSeasonalRecommendationsForLocation(weatherContext);
    recommendations.push(...seasonalRecs);

    // Add current conditions recommendations
    const currentRecs = this.getCurrentConditionsRecommendations(weatherContext);
    recommendations.push(...currentRecs);

    return recommendations;
  }

  /**
   * Gets hazard-specific recommendations
   */
  private getHazardSpecificRecommendations(
    hazardType: HazardType,
    score: number,
    weatherContext: NOAAWeatherContext
  ): WeatherRiskRecommendation[] {
    const recommendations: WeatherRiskRecommendation[] = [];
    const priority: 'high' | 'medium' | 'low' = score > 60 ? 'high' : score > 30 ? 'medium' : 'low';

    const hazardRecommendations: Record<HazardType, string[]> = {
      flood: [
        'Consider flood insurance if not already covered',
        'Maintain emergency evacuation plan and supplies',
        'Install flood sensors and sump pump systems'
      ],
      wildfire: [
        'Create and maintain defensible space around property',
        'Install fire-resistant landscaping and building materials',
        'Develop evacuation plan and emergency communication strategy'
      ],
      hurricane: [
        'Secure outdoor furniture and equipment seasonally',
        'Install storm shutters or impact-resistant windows',
        'Maintain emergency supplies for extended outages'
      ],
      tornado: [
        'Identify safe room or shelter area in your home',
        'Install weather radio with battery backup',
        'Practice tornado safety drills with family'
      ],
      heat: [
        'Ensure adequate cooling systems and backup power',
        'Identify cooling centers in your community',
        'Prepare for power outages during heat waves'
      ],
      drought: [
        'Install water-efficient landscaping and irrigation',
        'Maintain emergency water storage',
        'Monitor local water restrictions and fire danger'
      ],
      hail: [
        'Consider impact-resistant roofing materials',
        'Protect vehicles during severe weather warnings',
        'Document property for insurance purposes'
      ],
      // Add other hazard types as needed
      earthquake: [],
      avalanche: [],
      coastal_flooding: [],
      cold_wave: [],
      ice_storm: [],
      landslide: [],
      lightning: [],
      riverine_flooding: [],
      strong_wind: [],
      tsunami: [],
      volcanic_activity: [],
      winter_weather: []
    };

    const recTexts = hazardRecommendations[hazardType] || [];
    recTexts.forEach(text => {
      recommendations.push({
        hazard_type: hazardType,
        recommendation_type: 'preparation',
        priority,
        description: text,
        timeframe: score > 60 ? 'immediate' : 'seasonal',
        effectiveness_score: 0.8
      });
    });

    return recommendations;
  }

  /**
   * Gets seasonal recommendations for location
   */
  private getSeasonalRecommendationsForLocation(
    weatherContext: NOAAWeatherContext
  ): WeatherRiskRecommendation[] {
    const recommendations: WeatherRiskRecommendation[] = [];
    const currentSeason = weatherContext.risk_adjustments.seasonal_factors.current_season;
    
    // Season-specific recommendations
    const seasonalActions: Record<string, string[]> = {
      spring: [
        'Review and update emergency preparedness plans',
        'Check and test sump pumps and drainage systems',
        'Trim trees and secure outdoor items before storm season'
      ],
      summer: [
        'Service air conditioning systems before peak heat',
        'Clear vegetation and maintain defensible space',
        'Stock emergency supplies for hurricane/wildfire season'
      ],
      fall: [
        'Winterize outdoor plumbing and equipment',
        'Clean gutters and check roof for winter readiness',
        'Update emergency heating and power backup plans'
      ],
      winter: [
        'Monitor heating systems and backup power',
        'Keep emergency supplies for winter storms',
        'Check insulation and seal air leaks'
      ]
    };

    const actions = seasonalActions[currentSeason] || [];
    actions.forEach(action => {
      recommendations.push({
        hazard_type: 'flood', // Default hazard type for seasonal prep
        recommendation_type: 'preparation',
        priority: 'medium',
        description: action,
        timeframe: 'seasonal',
        effectiveness_score: 0.7
      });
    });

    return recommendations;
  }

  /**
   * Gets current conditions recommendations
   */
  private getCurrentConditionsRecommendations(
    weatherContext: NOAAWeatherContext
  ): WeatherRiskRecommendation[] {
    const recommendations: WeatherRiskRecommendation[] = [];
    const activeAlerts = weatherContext.data_sources.active_alerts || [];

    activeAlerts.forEach(alert => {
      if (alert.severity === 'Extreme' || alert.severity === 'Severe') {
        recommendations.push({
          hazard_type: NOAAUtils.convertEventTypeToHazard(alert.event) || 'flood',
          recommendation_type: 'monitoring',
          priority: 'high',
          description: `Monitor active ${alert.event} - ${alert.headline}`,
          timeframe: 'immediate',
          effectiveness_score: 0.9
        });
      }
    });

    return recommendations;
  }
}

// Export singleton instance
export const weatherRiskIntegration = new WeatherRiskIntegrationService();

// Export utility functions
export const WeatherRiskUtils = {
  /**
   * Quick weather risk check for a property
   */
  async quickWeatherRiskCheck(coordinates: Coordinates): Promise<{
    hasActiveAlerts: boolean;
    alertCount: number;
    riskFactors: string[];
  }> {
    try {
      const alertsResponse = await noaaDataClient.getActiveAlerts(coordinates);
      const alerts = alertsResponse.data || [];
      
      const riskFactors: string[] = [];
      
      alerts.forEach(alert => {
        if (alert.severity === 'Extreme' || alert.severity === 'Severe') {
          riskFactors.push(`Active ${alert.event} alert`);
        }
      });

      return {
        hasActiveAlerts: alerts.length > 0,
        alertCount: alerts.length,
        riskFactors
      };
    } catch (error) {
      console.error('Error in quick weather risk check:', error);
      return {
        hasActiveAlerts: false,
        alertCount: 0,
        riskFactors: []
      };
    }
  }
};