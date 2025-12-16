-- OpenPermit PostgreSQL Schema
-- Run this in pgAdmin to create the feedback table

-- Create ENUM types first (Based on City of Boston permit types)
CREATE TYPE permit_type_enum AS ENUM (
    'Building - Short Form',
    'Building - Long Form',
    'Use of Premises',
    'Liquor License',
    'Common Victualler (Food Service)',
    'Entertainment License',
    'Street Occupancy',
    'Resident Parking',
    'Business Parking',
    'Fire Prevention',
    'Fire Alarm',
    'Place of Assembly',
    'Hot Work',
    'Tent Permit',
    'Food Truck',
    'Dumpster',
    'Excavation',
    'Driveway',
    'Sign Permit',
    'Electrical',
    'Plumbing',
    'Gas',
    'Other'
);

CREATE TYPE urgency_level_enum AS ENUM ('Low', 'Medium', 'High');

CREATE TYPE status_enum AS ENUM (
    'New', 'Routed', 'Acknowledged', 'In Progress','Updated', 'Closed'
);

CREATE TYPE feedback_source_enum AS ENUM (
    'OpenPermit', 'Email', 'Phone', 'In-Person', 'Website', '311', 'Interview', 'Other'
);

-- Create system configuration table
CREATE TABLE system_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    change_notes TEXT
);

-- Create indexes for system_config
CREATE INDEX idx_active_config ON system_config (is_active) WHERE is_active = true;
CREATE INDEX idx_version ON system_config (version DESC);

-- Create main feedback table
CREATE TABLE feedback2 (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp_submitted TIMESTAMPTZ DEFAULT NOW(),
    timestamp_processed TIMESTAMPTZ,
    
    -- User inputs
    permit_type permit_type_enum,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    issue_description TEXT NOT NULL,
    
    -- AI outputs
    ai_summary TEXT,
    ai_clarification_needed BOOLEAN DEFAULT FALSE,
    ai_followup_notes TEXT,
    department_predicted VARCHAR(100),
    
    -- Scoring & priority
    sentiment_score FLOAT CHECK (sentiment_score BETWEEN -1 AND 1),
    impact_type TEXT[],
    urgency_level urgency_level_enum,
    
    -- Status tracking
    status status_enum DEFAULT 'New',
    
    -- User info
    followup_opt_in BOOLEAN DEFAULT FALSE,
    user_contact_info JSONB,
    language VARCHAR(10),
    
    -- Metadata
    attachment_urls TEXT[],
    feedback_source feedback_source_enum DEFAULT 'OpenPermit',
    
    -- Configuration version tracking
    config_version INTEGER REFERENCES system_config(version)
);
