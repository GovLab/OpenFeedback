import { FeedbackRecord } from "@/lib/api";

// Filtering, grouping and formatting for the feedback table

export interface Filters {
  urgency: string;
  status: string;
  department: string;
  permitType: string;
  sentiment: string;
  impact: string;
  version: string;
}

export const EMPTY_FILTERS: Filters = {
  urgency: "", status: "", department: "", permitType: "", sentiment: "", impact: "", version: "",
};

const POSITIVE_ABOVE = 0.3;
const NEGATIVE_BELOW = -0.3;
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
const RELATIVE_DAYS = 7;

export function sentimentFromScore(score: number | null): string {
  if (score === null) return "Unknown";
  if (score > POSITIVE_ABOVE) return "Positive";
  if (score < NEGATIVE_BELOW) return "Negative";
  return "Neutral";
}

const sortedUnique = (values: Iterable<string>) => Array.from(new Set(values)).sort();

export function buildFilterOptions(feedbacks: FeedbackRecord[]) {
  const pick = (get: (f: FeedbackRecord) => string | null) =>
    sortedUnique(feedbacks.map(get).filter((v): v is string => !!v));
  const versions = new Set<number>();
  feedbacks.forEach((f) => {
    if (f.config_version !== null && f.config_version !== undefined) versions.add(f.config_version);
  });
  return {
    urgencies: pick((f) => f.urgency_level),
    statuses: pick((f) => f.status),
    departments: pick((f) => f.department_predicted),
    permitTypes: pick((f) => f.permit_type),
    sentiments: sortedUnique(feedbacks.map((f) => sentimentFromScore(f.sentiment_score))),
    impacts: sortedUnique(feedbacks.flatMap((f) => f.impact_type ?? [])),
    versions: Array.from(versions).sort((a, b) => b - a).map(String), // Newest first
  };
}

function matches(f: FeedbackRecord, filters: Filters): boolean {
  if (filters.urgency && f.urgency_level !== filters.urgency) return false;
  if (filters.status && f.status !== filters.status) return false;
  if (filters.department && f.department_predicted !== filters.department) return false;
  if (filters.permitType && f.permit_type !== filters.permitType) return false;
  if (filters.sentiment && sentimentFromScore(f.sentiment_score) !== filters.sentiment) return false;
  if (filters.impact && (!f.impact_type || !f.impact_type.includes(filters.impact))) return false;
  // When filtering by version, exclude null versions and only include exact matches
  if (filters.version && (f.config_version === null || f.config_version.toString() !== filters.version)) return false;
  return true;
}

const submittedAt = (f: FeedbackRecord) => (f.timestamp_submitted ? new Date(f.timestamp_submitted).getTime() : 0);

export interface VersionGroup {
  version: number | null;
  rows: FeedbackRecord[];
}

// Filtered rows grouped by config version: newest version first, rows without
// a version last, newest feedback first inside each group
export function groupByVersion(feedbacks: FeedbackRecord[], filters: Filters): VersionGroup[] {
  const groups = new Map<number | null, FeedbackRecord[]>();
  feedbacks.filter((f) => matches(f, filters)).forEach((f) => {
    const key = f.config_version ?? null;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([version, rows]) => ({ version, rows: [...rows].sort((x, y) => submittedAt(y) - submittedAt(x)) }));
}

export function shortDate(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "5m ago", "3h ago", "2d ago"; empty after a week, when the date alone is shown
export function relativeTime(dateString: string | null): string {
  if (!dateString) return "N/A";
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (diffMs < MS_PER_HOUR) return `${Math.floor(diffMs / MS_PER_MINUTE)}m ago`;
  if (diffMs < MS_PER_DAY) return `${Math.floor(diffMs / MS_PER_HOUR)}h ago`;
  const days = Math.floor(diffMs / MS_PER_DAY);
  return days < RELATIVE_DAYS ? `${days}d ago` : "";
}
