const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');

/**
 * Updates an existing agent trigger configuration for Seawater Climate Risk Platform
 * Method-Specific Handler: PUT /config/agent-triggers
 * 
 * Supports updating:
 * - Trigger thresholds and values
 * - Action template data
 * - Status (Active/Inactive)
 * - Geographic and category scoping
 */
const updateAgentTrigger = async ({ body: requestBody = {}, requestContext }) => {
    try {
        const Request_ID = requestContext.requestId;
        const {
            Company_ID,
            Trigger_ID,
            Trigger_Name,
            
            // Seawater-specific update fields
            Climate_Risk_Threshold,
            Data_Freshness_Hours,
            API_Failure_Count,
            Property_Analysis_Volume,
            
            Action_Template_Data,
            Department_ID,
            Category_ID,
            Location_ID,
            Status
        } = requestBody;
        
        if (!Company_ID || !Trigger_ID) {
            return createErrorResponse(
                'Company_ID and Trigger_ID are required',
                'MISSING_REQUIRED_PARAMETERS'
            );
        }
        
        // Check if trigger exists
        const existingTrigger = await executeQuery(
            `SELECT * FROM "Config_Agent_Triggers"
             WHERE "Trigger_ID" = $1 AND "Company_ID" = $2`,
            [Trigger_ID, Company_ID]
        );
        
        if (existingTrigger.length === 0) {
            return createErrorResponse(
                `Agent trigger ${Trigger_ID} not found for company ${Company_ID}`,
                'TRIGGER_NOT_FOUND'
            );
        }
        
        const currentTrigger = existingTrigger[0];
        
        // Validate trigger type changes - don't allow changing trigger type
        const newTriggerTypes = [
            Climate_Risk_Threshold,
            Data_Freshness_Hours,
            API_Failure_Count,
            Property_Analysis_Volume
        ];
        const definedNewTriggers = newTriggerTypes.filter(t => t !== undefined && t !== null).length;
        
        if (definedNewTriggers > 1) {
            return createErrorResponse(
                'Cannot specify multiple trigger types in update',
                'INVALID_TRIGGER_UPDATE'
            );
        }
        
        // Validate new trigger values
        if (Climate_Risk_Threshold !== undefined) {
            if (Climate_Risk_Threshold !== null && (Climate_Risk_Threshold < 0 || Climate_Risk_Threshold > 100)) {
                return createErrorResponse(
                    'Climate_Risk_Threshold must be between 0 and 100',
                    'INVALID_RISK_THRESHOLD'
                );
            }
            // Ensure we're updating the correct trigger type
            if (currentTrigger.Climate_Risk_Threshold === null) {
                return createErrorResponse(
                    'Cannot change trigger type - this is not a climate risk threshold trigger',
                    'INVALID_TRIGGER_TYPE_CHANGE'
                );
            }
        }
        
        if (Data_Freshness_Hours !== undefined) {
            if (Data_Freshness_Hours !== null && (Data_Freshness_Hours < 1 || Data_Freshness_Hours > 8760)) {
                return createErrorResponse(
                    'Data_Freshness_Hours must be between 1 and 8760 (1 year)',
                    'INVALID_FRESHNESS_THRESHOLD'
                );
            }
            if (currentTrigger.Data_Freshness_Hours === null) {
                return createErrorResponse(
                    'Cannot change trigger type - this is not a data freshness trigger',
                    'INVALID_TRIGGER_TYPE_CHANGE'
                );
            }
        }
        
        if (API_Failure_Count !== undefined) {
            if (API_Failure_Count !== null && (API_Failure_Count < 1 || API_Failure_Count > 100)) {
                return createErrorResponse(
                    'API_Failure_Count must be between 1 and 100',
                    'INVALID_FAILURE_THRESHOLD'
                );
            }
            if (currentTrigger.API_Failure_Count === null) {
                return createErrorResponse(
                    'Cannot change trigger type - this is not an API failure trigger',
                    'INVALID_TRIGGER_TYPE_CHANGE'
                );
            }
        }
        
        if (Property_Analysis_Volume !== undefined) {
            if (Property_Analysis_Volume !== null && (Property_Analysis_Volume < 1 || Property_Analysis_Volume > 10000)) {
                return createErrorResponse(
                    'Property_Analysis_Volume must be between 1 and 10000',
                    'INVALID_VOLUME_THRESHOLD'
                );
            }
            if (currentTrigger.Property_Analysis_Volume === null) {
                return createErrorResponse(
                    'Cannot change trigger type - this is not a property volume trigger',
                    'INVALID_TRIGGER_TYPE_CHANGE'
                );
            }
        }
        
        // Build dynamic update query
        let setClause = [];
        let params = [];
        let paramIndex = 1;
        
        if (Trigger_Name !== undefined) {
            setClause.push(`"Trigger_Name" = $${paramIndex}`);
            params.push(Trigger_Name);
            paramIndex++;
        }
        
        // Add Seawater-specific trigger field updates
        if (Climate_Risk_Threshold !== undefined) {
            setClause.push(`"Climate_Risk_Threshold" = $${paramIndex}`);
            params.push(Climate_Risk_Threshold);
            paramIndex++;
        }
        
        if (Data_Freshness_Hours !== undefined) {
            setClause.push(`"Data_Freshness_Hours" = $${paramIndex}`);
            params.push(Data_Freshness_Hours);
            paramIndex++;
        }
        
        if (API_Failure_Count !== undefined) {
            setClause.push(`"API_Failure_Count" = $${paramIndex}`);
            params.push(API_Failure_Count);
            paramIndex++;
        }
        
        if (Property_Analysis_Volume !== undefined) {
            setClause.push(`"Property_Analysis_Volume" = $${paramIndex}`);
            params.push(Property_Analysis_Volume);
            paramIndex++;
        }
        
        if (Action_Template_Data !== undefined) {
            setClause.push(`"Action_Template_Data" = $${paramIndex}`);
            params.push(Action_Template_Data ? JSON.stringify(Action_Template_Data) : null);
            paramIndex++;
        }
        
        if (Department_ID !== undefined) {
            setClause.push(`"Department_ID" = $${paramIndex}`);
            params.push(Department_ID);
            paramIndex++;
        }
        
        if (Category_ID !== undefined) {
            setClause.push(`"Category_ID" = $${paramIndex}`);
            params.push(Category_ID);
            paramIndex++;
        }
        
        if (Location_ID !== undefined) {
            setClause.push(`"Location_ID" = $${paramIndex}`);
            params.push(Location_ID);
            paramIndex++;
        }
        
        if (Status !== undefined) {
            setClause.push(`"Status" = $${paramIndex}`);
            params.push(Status);
            paramIndex++;
        }
        
        if (setClause.length === 0) {
            return createErrorResponse(
                'No fields provided for update',
                'NO_UPDATE_FIELDS'
            );
        }
        
        setClause.push(`"Last_Updated" = CURRENT_TIMESTAMP`);
        
        // Add WHERE clause parameters
        params.push(Trigger_ID, Company_ID);
        
        const query = `
            UPDATE "Config_Agent_Triggers"
            SET ${setClause.join(', ')}
            WHERE "Trigger_ID" = $${paramIndex} AND "Company_ID" = $${paramIndex + 1}
            RETURNING *
        `;
        
        const result = await executeQuery(query, params);
        
        // Log update for audit
        console.log(`Seawater Agent Trigger Updated: ${Trigger_ID} for ${Company_ID}`);
        
        return createSuccessResponse(
            { Records: result },
            'Agent trigger updated successfully',
            {
                Total_Records: result.length,
                Request_ID,
                Timestamp: new Date().toISOString(),
                Company_ID,
                Trigger_ID,
                Platform: 'Seawater',
                Updated_Fields: Object.keys(requestBody).filter(key => 
                    key !== 'Company_ID' && key !== 'Trigger_ID' && requestBody[key] !== undefined
                )
            }
        );
        
    } catch (error) {
        console.error('Seawater Agent Trigger Update Error:', error);
        return handleError(error, 'AGENT_TRIGGER_UPDATE_FAILED');
    }
};

exports.handler = wrapHandler(updateAgentTrigger);