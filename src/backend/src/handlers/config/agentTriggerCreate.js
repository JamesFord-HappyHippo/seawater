const { wrapHandler } = require('./lambdaWrapper');
const { validateRequiredParams } = require('./validationUtil');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');

/**
 * Creates a new agent trigger configuration for Seawater Climate Risk Platform
 * Method-Specific Handler: POST /config/agent-triggers
 * 
 * Seawater-specific trigger types:
 * - Climate risk threshold triggers (high-risk property alerts)
 * - Data freshness monitoring (stale climate data detection)
 * - API failure count triggers (external service monitoring)
 * - Property analysis volume triggers (bulk processing alerts)
 */
const createAgentTrigger = async ({ body: requestBody = {}, requestContext }) => {
    try {
        const Request_ID = requestContext.requestId;
        
        // Validate required parameters
        const requiredParams = ['Company_ID', 'Trigger_ID', 'Trigger_Name', 'Action_ID'];
        const validation = validateRequiredParams(requestBody, requiredParams);
        if (!validation.isValid) {
            return createErrorResponse(validation.message, 'MISSING_REQUIRED_PARAMETERS');
        }
        
        const {
            Company_ID,
            Trigger_ID,
            Trigger_Name,
            Action_ID,
            
            // Seawater-specific trigger fields:
            Climate_Risk_Threshold,        // Risk score threshold (0-100)
            Data_Freshness_Hours,         // Max hours before data is stale
            API_Failure_Count,            // Consecutive API failures
            Property_Analysis_Volume,     // Bulk analysis threshold
            
            // Common optional fields:
            Action_Template_Data,
            Department_ID,                // For Seawater: Region_ID
            Category_ID,                  // For Seawater: Risk_Type (flood, fire, heat, etc.)
            Location_ID,                  // Geographic scoping (state, county, zip)
            Status = 'Active'
        } = requestBody;
        
        // Validate that exactly one trigger type is specified
        const triggerTypes = [
            Climate_Risk_Threshold,
            Data_Freshness_Hours,
            API_Failure_Count,
            Property_Analysis_Volume
        ];
        const definedTriggers = triggerTypes.filter(t => t !== undefined && t !== null).length;
        
        if (definedTriggers !== 1) {
            return createErrorResponse(
                'Exactly one trigger type must be specified (Climate_Risk_Threshold, Data_Freshness_Hours, API_Failure_Count, or Property_Analysis_Volume)',
                'INVALID_TRIGGER_CONFIGURATION'
            );
        }
        
        // Validate trigger values
        if (Climate_Risk_Threshold !== undefined) {
            if (Climate_Risk_Threshold < 0 || Climate_Risk_Threshold > 100) {
                return createErrorResponse(
                    'Climate_Risk_Threshold must be between 0 and 100',
                    'INVALID_RISK_THRESHOLD'
                );
            }
        }
        
        if (Data_Freshness_Hours !== undefined) {
            if (Data_Freshness_Hours < 1 || Data_Freshness_Hours > 8760) { // 1 hour to 1 year
                return createErrorResponse(
                    'Data_Freshness_Hours must be between 1 and 8760 (1 year)',
                    'INVALID_FRESHNESS_THRESHOLD'
                );
            }
        }
        
        if (API_Failure_Count !== undefined) {
            if (API_Failure_Count < 1 || API_Failure_Count > 100) {
                return createErrorResponse(
                    'API_Failure_Count must be between 1 and 100',
                    'INVALID_FAILURE_THRESHOLD'
                );
            }
        }
        
        if (Property_Analysis_Volume !== undefined) {
            if (Property_Analysis_Volume < 1 || Property_Analysis_Volume > 10000) {
                return createErrorResponse(
                    'Property_Analysis_Volume must be between 1 and 10000',
                    'INVALID_VOLUME_THRESHOLD'
                );
            }
        }
        
        // Check if trigger already exists
        const existingTrigger = await executeQuery(
            `SELECT 1 FROM "Config_Agent_Triggers"
             WHERE "Trigger_ID" = $1 AND "Company_ID" = $2`,
            [Trigger_ID, Company_ID]
        );
        
        if (existingTrigger.length > 0) {
            return createErrorResponse(
                `Agent trigger ${Trigger_ID} already exists for company ${Company_ID}`,
                'DUPLICATE_TRIGGER_ID'
            );
        }
        
        // Create agent trigger
        const result = await executeQuery(
            `INSERT INTO "Config_Agent_Triggers" (
                "Trigger_ID", "Company_ID", "Trigger_Name", "Action_ID",
                "Climate_Risk_Threshold", "Data_Freshness_Hours", "API_Failure_Count", "Property_Analysis_Volume",
                "Action_Template_Data", "Department_ID", "Category_ID", "Location_ID", "Status"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                Trigger_ID, Company_ID, Trigger_Name, Action_ID,
                Climate_Risk_Threshold, Data_Freshness_Hours, API_Failure_Count, Property_Analysis_Volume,
                Action_Template_Data ? JSON.stringify(Action_Template_Data) : null,
                Department_ID, Category_ID, Location_ID, Status
            ]
        );
        
        // Log trigger creation for audit
        console.log(`Seawater Agent Trigger Created: ${Trigger_ID} for ${Company_ID}`);
        
        return createSuccessResponse(
            { Records: result },
            'Agent trigger created successfully',
            {
                Total_Records: result.length,
                Request_ID,
                Timestamp: new Date().toISOString(),
                Company_ID,
                Trigger_ID,
                Platform: 'Seawater',
                Trigger_Type: Climate_Risk_Threshold ? 'climate_risk_threshold' :
                             Data_Freshness_Hours ? 'data_freshness' :
                             API_Failure_Count ? 'api_failure' :
                             'property_volume'
            }
        );
        
    } catch (error) {
        console.error('Seawater Agent Trigger Creation Error:', error);
        return handleError(error, 'AGENT_TRIGGER_CREATE_FAILED');
    }
};

exports.handler = wrapHandler(createAgentTrigger);