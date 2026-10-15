import type { BadgeTone } from "@/components/ui/Badge";

// Badge tones for feedback fields. Unknown values fall back to neutral.

const STATUS: Record<string, BadgeTone> = {
  New: "brand",
  Routed: "purple",
  Acknowledged: "amber",
  "In Progress": "orange",
  Updated: "indigo",
  Closed: "green",
};

const URGENCY: Record<string, BadgeTone> = { Low: "green", Medium: "amber", High: "red" };

const SENTIMENT: Record<string, BadgeTone> = { positive: "green", neutral: "amber", negative: "red" };

export const statusTone = (status: string): BadgeTone => STATUS[status] ?? "neutral";
export const urgencyTone = (urgency: string): BadgeTone => URGENCY[urgency] ?? "neutral";
export const sentimentTone = (label: string): BadgeTone => SENTIMENT[label.toLowerCase()] ?? "neutral";
