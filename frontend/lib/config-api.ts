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
  config_id: string;
  version: number;
  config_data: SystemConfig;
  created_at: string;
  created_by?: string;
  change_notes?: string;
  is_active: boolean;
}

export interface ConfigHistoryResponse {
  versions: ConfigVersion[];
  current_version: number;
}

// API functions
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
  },

  getConfigByVersion: async (version: number): Promise<SystemConfig> => {
    const response = await axios.get(`${API_URL}/api/config/${version}`);
    return response.data.config_data;
  },

  activateVersion: async (version: number): Promise<{ success: boolean; version: number }> => {
    const response = await axios.put(`${API_URL}/api/config/activate/${version}`);
    return {
      success: response.data.success,
      version: response.data.version
    };
  },

  deleteVersion: async (version: number): Promise<{ success: boolean; version: number }> => {
    const response = await axios.delete(`${API_URL}/api/config/${version}`);
    return {
      success: response.data.success,
      version: response.data.version
    };
  }
};

