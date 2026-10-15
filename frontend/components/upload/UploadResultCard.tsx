"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { IndividualResponse } from "@/lib/api";
import { sentimentTone } from "@/lib/tones";
import { Badge } from "@/components/ui/Badge";
import { EYEBROW } from "@/components/ui/styles";

// One classified item from an uploaded file. "compact" is the grid tile used
// when a file yields several items; it shows two categories at most.

const COMPACT_CATEGORY_LIMIT = 2;

function CategoryList({ categoryMap, compact }: { categoryMap: Record<string, string[]>; compact: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const entries = Object.entries(categoryMap);
  const shown = compact ? entries.slice(0, COMPACT_CATEGORY_LIMIT) : entries;

  const toggle = (category: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const chip = `w-full flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-left font-semibold text-[#065f46] ${
    compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
  }`;

  return (
    <ul className="space-y-2">
      {shown.map(([category, subcategories]) => {
        const hasSubs = subcategories && subcategories.length > 0;
        const isOpen = expanded.has(category);
        return (
          <li key={category} className="space-y-2">
            {hasSubs ? (
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(category)} className={`${chip} hover:bg-emerald-100`}>
                <span className={`flex-1 ${compact ? "truncate" : ""}`}>{category}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs">
                  {subcategories.length}
                  <span className="sr-only"> subcategories</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" />
                </span>
              </button>
            ) : (
              <span className={chip}>{category}</span>
            )}
            {hasSubs && isOpen && (
              <ul className="flex flex-wrap gap-1.5 pl-3">
                {subcategories.map((sub) => (
                  <li key={sub} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#92400e]">
                    {sub}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
      {compact && entries.length > COMPACT_CATEGORY_LIMIT && (
        <li className="px-2 text-xs text-slate-600">+{entries.length - COMPACT_CATEGORY_LIMIT} more</li>
      )}
    </ul>
  );
}

interface UploadResultCardProps {
  response: IndividualResponse;
  index: number;
  compact: boolean;
}

export function UploadResultCard({ response, index, compact }: UploadResultCardProps) {
  const classified = response.classified_feedback;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {classified && (
        <div className={`flex items-center justify-between gap-3 border-b border-slate-200 ${compact ? "px-4 py-3" : "px-5 py-3.5"}`}>
          <h5 className={compact ? EYEBROW : "text-sm font-semibold text-[#091F2F]"}>
            {compact ? `Feedback ${index + 1}` : "Feedback Details"}
          </h5>
          <Badge tone={sentimentTone(classified.sentiment)} dot className="capitalize">
            {classified.sentiment}
          </Badge>
        </div>
      )}

      <div className={`flex flex-1 flex-col ${compact ? "gap-3 p-4" : "gap-5 p-5"}`}>
        {!compact && (
          <div>
            <h6 className={`${EYEBROW} mb-2`}>Summary</h6>
            <p className="text-sm leading-relaxed text-[#091F2F]">{response.message}</p>
          </div>
        )}

        {response.text_content && (
          <div
            tabIndex={0}
            aria-label="Extracted text"
            className={`overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 text-[#091F2F] ${
              compact ? "max-h-24 min-h-16 p-2.5 text-xs" : "max-h-32 min-h-24 p-3 text-sm"
            }`}
          >
            <p className="whitespace-pre-wrap">{response.text_content}</p>
          </div>
        )}

        {classified?.category_map && (
          <div>
            {!compact && <h6 className={`${EYEBROW} mb-3`}>Categories</h6>}
            <CategoryList categoryMap={classified.category_map} compact={compact} />
          </div>
        )}
      </div>
    </article>
  );
}
