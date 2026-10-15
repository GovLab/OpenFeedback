import { Funnel, X } from "lucide-react";
import { Filters } from "./tableUtils";

// Removable pills for each active filter, plus "Clear all"

const NAMES: Record<keyof Filters, string> = {
  permitType: "Issue",
  department: "Department",
  impact: "Impact",
  sentiment: "Sentiment",
  urgency: "Urgency",
  status: "Status",
  version: "Version",
};

interface ActiveFiltersProps {
  filters: Filters;
  onRemove: (key: keyof Filters) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  const active = (Object.keys(NAMES) as (keyof Filters)[]).filter((key) => filters[key]);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#1871bd]/5 px-6 py-2.5">
      <span className="font-ui flex items-center gap-1 text-xs font-semibold text-[#091F2F]">
        <Funnel className="h-3.5 w-3.5" aria-hidden="true" />
        Filtering by:
      </span>
      <ul className="flex flex-wrap items-center gap-2">
        {active.map((key) => (
          <li
            key={key}
            className="font-ui inline-flex items-center gap-1 rounded-full border border-[#1871bd]/30 bg-white py-0.5 pr-1 pl-2.5 text-xs font-semibold text-[#0f4c81]"
          >
            <span className="font-medium text-slate-600">{NAMES[key]}:</span> {filters[key]}
            <button
              type="button"
              onClick={() => onRemove(key)}
              aria-label={`Remove ${NAMES[key]} filter: ${filters[key]}`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[#0f4c81] hover:bg-[#1871bd]/10"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto rounded px-1 text-xs font-semibold text-[var(--text-danger)] hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
