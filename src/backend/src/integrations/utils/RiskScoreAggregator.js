/**
 * RiskScoreAggregator - Multi-source risk score calculation and aggregation
 * Combines data from multiple sources with confidence weighting
 * Provides standardized risk scores and risk level classifications
 */

const { EventEmitter } = require('events');

class RiskScoreAggregator extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Source reliability weights (0.0 - 1.0)
        this.sourceWeights = {
            'FEMA_NRI': 0.95,
            'FirstStreet': 0.90,
            'ClimateCheck': 0.85,
            'NOAA_CDO': 0.90,
            'USGS_Earthquake': 0.95,
            'CAL_FIRE': 0.88,
            'NIFC': 0.85,
            'NHC': 0.92,
            'NASA_POWER': 0.87,
            'Census_Data': 0.90
        };
        
        // Risk type configurations
        this.riskTypes = {
            flood_risk: {
                primarySources: ['FEMA_NRI', 'FirstStreet'],
                secondarySources: ['NOAA_CDO'],
                weight: 0.25,
                scalingFactor: 1.0
            },
            wildfire_risk: {
                primarySources: ['CAL_FIRE', 'NIFC', 'FEMA_NRI'],
                secondarySources: ['FirstStreet'],
                weight: 0.20,
                scalingFactor: 1.0
            },
            hurricane_risk: {
                primarySources: ['NHC', 'FEMA_NRI'],
                secondarySources: ['NOAA_CDO', 'FirstStreet'],
                weight: 0.20,
                scalingFactor: 1.0
            },
            earthquake_risk: {
                primarySources: ['USGS_Earthquake', 'FEMA_NRI'],
                secondarySources: [],
                weight: 0.15,
                scalingFactor: 1.0
            },
            heat_risk: {
                primarySources: ['NOAA_CDO', 'NASA_POWER'],
                secondarySources: ['FirstStreet', 'FEMA_NRI'],
                weight: 0.10,
                scalingFactor: 1.0
            },
            drought_risk: {
                primarySources: ['NOAA_CDO', 'FEMA_NRI'],
                secondarySources: ['NASA_POWER'],
                weight: 0.10,
                scalingFactor: 1.0
            }
        };
        
        // Risk level thresholds (0-100 scale)
        this.riskLevels = {
            very_low: { min: 0, max: 20, color: '#2E7D32', description: 'Very Low Risk' },
            low: { min: 21, max: 40, color: '#689F38', description: 'Low Risk' },
            moderate: { min: 41, max: 60, color: '#F57C00', description: 'Moderate Risk' },
            high: { min: 61, max: 80, color: '#E64A19', description: 'High Risk' },
            very_high: { min: 81, max: 100, color: '#C62828', description: 'Very High Risk' }
        };
        
        // Confidence score weights
        this.confidenceFactors = {
            dataRecency: 0.3,     // How recent is the data
            sourceReliability: 0.3, // Source track record
            dataCompleteness: 0.2,  // How complete is the dataset
            crossValidation: 0.2    // Agreement between sources
        };
        
        // Aggregation statistics
        this.stats = {
            totalAggregations: 0,
            successfulAggregations: 0,
            averageConfidence: 0,
            sourceUsageCount: {},
            averageProcessingTime: 0
        };
    }

    /**
     * Aggregate risk scores from multiple data sources
     */
    async aggregateRiskScores(propertyId, sourceData, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            console.log(`[${requestId}] Starting risk aggregation for property: ${propertyId}`);
            
            this.stats.totalAggregations++;
            
            // Validate and normalize input data
            const normalizedData = this._normalizeSourceData(sourceData);
            
            // Calculate individual risk scores for each risk type
            const riskScores = {};
            const confidenceScores = {};
            const sourceContributions = {};
            
            for (const [riskType, config] of Object.entries(this.riskTypes)) {
                const riskResult = await this._calculateRiskScore(
                    riskType, 
                    normalizedData, 
                    config, 
                    requestId
                );
                
                riskScores[riskType] = riskResult.score;
                confidenceScores[riskType] = riskResult.confidence;
                sourceContributions[riskType] = riskResult.sources;
            }
            
            // Calculate overall risk score
            const overallRisk = this._calculateOverallRiskScore(riskScores, confidenceScores);
            
            // Calculate overall confidence
            const overallConfidence = this._calculateOverallConfidence(confidenceScores, normalizedData);
            
            // Determine risk levels
            const riskLevels = this._determineRiskLevels(riskScores);
            const overallRiskLevel = this._determineRiskLevel(overallRisk.score);
            
            // Generate risk assessment
            const riskAssessment = {
                propertyId,
                assessmentDate: new Date().toISOString(),
                overallRisk: {
                    score: overallRisk.score,
                    level: overallRiskLevel,
                    confidence: overallConfidence.overall,
                    description: this.riskLevels[overallRiskLevel].description
                },
                riskBreakdown: this._buildRiskBreakdown(riskScores, confidenceScores, riskLevels),
                dataQuality: {
                    overallConfidence: overallConfidence.overall,
                    dataCompleteness: overallConfidence.completeness,
                    sourceReliability: overallConfidence.reliability,
                    lastUpdated: this._findMostRecentUpdate(normalizedData)
                },
                sourceContributions,
                metadata: {
                    aggregationVersion: '1.0',
                    processingTime: Date.now() - startTime,
                    sourcesUsed: Object.keys(normalizedData).length,
                    requestId
                }
            };
            
            const processingTime = Date.now() - startTime;
            this._updateStats(true, overallConfidence.overall, normalizedData, processingTime);
            
            this.emit('aggregationComplete', {
                requestId,
                propertyId,
                overallScore: overallRisk.score,
                confidence: overallConfidence.overall,
                processingTime,
                sourcesUsed: Object.keys(normalizedData)
            });
            
            console.log(`[${requestId}] Risk aggregation completed:`, {
                overallScore: overallRisk.score,
                confidence: overallConfidence.overall,
                processingTime: `${processingTime}ms`
            });
            
            return riskAssessment;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this._updateStats(false, 0, {}, processingTime);
            
            this.emit('aggregationError', {
                requestId,
                propertyId,
                error: error.message,
                processingTime
            });
            
            throw new Error(`Risk aggregation failed: ${error.message}`);
        }
    }

    /**
     * Calculate risk score for a specific risk type
     */
    async _calculateRiskScore(riskType, normalizedData, config, requestId) {
        const availableSources = Object.keys(normalizedData);
        const primarySources = config.primarySources.filter(s => availableSources.includes(s));
        const secondarySources = config.secondarySources.filter(s => availableSources.includes(s));
        
        if (primarySources.length === 0 && secondarySources.length === 0) {
            console.warn(`[${requestId}] No sources available for ${riskType}`);
            return {
                score: null,
                confidence: 0,
                sources: []
            };
        }
        
        const sourceScores = [];
        const usedSources = [];
        
        // Process primary sources
        for (const sourceId of primarySources) {
            const sourceData = normalizedData[sourceId];
            const riskData = sourceData.risks[riskType];
            
            if (riskData && riskData.score !== null && riskData.score !== undefined) {
                const weight = this.sourceWeights[sourceId] || 0.5;
                const recencyWeight = this._calculateRecencyWeight(sourceData.lastUpdated);
                
                sourceScores.push({
                    sourceId,
                    score: riskData.score,
                    weight: weight * recencyWeight,
                    confidence: riskData.confidence || 0.7,
                    isPrimary: true
                });
                
                usedSources.push({
                    sourceId,
                    score: riskData.score,
                    weight: weight * recencyWeight,
                    isPrimary: true
                });
            }
        }
        
        // Process secondary sources (with reduced weight)
        for (const sourceId of secondarySources) {
            const sourceData = normalizedData[sourceId];
            const riskData = sourceData.risks[riskType];
            
            if (riskData && riskData.score !== null && riskData.score !== undefined) {
                const baseWeight = this.sourceWeights[sourceId] || 0.5;
                const weight = baseWeight * 0.5; // Secondary sources get 50% weight
                const recencyWeight = this._calculateRecencyWeight(sourceData.lastUpdated);
                
                sourceScores.push({
                    sourceId,
                    score: riskData.score,
                    weight: weight * recencyWeight,
                    confidence: riskData.confidence || 0.6,
                    isPrimary: false
                });
                
                usedSources.push({
                    sourceId,
                    score: riskData.score,
                    weight: weight * recencyWeight,
                    isPrimary: false
                });
            }
        }
        
        if (sourceScores.length === 0) {
            return {
                score: null,
                confidence: 0,
                sources: []
            };
        }
        
        // Calculate weighted average score
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const scoreData of sourceScores) {
            weightedSum += scoreData.score * scoreData.weight;
            totalWeight += scoreData.weight;
        }
        
        const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        
        // Apply scaling factor
        const finalScore = Math.round(aggregatedScore * config.scalingFactor);
        
        // Calculate confidence based on source agreement and reliability
        const confidence = this._calculateRiskConfidence(sourceScores);
        
        return {
            score: Math.max(0, Math.min(100, finalScore)),
            confidence,
            sources: usedSources
        };
    }

    /**
     * Calculate overall risk score from individual risk scores
     */
    _calculateOverallRiskScore(riskScores, confidenceScores) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [riskType, score] of Object.entries(riskScores)) {
            if (score !== null && score !== undefined) {
                const config = this.riskTypes[riskType];
                const confidence = confidenceScores[riskType] || 0.5;
                const weight = config.weight * confidence;
                
                weightedSum += score * weight;
                totalWeight += weight;
            }
        }
        
        const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        
        return {
            score: Math.round(overallScore),
            method: 'weighted_average',
            totalWeight
        };
    }

    /**
     * Calculate overall confidence score
     */
    _calculateOverallConfidence(confidenceScores, normalizedData) {
        const confidenceValues = Object.values(confidenceScores).filter(c => c > 0);
        
        if (confidenceValues.length === 0) {
            return {
                overall: 0,
                completeness: 0,
                reliability: 0,
                recency: 0
            };
        }
        
        // Base confidence from average of individual confidences
        const baseConfidence = confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length;
        
        // Data completeness factor
        const expectedRiskTypes = Object.keys(this.riskTypes).length;
        const availableRiskTypes = confidenceValues.length;
        const completeness = availableRiskTypes / expectedRiskTypes;
        
        // Source reliability factor
        const sourceIds = Object.keys(normalizedData);
        const avgReliability = sourceIds.reduce((sum, id) => {
            return sum + (this.sourceWeights[id] || 0.5);
        }, 0) / sourceIds.length;
        
        // Data recency factor
        const recencyScores = sourceIds.map(id => {
            return this._calculateRecencyWeight(normalizedData[id].lastUpdated);
        });
        const avgRecency = recencyScores.reduce((sum, r) => sum + r, 0) / recencyScores.length;
        
        // Calculate overall confidence
        const overall = (
            baseConfidence * this.confidenceFactors.sourceReliability +
            completeness * this.confidenceFactors.dataCompleteness +
            avgReliability * this.confidenceFactors.sourceReliability +
            avgRecency * this.confidenceFactors.dataRecency
        );
        
        return {
            overall: Math.round(overall * 100) / 100,
            completeness: Math.round(completeness * 100) / 100,
            reliability: Math.round(avgReliability * 100) / 100,
            recency: Math.round(avgRecency * 100) / 100
        };
    }

    /**
     * Calculate confidence for individual risk assessment
     */
    _calculateRiskConfidence(sourceScores) {
        if (sourceScores.length === 0) return 0;
        
        // Base confidence from source reliability
        const avgConfidence = sourceScores.reduce((sum, s) => sum + s.confidence, 0) / sourceScores.length;
        
        // Agreement factor - how close are the scores
        if (sourceScores.length > 1) {
            const scores = sourceScores.map(s => s.score);
            const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
            const standardDev = Math.sqrt(variance);
            
            // Lower standard deviation = higher agreement = higher confidence
            const agreementFactor = Math.max(0, 1 - (standardDev / 50)); // Normalize to 0-1
            
            return Math.min(1, avgConfidence * 0.7 + agreementFactor * 0.3);
        }
        
        return avgConfidence;
    }

    /**
     * Normalize source data to standard format
     */
    _normalizeSourceData(sourceData) {
        const normalized = {};
        
        for (const [sourceId, data] of Object.entries(sourceData)) {
            normalized[sourceId] = {
                sourceId,
                lastUpdated: data.lastUpdated || data.timestamp || new Date().toISOString(),
                dataQuality: data.dataQuality || 0.8,
                risks: this._normalizeRiskData(data.risks || data.data || {}),
                metadata: data.metadata || {}
            };
        }
        
        return normalized;
    }

    /**
     * Normalize risk data from different source formats
     */
    _normalizeRiskData(risks) {
        const normalized = {};
        
        for (const [riskType, riskData] of Object.entries(risks)) {
            // Handle different data formats
            if (typeof riskData === 'number') {
                normalized[riskType] = {
                    score: riskData,
                    confidence: 0.7
                };
            } else if (typeof riskData === 'object' && riskData !== null) {
                normalized[riskType] = {
                    score: riskData.score || riskData.value || riskData.rating || 0,
                    confidence: riskData.confidence || riskData.quality || 0.7,
                    details: riskData.details || {}
                };
            }
        }
        
        return normalized;
    }

    /**
     * Calculate recency weight based on data age
     */
    _calculateRecencyWeight(lastUpdated) {
        if (!lastUpdated) return 0.5; // Default weight for unknown dates
        
        const updateDate = new Date(lastUpdated);
        const now = new Date();
        const daysSinceUpdate = (now - updateDate) / (1000 * 60 * 60 * 24);
        
        // Exponential decay: full weight for data < 30 days old
        if (daysSinceUpdate <= 30) return 1.0;
        if (daysSinceUpdate <= 90) return 0.9;
        if (daysSinceUpdate <= 180) return 0.8;
        if (daysSinceUpdate <= 365) return 0.7;
        
        return 0.5; // Minimum weight for very old data
    }

    /**
     * Determine risk levels for all risk types
     */
    _determineRiskLevels(riskScores) {
        const levels = {};
        
        for (const [riskType, score] of Object.entries(riskScores)) {
            if (score !== null && score !== undefined) {
                levels[riskType] = this._determineRiskLevel(score);
            } else {
                levels[riskType] = 'unknown';
            }
        }
        
        return levels;
    }

    /**
     * Determine risk level from score
     */
    _determineRiskLevel(score) {
        if (score === null || score === undefined) return 'unknown';
        
        for (const [level, range] of Object.entries(this.riskLevels)) {
            if (score >= range.min && score <= range.max) {
                return level;
            }
        }
        
        return 'unknown';
    }

    /**
     * Build detailed risk breakdown
     */
    _buildRiskBreakdown(riskScores, confidenceScores, riskLevels) {
        const breakdown = {};
        
        for (const [riskType, score] of Object.entries(riskScores)) {
            if (score !== null && score !== undefined) {
                const level = riskLevels[riskType];
                const config = this.riskTypes[riskType];
                
                breakdown[riskType] = {
                    score,
                    level,
                    confidence: confidenceScores[riskType] || 0,
                    weight: config.weight,
                    description: this.riskLevels[level]?.description || 'Unknown',
                    color: this.riskLevels[level]?.color || '#757575'
                };
            }
        }
        
        return breakdown;
    }

    /**
     * Find most recent data update
     */
    _findMostRecentUpdate(normalizedData) {
        let mostRecent = null;
        
        for (const sourceData of Object.values(normalizedData)) {
            const updateDate = new Date(sourceData.lastUpdated);
            if (!mostRecent || updateDate > mostRecent) {
                mostRecent = updateDate;
            }
        }
        
        return mostRecent ? mostRecent.toISOString() : new Date().toISOString();
    }

    /**
     * Update aggregation statistics
     */
    _updateStats(success, confidence, normalizedData, processingTime) {
        if (success) {
            this.stats.successfulAggregations++;
            
            // Update average confidence
            const totalSuccessful = this.stats.successfulAggregations;
            this.stats.averageConfidence = 
                (this.stats.averageConfidence * (totalSuccessful - 1) + confidence) / totalSuccessful;
        }
        
        // Update source usage counts
        for (const sourceId of Object.keys(normalizedData)) {
            this.stats.sourceUsageCount[sourceId] = (this.stats.sourceUsageCount[sourceId] || 0) + 1;
        }
        
        // Update average processing time
        const totalAggregations = this.stats.totalAggregations;
        this.stats.averageProcessingTime = 
            (this.stats.averageProcessingTime * (totalAggregations - 1) + processingTime) / totalAggregations;
    }

    /**
     * Generate unique request ID
     */
    _generateRequestId() {
        return `agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get aggregator statistics
     */
    getStats() {
        const successRate = this.stats.totalAggregations > 0 
            ? Math.round((this.stats.successfulAggregations / this.stats.totalAggregations) * 100) 
            : 0;
            
        return {
            ...this.stats,
            successRate,
            averageConfidence: Math.round(this.stats.averageConfidence * 100) / 100,
            averageProcessingTime: Math.round(this.stats.averageProcessingTime),
            mostUsedSources: this._getMostUsedSources()
        };
    }

    /**
     * Get most used sources
     */
    _getMostUsedSources() {
        const sorted = Object.entries(this.stats.sourceUsageCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
            
        return Object.fromEntries(sorted);
    }

    /**
     * Update source weights
     */
    updateSourceWeight(sourceId, weight) {
        if (weight >= 0 && weight <= 1) {
            this.sourceWeights[sourceId] = weight;
            console.log(`Updated source weight for ${sourceId}: ${weight}`);
        }
    }

    /**
     * Update risk type configuration
     */
    updateRiskTypeConfig(riskType, config) {
        if (this.riskTypes[riskType]) {
            Object.assign(this.riskTypes[riskType], config);
            console.log(`Updated configuration for ${riskType}:`, config);
        }
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalAggregations: 0,
            successfulAggregations: 0,
            averageConfidence: 0,
            sourceUsageCount: {},
            averageProcessingTime: 0
        };
    }
}

module.exports = RiskScoreAggregator;