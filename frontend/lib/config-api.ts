// System Configuration API Types and Mock Functions

export interface Category {
  name: string;
  subcategories: string[];
}

export interface SystemConfig {
  categories: Category[];
  permit_types: string[];
  departments: string[];
  impact_types: string[];
  urgency_levels: string[];
  sentiment_options: string[];
  priority_levels: string[];
}

export interface ConfigVersion {
  version: number;
  created_at: string;
  created_by?: string;
  change_notes?: string;
  is_active: boolean;
}

export interface ConfigHistoryResponse {
  versions: ConfigVersion[];
  current_version: number;
}

// Mock data matching current hardcoded values from prompts.py
const MOCK_CONFIG: SystemConfig = {
  categories: [
    {
      name: "Economic & Equity Concerns",
      subcategories: [
        "High or Unexpected Costs",
        "Access or Fairness Barriers"
      ]
    },
    {
      name: "Communication & Service Problems",
      subcategories: [
        "Poor Communication / Experience",
        "Service Responsiveness & Transparency"
      ]
    },
    {
      name: "Technology & Access Barriers",
      subcategories: [
        "Technical / Portal Problems",
        "Digital Access & Portal Problems"
      ]
    },
    {
      name: "Process & Operational Flow Issues",
      subcategories: [
        "Confusion or Missing Guidance",
        "Delays or Waiting Too Long",
        "Conflicting Departments / Redundant Steps",
        "Procedural & Coordination Issues"
      ]
    },
    {
      name: "Policy & Rules Clarity",
      subcategories: [
        "Outdated or Unclear Rules",
        "Rules & Policy Gaps"
      ]
    }
  ],
  permit_types: [
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
  departments: [
    "Inspectional Services",
    "Licensing Board",
    "Public Works",
    "Fire Department",
    "Building Department"
  ],
  impact_types: [
    "Time Lost",
    "Financial Cost",
    "Business Impact",
    "Safety Concern",
    "Legal/Compliance",
    "Customer Experience",
    "Project Delay"
  ],
  urgency_levels: ["Low", "Medium", "High"],
  sentiment_options: ["Positive", "Negative", "Neutral"],
  priority_levels: ["High", "Medium", "Low"]
};

// Mock API functions (will be replaced with real API calls in Phase 4)
export const configApi = {
  getConfig: async (): Promise<SystemConfig> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_CONFIG;
  },

  updateConfig: async (config: SystemConfig, changeNotes?: string): Promise<{ success: boolean; version: number }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("Mock: Saving config", config);
    console.log("Mock: Change notes", changeNotes);
    return { success: true, version: 2 };
  },

  getConfigHistory: async (): Promise<ConfigHistoryResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      versions: [
        {
          version: 1,
          created_at: "2025-01-01T10:00:00Z",
          created_by: "admin@boston.gov",
          change_notes: "Initial configuration",
          is_active: false
        },
        {
          version: 2,
          created_at: new Date().toISOString(),
          created_by: "admin@boston.gov",
          change_notes: "Updated categories",
          is_active: true
        }
      ],
      current_version: 2
    };
  }
};

