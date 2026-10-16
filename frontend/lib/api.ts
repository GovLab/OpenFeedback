import { z } from "zod";
import { http, API_URL } from "./http";
import { checkedResponse } from "./checked-response";

// Response schemas mirror backend/app/models.py. Objects are loose so fields
// the backend adds later do not break the page. Fields the backend sends as
// null are nullable or nullish.

const ClassifiedFeedbackSchema = z.looseObject({
  text: z.string(),
  category_map: z.record(z.string(), z.array(z.string())).nullish(),
  sentiment: z.string(),
  priority: z.string().nullish(),
  permit_type: z.string().nullish(),
  ai_summary: z.string().nullish(),
  department_predicted: z.string().nullish(),
  urgency_level: z.string().nullish(),
  impact_type: z.array(z.string()).nullish(),
  language: z.string().nullish(),
  config_version: z.number().nullish(),
});

const GraphNodeSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  text: z.string().nullish(),  // Full feedback text (only for Feedback nodes)
  sentiment: z.string().nullish(),  // Sentiment (only for Feedback nodes)
  timestamp: z.string().nullish(),  // Timestamp (only for Feedback nodes)
  name: z.string().nullish(),  // Name (only for Category/Subcategory nodes)
  deprecated: z.boolean().nullish(),  // True if category/subcategory is not in active config
});

const GraphRelationshipSchema = z.looseObject({
  source: z.string(),
  target: z.string(),
  type: z.string(),
});

const GraphDataSchema = z.looseObject({
  nodes: z.array(GraphNodeSchema),
  relationships: z.array(GraphRelationshipSchema),
});

const StatsSchema = z.looseObject({
  total_feedback: z.number(),
  categories: z.array(
    z.looseObject({
      category: z.string(),
      count: z.number(),
    })
  ),
});

const IndividualResponseSchema = z.looseObject({
  message: z.string(),
  text_content: z.string(),
  classified_feedback: ClassifiedFeedbackSchema.nullish(),
});

const FileUploadResponseSchema = z.looseObject({
  individual_responses: z.array(IndividualResponseSchema),
  original_filename: z.string(),
  file_type: z.string(),
});

const ConversationResponseSchema = z.looseObject({
  message: z.string(),
  needs_followup: z.boolean(),
  quality_score: z.number().nullish(),
  is_invalid: z.boolean().nullish(),
});

const FeedbackRecordSchema = z.looseObject({
  feedback_id: z.string(),
  timestamp_submitted: z.string().nullable(),
  timestamp_processed: z.string().nullable(),
  permit_type: z.string().nullable(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  issue_description: z.string(),
  ai_summary: z.string().nullable(),
  sentiment_score: z.number().nullable(),
  urgency_level: z.string().nullable(),
  status: z.string(),
  feedback_source: z.string(),
  department_predicted: z.string().nullable(),
  impact_type: z.array(z.string()).nullable(),
  language: z.string().nullable(),
  followup_opt_in: z.boolean().nullable(),
  user_contact_info: z
    .looseObject({
      name: z.string().nullish(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
    })
    .nullable(),
  config_version: z.number().nullable(),
});

const FeedbackListResponseSchema = z.looseObject({
  feedbacks: z.array(FeedbackRecordSchema),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

const AugmentationResponseSchema = z.looseObject({
  additional_note: z.string(),
});

const SegmentSaveResponseSchema = z.looseObject({
  individual_responses: z.array(IndividualResponseSchema),
});

// The 500 body when a staff upload could not save some segments
const UnsavedSegmentsSchema = z.looseObject({
  message: z.string(),
  saved_count: z.number(),
  total_count: z.number(),
  unsaved_segments: z.array(
    z.looseObject({
      position: z.number(),
      text_content: z.string(),
    })
  ),
});

export type ClassifiedFeedback = z.infer<typeof ClassifiedFeedbackSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphRelationship = z.infer<typeof GraphRelationshipSchema>;
export type GraphData = z.infer<typeof GraphDataSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type IndividualResponse = z.infer<typeof IndividualResponseSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
export type FeedbackRecord = z.infer<typeof FeedbackRecordSchema>;
export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>;
export type AugmentationResponse = z.infer<typeof AugmentationResponseSchema>;
export type SegmentSaveResponse = z.infer<typeof SegmentSaveResponseSchema>;
export type UnsavedSegments = z.infer<typeof UnsavedSegmentsSchema>;

// The `detail` the server sent with a failed request, if any
function serverDetail(error: unknown): unknown {
  return (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;
}

export function serverMessageFrom(error: unknown): string | null {
  const detail = serverDetail(error);
  return typeof detail === "string" ? detail : null;
}

export function unsavedSegmentsFrom(error: unknown): UnsavedSegments | null {
  const parsed = UnsavedSegmentsSchema.safeParse(serverDetail(error));
  return parsed.success ? parsed.data : null;
}

export interface FeedbackInput {
  text: string;
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

export interface AugmentationInput {
  original_feedback: string;
  conversation_history: ConversationMessage[];
}

export const api = {
  submitFeedback: async (
    feedback: FeedbackInput
  ): Promise<ClassifiedFeedback> => {
    return checkedResponse(
      "/api/submit-feedback",
      ClassifiedFeedbackSchema,
      http.post(`${API_URL}/api/submit-feedback`, feedback)
    );
  },

  uploadFeedbackFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    return checkedResponse(
      "/api/upload-feedback",
      FileUploadResponseSchema,
      http.post(`${API_URL}/api/upload-feedback`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    );
  },

  classifyFeedbackFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    return checkedResponse(
      "/api/classify-feedback",
      FileUploadResponseSchema,
      http.post(`${API_URL}/api/classify-feedback`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    );
  },

  getGraph: async (): Promise<GraphData> => {
    return checkedResponse(
      "/api/graph",
      GraphDataSchema,
      http.get(`${API_URL}/api/graph`)
    );
  },

  getStats: async (): Promise<Stats> => {
    return checkedResponse(
      "/api/stats",
      StatsSchema,
      http.get(`${API_URL}/api/stats`)
    );
  },

  feedbackAgent: async (
    input: ConversationInput
  ): Promise<ConversationResponse> => {
    return checkedResponse(
      "/api/feedback-agent",
      ConversationResponseSchema,
      http.post(`${API_URL}/api/feedback-agent`, input)
    );
  },

  getAllFeedback: async (limit: number = 100, offset: number = 0): Promise<FeedbackListResponse> => {
    return checkedResponse(
      "/api/postgres/feedback",
      FeedbackListResponseSchema,
      http.get(`${API_URL}/api/postgres/feedback`, {
        params: { limit, offset }
      })
    );
  },

  retryUnsavedSegments: async (segments: string[]): Promise<SegmentSaveResponse> => {
    return checkedResponse(
      "/api/upload-feedback/retry",
      SegmentSaveResponseSchema,
      http.post(`${API_URL}/api/upload-feedback/retry`, { segments })
    );
  },

  augmentFeedback: async (
    input: AugmentationInput
  ): Promise<AugmentationResponse> => {
    return checkedResponse(
      "/api/augment-feedback",
      AugmentationResponseSchema,
      http.post(`${API_URL}/api/augment-feedback`, input)
    );
  },
};
