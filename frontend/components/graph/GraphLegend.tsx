"use client";
import { ReactNode } from "react";
import { MONTSERRAT, NODE_COLOR } from "./graphTheme";

// Legend chips (type is shown by mark size and shape, not colour alone), the
// deprecated switch, the table toggle, and the zoom controls for the graph frame.

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1871bd]";
// Labels may wrap so the legend fits a 320 px screen without sideways scrolling
const CHIP =
  "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-700";

function Mark({ kind }: { kind: "Feedback" | "Category" | "Subcategory" | "Deprecated" | "System" }) {
  const r = { Feedback: 3.5, Subcategory: 5, Category: 6, Deprecated: 5, System: 5 }[kind];
  return (
    <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
      {kind === "Category" && <circle r={8} fill="none" stroke={NODE_COLOR.Category} strokeOpacity={0.85} strokeWidth={1.2} />}
      <circle
        r={r}
        fill={NODE_COLOR[kind]}
        stroke={kind === "Deprecated" ? "#6b7280" : "none"}
        strokeDasharray={kind === "Deprecated" ? "2.5 1.5" : undefined}
      />
    </svg>
  );
}

interface GraphLegendProps {
  zoomLevel: number;
  showDeprecated: boolean;
  onToggleDeprecated: () => void;
  showTable: boolean;
  onToggleTable: () => void;
  tableId: string;
}

export function GraphLegend({
  zoomLevel, showDeprecated, onToggleDeprecated, showTable, onToggleTable, tableId,
}: GraphLegendProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" style={{ fontFamily: MONTSERRAT }}>
      <ul className="flex flex-wrap items-center gap-2" aria-label="Legend">
        <li className={CHIP}><Mark kind="Feedback" />Feedback</li>
        <li className={CHIP}><Mark kind="Category" />Category</li>
        <li className={CHIP}><Mark kind="Subcategory" />Subcategory</li>
        <li className={CHIP} title="Not Relevant is spam, abuse or off-topic input. Unclassified means the AI was unavailable. Both are kept and filed automatically.">
          <Mark kind="System" />Not Relevant / Unclassified (filed automatically)
        </li>
      </ul>
      <button
        type="button"
        role="switch"
        aria-checked={showDeprecated}
        onClick={onToggleDeprecated}
        title="Categories and subcategories that are no longer in the active config"
        className={`${CHIP} ${FOCUS_RING} hover:border-gray-300`}
      >
        <Mark kind="Deprecated" />
        Deprecated
        <span
          aria-hidden="true"
          className={`relative h-4 w-7 rounded-full transition-colors ${showDeprecated ? "bg-[#1871bd]" : "bg-gray-500"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform ${showDeprecated ? "translate-x-3" : ""}`}
          />
        </span>
      </button>
      <span className={`${CHIP} font-medium text-gray-600`} style={{ fontFamily: MONTSERRAT }}>Zoom {zoomLevel.toFixed(1)}×</span>
      <button
        type="button"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={onToggleTable}
        className={`${CHIP} ${FOCUS_RING} ml-auto hover:border-gray-300`}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
        </svg>
        {showTable ? "Hide table" : "View as table"}
      </button>
    </div>
  );
}

// Distance one pan step moves the view, in screen pixels (buttons and Shift+arrow)
export const PAN_STEP = 60;

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 ${FOCUS_RING}`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

// Pan moves the view, so content shifts the opposite way (left reveals what is on the left)
const PAN_BUTTONS = [
  { label: "Pan left", dx: PAN_STEP, dy: 0, d: "M15 19l-7-7 7-7" },
  { label: "Pan up", dx: 0, dy: PAN_STEP, d: "M5 15l7-7 7 7" },
  { label: "Pan down", dx: 0, dy: -PAN_STEP, d: "M5 9l7 7 7-7" },
  { label: "Pan right", dx: -PAN_STEP, dy: 0, d: "M9 5l7 7-7 7" },
];

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onPan: (dx: number, dy: number) => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset, onPan }: ZoomControlsProps) {
  return (
    <>
      <div
        role="group"
        aria-label="Zoom"
        className="absolute left-3 top-3 z-10 flex flex-col divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 shadow-sm"
      >
        <ControlButton label="Zoom in" onClick={onZoomIn}>
          <path strokeLinecap="round" strokeWidth={2} d="M12 5v14M5 12h14" />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={onZoomOut}>
          <path strokeLinecap="round" strokeWidth={2} d="M5 12h14" />
        </ControlButton>
        <ControlButton label="Reset view" onClick={onReset}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </ControlButton>
      </div>
      <div
        role="group"
        aria-label="Pan"
        className="absolute bottom-3 left-3 z-10 flex divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 shadow-sm"
      >
        {PAN_BUTTONS.map(({ label, dx, dy, d }) => (
          <ControlButton key={label} label={label} onClick={() => onPan(dx, dy)}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
          </ControlButton>
        ))}
      </div>
    </>
  );
}
