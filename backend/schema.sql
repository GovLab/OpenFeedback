-- OpenFeedback PostgreSQL Schema
-- Run this file in pgAdmin to set up the database

-- ============================================
-- ENUM TYPES
-- ============================================

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

-- ============================================
-- TABLES
-- ============================================

-- System configuration table (stores versioned config)
CREATE TABLE system_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    change_notes TEXT
);

CREATE INDEX idx_active_config ON system_config (is_active) WHERE is_active = true;
CREATE INDEX idx_version ON system_config (version DESC);

-- Main feedback table
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

-- ============================================
-- INITIAL DATA
-- ============================================

-- Seed initial system configuration (Version 1)
INSERT INTO system_config (
    version,
    config_data,
    is_active,
    created_at,
    created_by,
    change_notes
) VALUES (
    1,
    '{
        "categories": [
            {
                "name": "Economic & Equity Concerns",
                "subcategories": [
                    "High or Unexpected Costs",
                    "Access or Fairness Barriers"
                ]
            },
            {
                "name": "Communication & Service Problems",
                "subcategories": [
                    "Poor Communication / Experience",
                    "Service Responsiveness & Transparency"
                ]
            },
            {
                "name": "Technology & Access Barriers",
                "subcategories": [
                    "Technical / Portal Problems",
                    "Digital Access & Portal Problems"
                ]
            },
            {
                "name": "Process & Operational Flow Issues",
                "subcategories": [
                    "Confusion or Missing Guidance",
                    "Delays or Waiting Too Long",
                    "Conflicting Departments / Redundant Steps",
                    "Procedural & Coordination Issues"
                ]
            },
            {
                "name": "Policy & Rules Clarity",
                "subcategories": [
                    "Outdated or Unclear Rules",
                    "Rules & Policy Gaps"
                ]
            }
        ],
        "permit_types": [
            "Building - Short Form",
            "Building - Long Form",
            "Use of Premises",
            "Liquor License",
            "Common Victualler (Food Service)",
            "Entertainment License",
            "Street Occupancy",
            "Resident Parking",
            "Business Parking",
            "Fire Prevention",
            "Fire Alarm",
            "Place of Assembly",
            "Hot Work",
            "Tent Permit",
            "Food Truck",
            "Dumpster",
            "Excavation",
            "Driveway",
            "Sign Permit",
            "Electrical",
            "Plumbing",
            "Gas",
            "Other"
        ],
        "departments": [
            "Inspectional Services",
            "Licensing Board",
            "Public Works",
            "Fire Department",
            "Building Department"
        ],
        "impact_types": [
            "Time Lost",
            "Financial Cost",
            "Business Impact",
            "Safety Concern",
            "Legal/Compliance",
            "Customer Experience",
            "Project Delay"
        ],
        "urgency_levels": [
            "Low",
            "Medium",
            "High"
        ],
        "sentiment_options": [
            "Positive",
            "Negative",
            "Neutral"
        ],
        "priority_levels": [
            "High",
            "Medium",
            "Low"
        ]
    }'::jsonb,
    true,
    NOW(),
    'system',
    'Initial configuration'
);
