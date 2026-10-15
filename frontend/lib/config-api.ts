// System Configuration API Types and Functions

import { z } from "zod";
import { http, API_URL } from "./http";
import { checkedResponse } from "./checked-response";

// Response schemas mirror the config models in backend/app/models.py.

const CategorySchema = z.looseObject({
  name: z.string(),
  subcategories: z.array(z.string()),
});

const SystemConfigSchema = z.looseObject({
  categories: z.array(CategorySchema),
  permit_types: z.array(z.string()),
  departments: z.array(z.string()),
  impact_types: z.array(z.string()),
  urgency_levels: z.array(z.string()),
  sentiment_options: z.array(z.string()),
  priority_levels: z.array(z.string()),
});

const ConfigVersionSchema = z.looseObject({
  config_id: z.string(),
  version: z.number(),
  config_data: SystemConfigSchema,
  created_at: z.string().nullish(),
  created_by: z.string().nullish(),
  change_notes: z.string().nullish(),
  is_active: z.boolean(),
});

const ConfigResponseSchema = z.looseObject({
  config_id: z.string(),
  version: z.number(),
  config_data: SystemConfigSchema,
  created_at: z.string().nullish(),
  created_by: z.string().nullish(),
  change_notes: z.string().nullish(),
});

const ConfigHistoryResponseSchema = z.looseObject({
  versions: z.array(ConfigVersionSchema),
  current_version: z.number().nullish(),
});

const ConfigUpdateResponseSchema = z.looseObject({
  success: z.boolean(),
  version: z.number(),
  message: z.string().nullish(),
});

export type Category = z.infer<typeof CategorySchema>;
export type SystemConfig = z.infer<typeof SystemConfigSchema>;
export type ConfigVersion = z.infer<typeof ConfigVersionSchema>;
export type ConfigHistoryResponse = z.infer<typeof ConfigHistoryResponseSchema>;
type ConfigUpdateResponse = z.infer<typeof ConfigUpdateResponseSchema>;

// API functions
export const configApi = {
  getConfig: async (): Promise<SystemConfig> => {
    const response = await checkedResponse(
      "/api/config",
      ConfigResponseSchema,
      http.get(`${API_URL}/api/config`, {
        // Prevent redirect on trailing slash
        maxRedirects: 0,
        validateStatus: (status) => status < 400
      })
    );
    return response.config_data;
  },

  updateConfig: async (
    config: SystemConfig,
    changeNotes?: string,
    createdBy?: string
  ): Promise<{ success: boolean; version: number }> => {
    const response: ConfigUpdateResponse = await checkedResponse(
      "/api/config",
      ConfigUpdateResponseSchema,
      http.put(`${API_URL}/api/config`, {
        config_data: config,
        change_notes: changeNotes,
        created_by: createdBy
      })
    );
    return {
      success: response.success,
      version: response.version
    };
  },

  getConfigHistory: async (): Promise<ConfigHistoryResponse> => {
    return checkedResponse(
      "/api/config/history",
      ConfigHistoryResponseSchema,
      http.get(`${API_URL}/api/config/history`)
    );
  },

  getConfigByVersion: async (version: number): Promise<SystemConfig> => {
    const response = await checkedResponse(
      "/api/config/{version}",
      ConfigResponseSchema,
      http.get(`${API_URL}/api/config/${version}`)
    );
    return response.config_data;
  },

  activateVersion: async (version: number): Promise<{ success: boolean; version: number }> => {
    const response: ConfigUpdateResponse = await checkedResponse(
      "/api/config/activate/{version}",
      ConfigUpdateResponseSchema,
      http.put(`${API_URL}/api/config/activate/${version}`)
    );
    return {
      success: response.success,
      version: response.version
    };
  },

  deleteVersion: async (version: number): Promise<{ success: boolean; version: number }> => {
    const response: ConfigUpdateResponse = await checkedResponse(
      "/api/config/{version}",
      ConfigUpdateResponseSchema,
      http.delete(`${API_URL}/api/config/${version}`)
    );
    return {
      success: response.success,
      version: response.version
    };
  }
};
