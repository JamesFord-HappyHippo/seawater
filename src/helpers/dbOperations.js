// dbOperations.js - Seawater Climate Risk Platform
// PostgreSQL + PostGIS operations with connection pooling
// Following Tim-Combo proven patterns

const { getClient } = require('./dbClient');
const { normalizeObjectKeys } = require('./eventParser');
const { DatabaseError } = require('./errorHandler');

/**
 * Execute a database query with standardized parameter handling
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {Object} Query result with rows and rowCount
 */
async function executeQuery(query, params = []) {
    try {
        const client = await getClient();
        
        // Log query for debugging
        console.log({
            type: 'db_query',
            timestamp: new Date().toISOString(),
            query: query.replace(/\s+/g, ' ').trim(),
            paramCount: params.length,
            platform: 'seawater-climate-risk'
        });
        
        const result = await client.query(query, params);
        
        // Log query result
        console.log({
            type: 'db_result',
            timestamp: new Date().toISOString(),
            rowCount: result.rowCount,
            success: true,
            platform: 'seawater-climate-risk'
        });
        
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        
        // Log query error
        console.error({
            type: 'db_error',
            timestamp: new Date().toISOString(),
            error: {
                code: error.code,
                message: error.message,
                detail: error.detail,
                constraint: error.constraint
            },
            query: query.replace(/\s+/g, ' ').trim(),
            platform: 'seawater-climate-risk'
        });
        
        throw new DatabaseError(
            error.message || 'Database query failed',
            error.code,
            error.constraint
        );
    }
}

/**
 * Execute a database query with named parameters
 * @param {string} query - SQL query with :param_name placeholders
 * @param {Object} params - Object containing named parameters
 * @returns {Object} Query result with rows and rowCount
 */
async function executeQueryWithNamedParams(query, params = {}) {
    try {
        // Normalize parameter names
        const normalizedParams = normalizeObjectKeys(params);
        
        // Convert object params to array params based on $1, $2, etc. in query
        const paramNames = Object.keys(normalizedParams);
        const paramValues = [];
        
        // Replace :param_name with $1, $2, etc.
        let processedQuery = query;
        paramNames.forEach((name, index) => {
            const paramRegex = new RegExp(`:${name}\\b`, 'g');
            processedQuery = processedQuery.replace(paramRegex, `$${index + 1}`);
            paramValues.push(normalizedParams[name]);
        });
        
        return executeQuery(processedQuery, paramValues);
    } catch (error) {
        console.error('Error in executeQueryWithNamedParams:', error);
        throw error;
    }
}

/**
 * Property-specific database operations
 */

/**
 * Find property by address with geocoding fallback
 * @param {string} address - Property address to search
 * @param {Object} options - Search options (exact, fuzzy, etc.)
 * @returns {Object} Property data or null
 */
