const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');

/**
 * Retrieves agent trigger configurations for Seawater Climate Risk Platform
 * Method-Specific Handler: GET /config/agent-triggers
 * 
 * Supports filtering by:
 * - Company_ID (required or inferred from auth)
 * - Trigger_ID (specific trigger)
 * - Status (Active, Inactive, All)
 * - Category_ID (risk type: flood, fire, heat, etc.)
 * - Location_ID (geographic scope)
 */
const readAgentTriggers = async ({ queryStringParameters: queryParams = {}, requestContext }) => {
    try {
        const Request_ID = requestContext.requestId;
        const {
            Company_ID,
            Trigger_ID,
            Status = 'Active',
            Category_ID,
            Location_ID,
            Department_ID
        } = queryParams;
        
        let query = `
            SELECT 
                t.*,
                a."Action_Name",
                -- Determine trigger type for easier frontend handling
                CASE 
                    WHEN t."Climate_Risk_Threshold" IS NOT NULL THEN 'climate_risk_threshold'
                    WHEN t."Data_Freshness_Hours" IS NOT NULL THEN 'data_freshness'
                    WHEN t."API_Failure_Count" IS NOT NULL THEN 'api_failure'
                    WHEN t."Property_Analysis_Volume" IS NOT NULL THEN 'property_volume'
                    ELSE 'unknown'
                END as "Trigger_Type",
                -- Get the actual trigger value
                COALESCE(
                    t."Climate_Risk_Threshold"::text,
                    t."Data_Freshness_Hours"::text,
                    t."API_Failure_Count"::text,
                    t."Property_Analysis_Volume"::text
                ) as "Trigger_Value"
            FROM "Config_Agent_Triggers" t
            LEFT JOIN "Config_Actions" a ON t."Action_ID" = a."Action_ID" AND t."Company_ID" = a."Company_ID"
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (Company_ID) {
            query += ` AND t."Company_ID" = $${paramIndex}`;
            params.push(Company_ID);
            paramIndex++;
        }
        
        if (Trigger_ID) {
            query += ` AND t."Trigger_ID" = $${paramIndex}`;
            params.push(Trigger_ID);
            paramIndex++;
        }
        
        if (Status && Status !== 'All') {
            query += ` AND t."Status" = $${paramIndex}`;
            params.push(Status);
            paramIndex++;
        }
        
        // Seawater-specific filters
        if (Category_ID) {
            query += ` AND t."Category_ID" = $${paramIndex}`;
            params.push(Category_ID);
            paramIndex++;
        }
        
        if (Location_ID) {
            query += ` AND t."Location_ID" = $${paramIndex}`;
            params.push(Location_ID);
            paramIndex++;
        }
        
        if (Department_ID) {
            query += ` AND t."Department_ID" = $${paramIndex}`;
            params.push(Department_ID);
            paramIndex++;
        }
        
        query += ` ORDER BY t."Create_Date" DESC`;
        
        const triggers = await executeQuery(query, params);
        
        // Enhance results with Seawater-specific metadata
        const enhancedTriggers = triggers.map(trigger => ({
            ...trigger,
            // Parse Action_Template_Data if it exists
            Action_Template_Data: trigger.Action_Template_Data ? 
                (typeof trigger.Action_Template_Data === 'string' ? 
                    JSON.parse(trigger.Action_Template_Data) : 
                    trigger.Action_Template_Data) : null,
            // Add human-readable descriptions
            Trigger_Description: generateTriggerDescription(trigger),
            // Add platform identifier
            Platform: 'Seawater',
            // Calculate trigger status
            Is_Active: trigger.Status === 'Active',
            // Format dates
            Create_Date_Formatted: trigger.Create_Date ? new Date(trigger.Create_Date).toISOString() : null,
            Last_Updated_Formatted: trigger.Last_Updated ? new Date(trigger.Last_Updated).toISOString() : null
        }));
        
        // Get summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_triggers,
                COUNT(CASE WHEN "Status" = 'Active' THEN 1 END) as active_triggers,
                COUNT(CASE WHEN "Climate_Risk_Threshold" IS NOT NULL THEN 1 END) as risk_threshold_triggers,
                COUNT(CASE WHEN "Data_Freshness_Hours" IS NOT NULL THEN 1 END) as freshness_triggers,
                COUNT(CASE WHEN "API_Failure_Count" IS NOT NULL THEN 1 END) as api_failure_triggers,
                COUNT(CASE WHEN "Property_Analysis_Volume" IS NOT NULL THEN 1 END) as volume_triggers
            FROM "Config_Agent_Triggers"
            WHERE ($1::text IS NULL OR "Company_ID" = $1)
        `;
        
        const summaryResult = await executeQuery(summaryQuery, [Company_ID || null]);
        const summary = summaryResult[0] || {};
        
        return createSuccessResponse(
            { 
                Records: enhancedTriggers,
                Summary: {
                    total_triggers: parseInt(summary.total_triggers) || 0,
                    active_triggers: parseInt(summary.active_triggers) || 0,
                    trigger_types: {
                        climate_risk_threshold: parseInt(summary.risk_threshold_triggers) || 0,
                        data_freshness: parseInt(summary.freshness_triggers) || 0,
                        api_failure: parseInt(summary.api_failure_triggers) || 0,
                        property_volume: parseInt(summary.volume_triggers) || 0
                    }
                }
            },
            'Agent triggers retrieved successfully',
            {
                Total_Records: enhancedTriggers.length,
                Request_ID,
                Timestamp: new Date().toISOString(),
                Company_ID,
                Filter_Status: Status,
                Platform: 'Seawater'
            }
        );
        
    } catch (error) {
        console.error('Seawater Agent Trigger Read Error:', error);
        return handleError(error, 'AGENT_TRIGGER_READ_FAILED');
    }
};

/**
 * Generate human-readable description for trigger
 */
function generateTriggerDescription(trigger) {
    if (trigger.Climate_Risk_Threshold !== null) {
        return `Alert when property risk score exceeds ${trigger.Climate_Risk_Threshold}/100`;
    }
    if (trigger.Data_Freshness_Hours !== null) {
        return `Alert when climate data is older than ${trigger.Data_Freshness_Hours} hours`;
    }
    if (trigger.API_Failure_Count !== null) {
        return `Alert after ${trigger.API_Failure_Count} consecutive API failures`;
    }
    if (trigger.Property_Analysis_Volume !== null) {
        return `Alert when ${trigger.Property_Analysis_Volume}+ properties analyzed in period`;
    }
    return 'Unknown trigger type';
}

exports.handler = wrapHandler(readAgentTriggers);