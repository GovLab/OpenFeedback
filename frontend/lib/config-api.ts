// System Configuration API Types and Functions

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

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

// Real API functions
export const configApi = {
  getConfig: async (): Promise<SystemConfig> => {
    const response = await axios.get(`${API_URL}/api/config`, {
      // Prevent redirect on trailing slash
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    return response.data.config_data;
  },

  updateConfig: async (
    config: SystemConfig, 
    changeNotes?: string,
    createdBy?: string
  ): Promise<{ success: boolean; version: number }> => {
    const response = await axios.put(`${API_URL}/api/config`, {
      config_data: config,
      change_notes: changeNotes,
      created_by: createdBy
    });
    return {
      success: response.data.success,
      version: response.data.version
    };
  },

  getConfigHistory: async (): Promise<ConfigHistoryResponse> => {
    const response = await axios.get(`${API_URL}/api/config/history`);
    return response.data;
  }
};

