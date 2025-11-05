import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

export const api = {
  submitFeedback: async (
    feedback: FeedbackInput
  ): Promise<ClassifiedFeedback> => {
    const response = await axios.post(`${API_URL}/api/submit-feedback`, feedback);
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

  classifyFeedbackFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${API_URL}/api/classify-feedback`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
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

  feedbackAgent: async (
    input: ConversationInput
  ): Promise<ConversationResponse> => {
    const response = await axios.post(`${API_URL}/api/feedback-agent`, input);
    return response.data;
  },

  getAllFeedback: async (limit: number = 100, offset: number = 0): Promise<FeedbackListResponse> => {
    const response = await axios.get(`${API_URL}/api/postgres/feedback`, {
      params: { limit, offset }
    });
    return response.data;
  },

  augmentFeedback: async (
    input: AugmentationInput
  ): Promise<AugmentationResponse> => {
    const response = await axios.post(`${API_URL}/api/augment-feedback`, input);
    return response.data;
  },
};

export interface FeedbackInput {
  text: string;
}

export interface ClassifiedFeedback {
  text: string;
  category_map?: { [category: string]: string[] };
  sentiment: string;
  priority?: string;
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

export interface IndividualResponse {
  message: string;
  text_content: string;
  classified_feedback?: ClassifiedFeedback;
}

export interface FileUploadResponse {
  individual_responses: IndividualResponse[];
  original_filename: string;
  file_type: string;
}

export interface ConversationMessage {
  role: string;
  content: string;
}

export interface ConversationInput {
  original_feedback: string;
  category_map: { [category: string]: string[] };
  conversation_history: ConversationMessage[];
}

export interface ConversationResponse {
  message: string;
  needs_followup: boolean;
  quality_score?: number;
}

export interface FeedbackRecord {
  feedback_id: string;
  timestamp_submitted: string | null;
  timestamp_processed: string | null;
  permit_type: string | null;
  category: string | null;
  subcategory: string | null;
  issue_description: string;
  ai_summary: string | null;
  sentiment_score: number | null;
  urgency_level: string | null;
  status: string;
  feedback_source: string;
  department_predicted: string | null;
  impact_type: string[] | null;
  language: string | null;
}

export interface FeedbackListResponse {
  feedbacks: FeedbackRecord[];
  count: number;
  limit: number;
  offset: number;
}

export interface AugmentationInput {
  original_feedback: string;
  conversation_history: ConversationMessage[];
}

export interface AugmentationResponse {
  additional_note: string;
}
