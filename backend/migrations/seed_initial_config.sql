-- Seed initial system configuration (Version 1)
-- This matches the hardcoded values from prompts.py

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
    'Initial configuration seeded from hardcoded values in prompts.py'
);

