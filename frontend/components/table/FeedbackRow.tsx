import { ChevronDown, Mail } from "lucide-react";
import { FeedbackRecord } from "@/lib/api";
import { statusTone, urgencyTone } from "@/lib/tones";
import { Badge } from "@/components/ui/Badge";
import { FeedbackDetails } from "./FeedbackDetails";
import { relativeTime, sentimentFromScore, shortDate } from "./tableUtils";

export const COLUMN_COUNT = 8;
const IMPACTS_SHOWN = 2;
const LABEL_CHARS = 80;

const SENTIMENT_TEXT: Record<string, string> = {
  Positive: "text-green-700",
  Neutral: "text-amber-700",
  Negative: "text-red-700",
  Unknown: "text-slate-600",
};

interface FeedbackRowProps {
  feedback: FeedbackRecord;
  expanded: boolean;
  onToggle: () => void;
}

export function FeedbackRow({ feedback, expanded, onToggle }: FeedbackRowProps) {
  const detailsId = `feedback-details-${feedback.feedback_id}`;
  const summary = feedback.ai_summary || feedback.issue_description;
  const sentiment = sentimentFromScore(feedback.sentiment_score);
  const ago = relativeTime(feedback.timestamp_submitted);
  const impacts = feedback.impact_type ?? [];

  return (
    <>
      <tr
        className={`align-middle transition-colors ${
          expanded ? "bg-[#1871bd]/5 shadow-[inset_3px_0_0_#1871bd]" : "hover:bg-slate-50"
        }`}
      >
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <div className="flex flex-col items-center gap-0.5">
            {ago && <span className="text-xs font-semibold text-slate-900">{ago}</span>}
            {feedback.timestamp_submitted && (
              <time dateTime={feedback.timestamp_submitted} className="text-xs text-slate-600">
                {shortDate(feedback.timestamp_submitted)}
              </time>
            )}
            {feedback.followup_opt_in && (
              <span className="font-ui mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-success)]" title="Contact info available">
                <Mail className="h-3 w-3" aria-hidden="true" />
                Contact
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex max-w-md flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {feedback.permit_type && <Badge tone="brand">{feedback.permit_type}</Badge>}
              {feedback.language && feedback.language !== "en" && (
                <Badge tone="violet">{feedback.language.toUpperCase()}</Badge>
              )}
            </div>
            <p className={`line-clamp-2 text-sm ${feedback.ai_summary ? "text-slate-900" : "text-slate-700"}`}>{summary}</p>
            {feedback.category && (
              <p className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
                <span className="font-medium">{feedback.category}</span>
                {feedback.subcategory && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>{feedback.subcategory}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </td>
        <td className="hidden px-4 py-3 text-center text-sm font-medium whitespace-nowrap text-slate-900 lg:table-cell">
          {feedback.department_predicted || <span className="text-slate-500">Unassigned</span>}
        </td>
        <td className="hidden px-4 py-3 text-center lg:table-cell">
          <div className="flex flex-wrap justify-center gap-1">
            {impacts.length > 0 ? (
              impacts.slice(0, IMPACTS_SHOWN).map((impact) => (
                <Badge key={impact} className="whitespace-normal">{impact}</Badge>
              ))
            ) : (
              <span className="text-xs text-slate-500">None</span>
            )}
            {impacts.length > IMPACTS_SHOWN && (
              <span className="text-xs font-medium text-slate-600" title={impacts.slice(IMPACTS_SHOWN).join(", ")}>
                +{impacts.length - IMPACTS_SHOWN}
                <span className="sr-only"> more</span>
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <span className={`font-ui inline-flex items-center gap-1.5 text-xs font-semibold ${SENTIMENT_TEXT[sentiment]}`}>
            <span
              className={`h-2 w-2 rounded-full ${sentiment === "Unknown" ? "border border-slate-400" : "bg-current"}`}
              aria-hidden="true"
            />
            {sentiment}
          </span>
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          {feedback.urgency_level ? (
            <Badge tone={urgencyTone(feedback.urgency_level)} dot>{feedback.urgency_level}</Badge>
          ) : (
            <span className="text-xs text-slate-500" aria-label="No urgency">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <Badge tone={statusTone(feedback.status)}>{feedback.status}</Badge>
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={expanded ? detailsId : undefined}
            aria-label={`${expanded ? "Hide" : "View"} details: ${summary.slice(0, LABEL_CHARS)}`}
            title={expanded ? "Hide details" : "View details"}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              expanded ? "bg-[#1871bd] text-white hover:bg-[#091F2F]" : "text-[#1871bd] hover:bg-[#1871bd]/10"
            }`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </td>
      </tr>

      {expanded && (
        <tr id={detailsId} className="bg-[#1871bd]/[0.03] shadow-[inset_3px_0_0_#1871bd]">
          <td colSpan={COLUMN_COUNT} className="px-6 pt-1 pb-5">
            <div role="region" aria-label={`Details: ${summary.slice(0, LABEL_CHARS)}`}>
              <FeedbackDetails feedback={feedback} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
