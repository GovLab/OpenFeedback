"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, Clock, FileText, Inbox, RefreshCw, SearchX, Tag } from "lucide-react";
import { api, FeedbackRecord } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { StateMessage } from "@/components/ui/StateMessage";
import { buttonClass, CARD, ICON_BUTTON } from "@/components/ui/styles";
import { ActiveFilters } from "./table/ActiveFilters";
import { FeedbackRow, COLUMN_COUNT } from "./table/FeedbackRow";
import { FilterMenu } from "./table/FilterMenu";
import { buildFilterOptions, EMPTY_FILTERS, Filters, groupByVersion } from "./table/tableUtils";

interface FeedbackTableProps {
  refreshTrigger?: number;
}

const PAGE_SIZE = 50;
const TH = "px-4 py-3 text-sm font-semibold text-slate-700";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function FeedbackTable({ refreshTrigger }: FeedbackTableProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filterOptions = useMemo(() => buildFilterOptions(feedbacks), [feedbacks]);
  const groups = useMemo(() => groupByVersion(feedbacks, filters), [feedbacks, filters]);
  const visibleIds = useMemo(() => groups.flatMap((g) => g.rows.map((f) => f.feedback_id)), [groups]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const allExpanded = visibleIds.length > 0 && visibleIds.every((id) => expandedRows.has(id));

  const clearAllFilters = () => setFilters(EMPTY_FILTERS);
  const updateFilter = (key: keyof Filters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await api.getAllFeedback(PAGE_SIZE, 0);
      setFeedbacks(response.feedbacks);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching feedbacks:", err);
      setError("Failed to load feedback data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [refreshTrigger]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllRows = () => setExpandedRows(allExpanded ? new Set() : new Set(visibleIds));

  const column = (label: string, key: keyof Filters, options: string[], width: string, icon?: React.ReactNode) => (
    <th scope="col" className={`${TH} ${width} ${icon ? "text-left" : "text-center"}`}>
      <FilterMenu
        label={label}
        options={options}
        value={filters[key]}
        onChange={(v) => updateFilter(key, v)}
        align={icon ? "left" : "center"}
        icon={icon}
      />
    </th>
  );

  if (loading) {
    return <StateMessage kind="loading" title="Loading feedback data..." />;
  }

  if (error) {
    return (
      <StateMessage
        kind="error"
        title={error}
        action={
          <button type="button" onClick={fetchFeedbacks} className={buttonClass("secondary", "sm")}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        }
      />
    );
  }

  if (feedbacks.length === 0) {
    return (
      <StateMessage
        kind="empty"
        icon={<Inbox className="h-12 w-12" strokeWidth={1.5} aria-hidden="true" />}
        title="No feedback data available"
        detail="Submit some feedback to see it here"
      />
    );
  }

  return (
    <div className={`${CARD} overflow-hidden`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="text-base text-[#091F2F]">Feedback Database</h3>
          <FilterMenu
            label="Version"
            options={filterOptions.versions}
            value={filters.version}
            onChange={(v) => updateFilter("version", v)}
            icon={<Tag className="h-3.5 w-3.5" aria-hidden="true" />}
            formatOption={(v) => `Version ${v}`}
          />
        </div>
        <button type="button" onClick={fetchFeedbacks} className={buttonClass("secondary", "sm")}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <ActiveFilters filters={filters} onRemove={(key) => updateFilter(key, "")} onClearAll={clearAllFilters} />

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[680px] lg:min-w-[960px]">
          <caption className="sr-only">
            Feedback submissions, grouped by configuration version. Use the column buttons to filter and the last
            column to show details. On narrow screens the department and impact columns move into the details.
          </caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className={`${TH} w-24 text-center`}>
                <span className="font-ui inline-flex items-center gap-1 text-[13px]">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Time
                </span>
              </th>
              {column("Issue", "permitType", filterOptions.permitTypes, "", <FileText className="h-3.5 w-3.5" aria-hidden="true" />)}
              {column("Department", "department", filterOptions.departments, "hidden w-40 lg:table-cell")}
              {column("Impact", "impact", filterOptions.impacts, "hidden w-52 lg:table-cell")}
              {column("Sentiment", "sentiment", filterOptions.sentiments, "w-28")}
              {column("Urgency", "urgency", filterOptions.urgencies, "w-28")}
              {column("Status", "status", filterOptions.statuses, "w-28")}
              <th scope="col" className={`${TH} w-16 text-center`}>
                <button
                  type="button"
                  onClick={toggleAllRows}
                  className={`${ICON_BUTTON} text-[#1871bd]`}
                  aria-label={allExpanded ? "Collapse all rows" : "Expand all rows"}
                  title={allExpanded ? "Collapse all rows" : "Expand all rows"}
                >
                  {allExpanded ? (
                    <ChevronsDownUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </th>
            </tr>
          </thead>
          {groups.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={COLUMN_COUNT}>
                  <StateMessage
                    kind="empty"
                    bare
                    icon={<SearchX className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />}
                    title="No feedback matches your filters"
                    action={
                      <button type="button" onClick={clearAllFilters} className={buttonClass("ghost", "sm")}>
                        Clear all filters
                      </button>
                    }
                  />
                </td>
              </tr>
            </tbody>
          )}
          {groups.map((group) => (
            <tbody key={group.version ?? "none"} className="divide-y divide-slate-200 border-t border-slate-200 bg-white">
              <tr className="bg-slate-100/70">
                <th scope="rowgroup" colSpan={COLUMN_COUNT} className="px-6 py-2.5 text-left font-normal">
                  <span className="flex items-center gap-3">
                    <Badge tone={group.version ? "green" : "neutral"} size="md">
                      {group.version ? `Version ${group.version}` : "Version N/A"}
                    </Badge>
                    <span className="text-sm text-slate-600">{plural(group.rows.length, "item", "items")}</span>
                  </span>
                </th>
              </tr>
              {group.rows.map((feedback) => (
                <FeedbackRow
                  key={feedback.feedback_id}
                  feedback={feedback}
                  expanded={expandedRows.has(feedback.feedback_id)}
                  onToggle={() => toggleRow(feedback.feedback_id)}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Footer - Only shows when filters are active */}
      {activeFilterCount > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
          <p role="status" className="text-center text-sm text-slate-600">
            Showing {visibleIds.length} of {feedbacks.length} entries
            <button type="button" onClick={clearAllFilters} className="ml-2 font-semibold text-[#0f4c81] hover:underline">
              Clear filters
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
