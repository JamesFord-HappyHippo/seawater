const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');

/**
 * Deletes an agent trigger configuration for Seawater Climate Risk Platform
 * Method-Specific Handler: DELETE /config/agent-triggers
 * 
 * Supports soft delete (Status = 'Deleted') or hard delete based on parameters
 * Includes safety checks for active triggers and related data
 */
const deleteAgentTrigger = async ({ queryStringParameters: queryParams = {}, requestContext }) => {
    try {
        const Request_ID = requestContext.requestId;
        const { 
            Company_ID, 
            Trigger_ID,
            hard_delete = 'false'  // Default to soft delete for safety
        } = queryParams;
        
        if (!Company_ID || !Trigger_ID) {
            return createErrorResponse(
                'Company_ID and Trigger_ID are required',
                'MISSING_REQUIRED_PARAMETERS'
            );
        }
        
        // Check if trigger exists and get its details
        const existingTrigger = await executeQuery(
            `SELECT * FROM "Config_Agent_Triggers" t
             WHERE t."Trigger_ID" = $1 AND t."Company_ID" = $2`,
            [Trigger_ID, Company_ID]
        );
        
        if (existingTrigger.length === 0) {
            return createErrorResponse(
                `Agent trigger ${Trigger_ID} not found for company ${Company_ID}`,
                'TRIGGER_NOT_FOUND'
            );
        }
        
        const trigger = existingTrigger[0];
        
        // Check for related agent trigger logs (safety check)
        const relatedLogs = await executeQuery(
            `SELECT COUNT(*) as log_count 
             FROM "Agent_Trigger_Log" 
             WHERE "Trigger_ID" = $1 
             AND "Triggered_At" >= NOW() - INTERVAL '30 days'`,
            [Trigger_ID]
        );
        
        const recentLogCount = parseInt(relatedLogs[0]?.log_count) || 0;
        
        // Warn about recent activity
        let warnings = [];
        if (recentLogCount > 0) {
            warnings.push(`This trigger has ${recentLogCount} log entries in the last 30 days`);
        }
        
        if (trigger.Status === 'Active') {
            warnings.push('This trigger is currently active and may be monitoring live data');
        }
        
        let result;
        let operation;
        
        if (hard_delete === 'true') {
            // Hard delete - permanently remove the trigger
            result = await executeQuery(
                `DELETE FROM "Config_Agent_Triggers"
                 WHERE "Trigger_ID" = $1 AND "Company_ID" = $2
                 RETURNING "Trigger_ID", "Company_ID", "Trigger_Name"`,
                [Trigger_ID, Company_ID]
            );
            operation = 'HARD_DELETE';
            
            console.log(`Seawater Agent Trigger Hard Deleted: ${Trigger_ID} for ${Company_ID}`);
        } else {
            // Soft delete - mark as deleted but keep record
            result = await executeQuery(
                `UPDATE "Config_Agent_Triggers"
                 SET "Status" = 'Deleted', "Last_Updated" = CURRENT_TIMESTAMP
                 WHERE "Trigger_ID" = $1 AND "Company_ID" = $2
                 RETURNING *`,
                [Trigger_ID, Company_ID]
            );
            operation = 'SOFT_DELETE';
            
            console.log(`Seawater Agent Trigger Soft Deleted: ${Trigger_ID} for ${Company_ID}`);
        }
        
        // Create audit log entry for deletion
        try {
            await executeQuery(
                `INSERT INTO "Agent_Trigger_Log" (
                    "Trigger_ID", "Action_ID", "Event_Data", "Status"
                ) VALUES ($1, $2, $3, $4)`,
                [
                    Trigger_ID,
                    'DELETE',
                    JSON.stringify({
                        operation: operation,
                        deleted_by: requestContext.requestId,
                        deleted_at: new Date().toISOString(),
                        trigger_details: {
                            trigger_name: trigger.Trigger_Name,
                            trigger_type: trigger.Climate_Risk_Threshold ? 'climate_risk_threshold' :
                                         trigger.Data_Freshness_Hours ? 'data_freshness' :
                                         trigger.API_Failure_Count ? 'api_failure' :
                                         'property_volume'
                        },
                        warnings: warnings
                    }),
                    'COMPLETED'
                ]
            );
        } catch (logError) {
            console.warn('Failed to create deletion audit log:', logError);
            // Don't fail the deletion if audit logging fails
        }
        
        return createSuccessResponse(
            { 
                Records: hard_delete === 'true' ? [] : result,
                Deletion_Details: {
                    operation: operation,
                    trigger_id: Trigger_ID,
                    company_id: Company_ID,
                    warnings: warnings,
                    can_restore: hard_delete !== 'true'
                }
            },
            `Agent trigger ${operation === 'HARD_DELETE' ? 'permanently deleted' : 'marked as deleted'} successfully`,
            {
                Total_Records: hard_delete === 'true' ? 0 : result.length,
                Request_ID,
                Timestamp: new Date().toISOString(),
                Company_ID,
                Trigger_ID,
                Operation: operation,
                Platform: 'Seawater',
                Warnings_Count: warnings.length
            }
        );
        
    } catch (error) {
        console.error('Seawater Agent Trigger Delete Error:', error);
        return handleError(error, 'AGENT_TRIGGER_DELETE_FAILED');
    }
};

exports.handler = wrapHandler(deleteAgentTrigger);