async function findPropertyByAddress(address, options = {}) {
    try {
        const normalizedAddress = address.toLowerCase().trim();
        
        // Try exact match first
        const exactQuery = `
            SELECT id, address, normalized_address, latitude, longitude, 
                   ST_AsGeoJSON(location) as location_geojson,
                   city, state, zip_code, county, fips_code,
                   property_type, year_built, square_feet,
                   geocoding_accuracy, verification_status,
                   created_at, updated_at, last_assessed
            FROM properties 
            WHERE normalized_address = $1
            LIMIT 1;
        `;
        
        let result = await executeQuery(exactQuery, [normalizedAddress]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        
        // If no exact match and fuzzy search is enabled
        if (options.fuzzy !== false) {
            const fuzzyQuery = `
                SELECT id, address, normalized_address, latitude, longitude,
                       ST_AsGeoJSON(location) as location_geojson,
                       city, state, zip_code, county, fips_code,
                       property_type, year_built, square_feet,
                       geocoding_accuracy, verification_status,
                       created_at, updated_at, last_assessed,
                       similarity(normalized_address, $1) as similarity_score
                FROM properties 
                WHERE similarity(normalized_address, $1) > 0.3
                ORDER BY similarity_score DESC
                LIMIT 1;
            `;
            
            result = await executeQuery(fuzzyQuery, [normalizedAddress]);
            
            if (result.rows.length > 0) {
                return result.rows[0];
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error finding property by address:', error);
        throw error;
    }
}

/**
 * Create or update property record
 * @param {Object} propertyData - Property information
 * @returns {Object} Created/updated property
 */
async function upsertProperty(propertyData) {
    try {
        const {
            address,
            normalizedAddress,
            streetNumber,
            streetName,
            city,
            state,
            zipCode,
            plus4,
            county,
            fipsCode,
            latitude,
            longitude,
            elevation,
            propertyType,
            yearBuilt,
            squareFeet,
            bedrooms,
            bathrooms,
            geocodingAccuracy,
            geocodingSource
        } = propertyData;

        const upsertQuery = `
            INSERT INTO properties (
                address, normalized_address, street_number, street_name,
                city, state, zip_code, plus4, county, fips_code,
                latitude, longitude, location, elevation_meters,
                property_type, year_built, square_feet, bedrooms, bathrooms,
                geocoding_accuracy, geocoding_source, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, ST_SetSRID(ST_MakePoint($12, $11), 4326), $13,
                $14, $15, $16, $17, $18, $19, $20, NOW()
            )
            ON CONFLICT (normalized_address) 
            DO UPDATE SET
                address = EXCLUDED.address,
                street_number = EXCLUDED.street_number,
                street_name = EXCLUDED.street_name,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                zip_code = EXCLUDED.zip_code,
                plus4 = EXCLUDED.plus4,
                county = EXCLUDED.county,
                fips_code = EXCLUDED.fips_code,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                location = EXCLUDED.location,
                elevation_meters = EXCLUDED.elevation_meters,
                property_type = EXCLUDED.property_type,
                year_built = EXCLUDED.year_built,
                square_feet = EXCLUDED.square_feet,
                bedrooms = EXCLUDED.bedrooms,
                bathrooms = EXCLUDED.bathrooms,
                geocoding_accuracy = EXCLUDED.geocoding_accuracy,
                geocoding_source = EXCLUDED.geocoding_source,
                updated_at = NOW()
            RETURNING *;
        `;

        const params = [
            address,
            normalizedAddress,
            streetNumber,
            streetName,
            city,
            state,
            zipCode,
            plus4,
            county,
            fipsCode,
            latitude,
            longitude,
            elevation,
            propertyType,
            yearBuilt,
            squareFeet,
            bedrooms,
            bathrooms,
            geocodingAccuracy,
            geocodingSource
        ];

        const result = await executeQuery(upsertQuery, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error upserting property:', error);
        throw error;
    }
}

/**
 * Find properties within geographic radius
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radiusMeters - Search radius in meters
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of properties within radius
 */
async function findPropertiesWithinRadius(latitude, longitude, radiusMeters, filters = {}) {
    try {
        let whereClause = '';
        let params = [longitude, latitude, radiusMeters];
        let paramIndex = 4;

        // Add optional filters
        if (filters.riskThreshold) {
            whereClause += ` AND cra.overall_risk_score >= $${paramIndex}`;
            params.push(filters.riskThreshold);
            paramIndex++;
        }

        if (filters.propertyType) {
            whereClause += ` AND p.property_type = $${paramIndex}`;
            params.push(filters.propertyType);
            paramIndex++;
        }

        if (filters.state) {
            whereClause += ` AND p.state = $${paramIndex}`;
            params.push(filters.state);
            paramIndex++;
        }

        const spatialQuery = `
            SELECT 
                p.id,
                p.address,
                p.normalized_address,
                p.latitude,
                p.longitude,
                p.city,
                p.state,
                p.zip_code,
                p.property_type,
                cra.overall_risk_score,
                cra.flood_risk_score,
                cra.wildfire_risk_score,
                cra.hurricane_risk_score,
                cra.earthquake_risk_score,
                ST_Distance(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as distance_meters
            FROM properties p
            LEFT JOIN climate_risk_assessments cra ON p.id = cra.property_id 
                AND cra.expires_at > NOW()
            WHERE ST_DWithin(
                p.location, 
                ST_SetSRID(ST_MakePoint($1, $2), 4326), 
                $3
            )
            ${whereClause}
            ORDER BY distance_meters
            LIMIT ${filters.limit || 100};
        `;

        const result = await executeQuery(spatialQuery, params);
        return result.rows;
    } catch (error) {
        console.error('Error finding properties within radius:', error);
        throw error;
    }
}

/**
 * Climate risk assessment operations
 */

/**
 * Get current climate risk assessment for property
 * @param {string} propertyId - Property UUID
 * @returns {Object} Current risk assessment or null
 */
async function getCurrentRiskAssessment(propertyId) {
    try {
        const query = `
            SELECT 
                id,
                property_id,
                assessment_date,
                overall_risk_score,
                risk_category,
                flood_risk_score,
                wildfire_risk_score,
                hurricane_risk_score,
                tornado_risk_score,
                earthquake_risk_score,
                heat_risk_score,
                drought_risk_score,
                hail_risk_score,
                fema_flood_zone,
                fema_risk_rating,
                fema_community_rating,
                confidence_score,
                data_completeness,
                assessment_version,
                expires_at,
                created_at,
                updated_at
            FROM climate_risk_assessments
            WHERE property_id = $1 
              AND expires_at > NOW()
            ORDER BY assessment_date DESC
            LIMIT 1;
        `;

        const result = await executeQuery(query, [propertyId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting current risk assessment:', error);
        throw error;
    }
}

/**
 * Create or update climate risk assessment
 * @param {Object} assessmentData - Risk assessment data
 * @returns {Object} Created/updated assessment
 */
async function upsertRiskAssessment(assessmentData) {
    try {
        const {
            propertyId,
            overallRiskScore,
            riskCategory,
            floodRiskScore,
            wildfireRiskScore,
            hurricaneRiskScore,
            tornadoRiskScore,
            earthquakeRiskScore,
            heatRiskScore,
            droughtRiskScore,
            hailRiskScore,
            femaFloodZone,
            femaRiskRating,
            femaCommunityRating,
            confidenceScore,
            dataCompleteness,
            assessmentVersion,
            expiresAt
        } = assessmentData;

        // First, expire any existing current assessments
        await executeQuery(
            'UPDATE climate_risk_assessments SET expires_at = NOW() WHERE property_id = $1 AND expires_at > NOW()',
            [propertyId]
        );

        // Insert new assessment
        const insertQuery = `
            INSERT INTO climate_risk_assessments (
                property_id, overall_risk_score, risk_category,
                flood_risk_score, wildfire_risk_score, hurricane_risk_score,
                tornado_risk_score, earthquake_risk_score, heat_risk_score,
                drought_risk_score, hail_risk_score,
                fema_flood_zone, fema_risk_rating, fema_community_rating,
                confidence_score, data_completeness, assessment_version,
                expires_at, assessment_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, NOW()
            )
            RETURNING *;
        `;

        const params = [
            propertyId,
            overallRiskScore,
            riskCategory,
            floodRiskScore,
            wildfireRiskScore,
            hurricaneRiskScore,
            tornadoRiskScore,
            earthquakeRiskScore,
            heatRiskScore,
            droughtRiskScore,
            hailRiskScore,
            femaFloodZone,
            femaRiskRating,
            femaCommunityRating,
            confidenceScore,
            dataCompleteness,
            assessmentVersion,
            expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
        ];

        const result = await executeQuery(insertQuery, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error upserting risk assessment:', error);
        throw error;
    }
}

/**
 * Store external API response data
 * @param {Object} responseData - API response data
 * @returns {Object} Stored response record
 */
async function storeDataSourceResponse(responseData) {
    try {
        const {
            propertyId,
            sourceId,
            requestUrl,
            requestParams,
            responseStatus,
            responseTimeMs,
            rawResponse,
            processedData,
            errorMessage,
            dataVersion,
            dataTimestamp,
            confidenceLevel
        } = responseData;

        const insertQuery = `
            INSERT INTO data_source_responses (
                property_id, source_id, request_url, request_params,
                response_status, response_time_ms, raw_response,
                processed_data, error_message, data_version,
                data_timestamp, confidence_level
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            )
            RETURNING *;
        `;

        const params = [
            propertyId,
            sourceId,
            requestUrl,
            requestParams,
            responseStatus,
            responseTimeMs,
            rawResponse,
            processedData,
            errorMessage,
            dataVersion,
            dataTimestamp,
            confidenceLevel
        ];

        const result = await executeQuery(insertQuery, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error storing data source response:', error);
        throw error;
    }
}

/**
 * Get data source by name
 * @param {string} sourceName - Name of the data source
 * @returns {Object} Data source configuration
 */
async function getDataSource(sourceName) {
    try {
        const query = `
            SELECT * FROM data_sources 
            WHERE source_name = $1 AND is_active = true
            LIMIT 1;
        `;

        const result = await executeQuery(query, [sourceName]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting data source:', error);
        throw error;
    }
}

/**
 * Usage and analytics operations
 */

/**
 * Track API usage for billing and analytics
 * @param {Object} usageData - Usage tracking data
 * @returns {Object} Stored usage record
 */
async function trackApiUsage(usageData) {
    try {
        const {
            userId,
            apiKeyId,
            endpoint,
            httpMethod,
            requestSizeBytes,
            responseSizeBytes,
            responseTimeMs,
            statusCode,
            propertyCount,
            zipCodes,
            states,
            billableRequest,
            cost,
            userAgent,
            ipAddress,
            referrer
        } = usageData;

        const insertQuery = `
            INSERT INTO usage_analytics (
                user_id, api_key_id, endpoint, http_method,
                request_size_bytes, response_size_bytes, response_time_ms,
                status_code, property_count, zip_codes, states,
                billable_request, cost, user_agent, ip_address, referrer
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            )
            RETURNING *;
        `;

        const params = [
            userId,
            apiKeyId,
            endpoint,
            httpMethod,
            requestSizeBytes,
            responseSizeBytes,
            responseTimeMs,
            statusCode,
            propertyCount,
            zipCodes,
            states,
            billableRequest,
            cost,
            userAgent,
            ipAddress,
            referrer
        ];

        const result = await executeQuery(insertQuery, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error tracking API usage:', error);
        throw error;
    }
}

module.exports = {
    executeQuery,
    executeQueryWithNamedParams,
    // Property operations
    findPropertyByAddress,
    upsertProperty,
    findPropertiesWithinRadius,
    // Risk assessment operations
    getCurrentRiskAssessment,
    upsertRiskAssessment,
    // Data source operations
    storeDataSourceResponse,
    getDataSource,
    // Usage tracking
    trackApiUsage
};