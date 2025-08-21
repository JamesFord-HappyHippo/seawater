-- Migration: Add Agent Triggers Table for Autonomous Development
-- Adapted from Tim-Combo for Seawater Climate Risk Platform

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Config_Agent_Triggers'
    ) THEN
        CREATE TABLE public."Config_Agent_Triggers" (
            "Trigger_ID" varchar(32) NOT NULL,
            "Company_ID" varchar(64) NOT NULL,  -- For Seawater: Property_Owner_ID
            "Trigger_Name" varchar(64) NOT NULL,
            
            -- SEAWATER-SPECIFIC TRIGGER FIELDS (Climate Risk Platform):
            "Climate_Risk_Threshold" numeric,      -- Risk score threshold (0-100)
            "Data_Freshness_Hours" integer,       -- Max hours before data is stale
            "API_Failure_Count" integer,          -- Consecutive API failures
            "Property_Analysis_Volume" integer,   -- Bulk analysis threshold
            
            -- COMMON FIELDS:
            "Action_ID" varchar(8) NOT NULL,
            "Action_Template_Data" jsonb,          -- Pre-filled action data
            
            -- Optional scoping (adapted for Seawater entities)
            "Department_ID" varchar(8),           -- For Seawater: Region_ID
            "Category_ID" varchar(8),             -- For Seawater: Risk_Type (flood, fire, heat, etc.)
            "Location_ID" varchar(8),             -- Geographic scoping (state, county, zip)
            
            "Status" varchar(16) DEFAULT 'Active',
            "Create_Date" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "Last_Updated" timestamp,
            
            CONSTRAINT "Config_Agent_Triggers_pkey" PRIMARY KEY ("Trigger_ID", "Company_ID"),
            
            -- Ensure only one trigger field is used per trigger
            CONSTRAINT "single_trigger_type" CHECK (
                (CASE WHEN "Climate_Risk_Threshold" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "Data_Freshness_Hours" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "API_Failure_Count" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "Property_Analysis_Volume" IS NOT NULL THEN 1 ELSE 0 END) = 1
            )
        );
        
        -- Add indexes for performance
        CREATE INDEX "idx_config_agent_triggers_company" 
            ON public."Config_Agent_Triggers"("Company_ID");
            
        CREATE INDEX "idx_config_agent_triggers_status" 
            ON public."Config_Agent_Triggers"("Company_ID", "Status");
    END IF;
END$$;

-- SEAWATER-SPECIFIC AGENT PROCESSING FUNCTION
CREATE OR REPLACE FUNCTION check_agent_triggers()
RETURNS void AS $$
DECLARE
    r_event RECORD;
    v_action_guid uuid;
    v_action_data jsonb;
BEGIN
    -- FOR SEAWATER: Process climate data events
    -- This function monitors:
    -- 1. Property risk assessment requests
    -- 2. Climate data API failures
    -- 3. Data freshness thresholds
    -- 4. Bulk analysis volume triggers
    
    -- Example: Check for high-risk property assessments that need agent intervention
    FOR r_event IN 
        SELECT 
            pr."Property_ID",
            pr."Overall_Risk_Score",
            pr."Last_Updated",
            cat."Trigger_ID",
            cat."Action_ID",
            cat."Action_Template_Data"
        FROM "Property_Risk_Assessments" pr
        JOIN "Config_Agent_Triggers" cat ON 
            cat."Climate_Risk_Threshold" IS NOT NULL 
            AND pr."Overall_Risk_Score" >= cat."Climate_Risk_Threshold"
            AND cat."Status" = 'Active'
        WHERE pr."Last_Updated" >= NOW() - INTERVAL '1 hour'
          AND pr."Agent_Notification_Sent" IS NULL
    LOOP
        -- Generate action GUID
        v_action_guid := gen_random_uuid();
        
        -- Prepare agent action data
        v_action_data := jsonb_build_object(
            'trigger_type', 'climate_risk_threshold',
            'property_id', r_event."Property_ID",
            'risk_score', r_event."Overall_Risk_Score",
            'threshold', (SELECT "Climate_Risk_Threshold" FROM "Config_Agent_Triggers" WHERE "Trigger_ID" = r_event."Trigger_ID"),
            'template_data', r_event."Action_Template_Data"
        );
        
        -- Log agent trigger (would integrate with actual agent system)
        INSERT INTO "Agent_Trigger_Log" (
            "Trigger_ID", 
            "Action_ID", 
            "Triggered_At", 
            "Event_Data",
            "Status"
        ) VALUES (
            r_event."Trigger_ID",
            r_event."Action_ID",
            NOW(),
            v_action_data,
            'PENDING'
        );
        
        -- Mark property as having agent notification sent
        UPDATE "Property_Risk_Assessments" 
        SET "Agent_Notification_Sent" = NOW()
        WHERE "Property_ID" = r_event."Property_ID";
        
    END LOOP;
    
    RAISE NOTICE 'Agent trigger check completed for Seawater platform - % triggers processed', 
        (SELECT COUNT(*) FROM "Config_Agent_Triggers" WHERE "Status" = 'Active');
END;
$$ LANGUAGE plpgsql;

-- Create Agent Trigger Log table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Agent_Trigger_Log'
    ) THEN
        CREATE TABLE public."Agent_Trigger_Log" (
            "Log_ID" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            "Trigger_ID" varchar(32) NOT NULL,
            "Action_ID" varchar(8) NOT NULL,
            "Triggered_At" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "Event_Data" jsonb,
            "Status" varchar(16) DEFAULT 'PENDING',
            "Processed_At" timestamp,
            "Result" jsonb
        );
        
        CREATE INDEX "idx_agent_trigger_log_status" 
            ON public."Agent_Trigger_Log"("Status", "Triggered_At");
    END IF;
END$$;

-- Log migration
INSERT INTO "Migration_Log" ("Migration_Name", "Applied_At", "Description")
VALUES (
    'add_agent_triggers', 
    NOW(), 
    'Added Agent Factory backend configuration system for Seawater climate risk platform'
)
ON CONFLICT ("Migration_Name") DO NOTHING;