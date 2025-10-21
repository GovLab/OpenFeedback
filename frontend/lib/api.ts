import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

export const api = {
  submitFeedback: async (
    feedback: FeedbackInput
  ): Promise<ClassifiedFeedback> => {
    const response = await axios.post(`${API_URL}/api/feedback`, feedback);
    return response.data;
  },

  uploadFeedbackFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${API_URL}/api/upload-feedback`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  uploadAndClassifyText: async (file: File): Promise<ClassifiedFeedback> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API_URL}/api/upload-text`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getGraph: async (): Promise<GraphData> => {
    const response = await axios.get(`${API_URL}/api/graph`);
    return response.data;
  },

  getStats: async (): Promise<Stats> => {
    const response = await axios.get(`${API_URL}/api/stats`);
    return response.data;
  },
};

export interface FeedbackInput {
  text: string;
}

export interface ClassifiedFeedback {
  text: string;
  categories: string[];
  subcategories: string[];
  sentiment: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphRelationship {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface Stats {
  total_feedback: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
}

export interface FileUploadResponse {
  message: string;
  text_content: string;
  original_filename: string;
  file_type: string;
  classified_feedback: ClassifiedFeedback;
}
