import { NodeKind } from "@/lib/graphModel";

// Colours and type for the feedback graph. Label colours are the dark
// shade of each node colour so text passes WCAG AA (7:1+) on white.

export const NODE_COLOR: Record<NodeKind | "Deprecated", string> = {
  Feedback: "#3b82f6",
  Category: "#10b981",
  Subcategory: "#f59e0b",
  Deprecated: "#9ca3af",
};

export const LABEL_COLOR: Record<NodeKind | "Deprecated", string> = {
  Feedback: "#1e40af",
  Category: "#065f46",
  Subcategory: "#92400e",
  Deprecated: "#4b5563",
};

export const LINK_COLOR = "#94a3b8";
export const LINK_ACTIVE = "#2563eb";
export const BADGE_FILL = "#1e293b";
export const FOCUS_COLOR = "#091F2F"; // Boston Charles Blue
export const DIM_OPACITY = 0.15;

export const MONTSERRAT = "var(--font-montserrat), Montserrat, sans-serif";
export const LORA = "var(--font-lora), Lora, serif";

// Entrance timing (ms): categories, then subcategories, then feedback
export const ENTRANCE = {
  categoryStep: 90,
  subcategoryStart: 450,
  subcategoryStep: 30,
  feedbackStart: 900,
  feedbackSpan: 900,
};
