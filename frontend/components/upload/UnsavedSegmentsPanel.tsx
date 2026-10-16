"use client";

import type { UnsavedSegments } from "@/lib/api";
import { buttonClass } from "@/components/ui/styles";

// Staff-only preview of segments that were not saved. Staff uploaded them, so the
// text is shown here; it is never written to the server log.
const PREVIEW_CHARS = 140;

export function previewOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_CHARS ? `${flat.slice(0, PREVIEW_CHARS)}...` : flat;
}

interface UnsavedSegmentsPanelProps {
  failure: UnsavedSegments;
  onRetry: () => void;
  disabled: boolean;
}

export function UnsavedSegmentsPanel({ failure, onRetry, disabled }: UnsavedSegmentsPanelProps) {
  const count = failure.unsaved_segments.length;

  return (
    <section aria-labelledby="unsaved-heading" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h4 id="unsaved-heading" className="mb-2 text-sm font-semibold text-slate-900">
        {count} segment{count === 1 ? "" : "s"} could not be saved
      </h4>
      <p className="mb-3 text-sm text-slate-700">
        {failure.saved_count} of {failure.total_count} segments were saved. Trying again only saves the ones below,
        so nothing is stored twice. Use Clear to start over with a different file.
      </p>
      <ol className="mb-4 space-y-2 text-sm text-slate-800">
        {failure.unsaved_segments.map((segment) => (
          <li key={segment.position} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
            <span className="font-semibold">Segment {segment.position}:</span> {previewOf(segment.text_content)}
          </li>
        ))}
      </ol>
      <button type="button" onClick={onRetry} disabled={disabled} className={buttonClass("primary", "md")}>
        Try saving again
      </button>
    </section>
  );
}
