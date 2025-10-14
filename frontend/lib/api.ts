import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export const api = {
  submitFeedback: async (feedback: FeedbackInput): Promise<ClassifiedFeedback> => {
    const response = await axios.post(`${API_URL}/api/feedback`, feedback);
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
