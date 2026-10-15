import { ModelNode, NodeKind } from "@/lib/graphModel";

// Colours and type for the feedback graph. Label colours are the dark
// shade of each node colour so text passes WCAG AA (7:1+) on white.

export const NODE_COLOR: Record<NodeKind | "Deprecated" | "System", string> = {
  Feedback: "#3b82f6",
  Category: "#047857", // 5.5:1 against white
  Subcategory: "#b45309", // 5.0:1
  Deprecated: "#6b7280", // 4.8:1
  System: "#64748b", // neutral slate, 4.8:1 against white
};

export const LABEL_COLOR: Record<NodeKind | "Deprecated" | "System", string> = {
  Feedback: "#1e40af",
  Category: "#065f46",
  Subcategory: "#92400e",
  Deprecated: "#4b5563",
  System: "#334155", // 10:1 on white
};

export type Tone = NodeKind | "Deprecated" | "System";

// Which colour set a node uses
export const toneOf = (node: ModelNode): Tone =>
  node.deprecated ? "Deprecated" : node.isSystem ? "System" : node.kind;

// Links and nodes must reach 3:1 against the white frame (WCAG 1.4.11)
export const LINK_COLOR = "#64748b"; // 4.8:1 at full opacity
export const LINK_OPACITY = 0.85; // 3.6:1 at this opacity
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
