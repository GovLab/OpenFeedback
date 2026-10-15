"use client";
import { KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GraphData } from "@/lib/api";
import { computeLayout, graphHeightFor } from "@/lib/graphLayout";
import { buildGraphModel, connectedTo, truncate } from "@/lib/graphModel";
import { firstNodeId, nextNodeId } from "@/lib/graphNavigation";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphDetailsPanel } from "@/components/graph/GraphDetailsPanel";
import { GraphHierarchyTable } from "@/components/graph/GraphHierarchyTable";
import { GraphLegend, ZoomControls } from "@/components/graph/GraphLegend";
import { MONTSERRAT } from "@/components/graph/graphTheme";
import { useElementWidth, usePrefersReducedMotion } from "@/components/graph/hooks";
import { useZoomPan } from "@/components/graph/useZoomPan";

interface GraphVisualizationProps {
  data: GraphData;
}

const OVERLAY_MIN_WIDTH = 720; // Below this the details panel sits under the graph
const PANEL_SPACE = 320 + 24 + 24; // Panel width, its margin, and breathing room
const EDGE_SPACE = 48;
const ZOOM_STEP = 1.3;
const TOOLTIP_CHARS = 90;
const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

// ================ Empty State Component ================
function GraphEmptyState() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-sm p-8 text-center border border-slate-200">
      <div className="text-slate-400 mb-2">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-slate-600 text-lg font-medium">No feedback data yet</p>
      <p className="text-slate-500 text-sm mt-1">Submit your first feedback to visualize the graph</p>
    </div>
  );
}

// ================ Main Component ================
export default function GraphVisualization({ data }: GraphVisualizationProps) {
  const ids = useId().replace(/:/g, "");
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rovingId, setRovingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const nodeRefs = useRef(new Map<string, SVGGElement>());
  const autoPan = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const [frameRef, width] = useElementWidth();
  const model = useMemo(() => buildGraphModel(data, showDeprecated), [data, showDeprecated]);
  const height = graphHeightFor(width, model.categories.length);
  const layout = useMemo(
    () => (width > 0 ? computeLayout(model, width, height) : null),
    [model, width, height]
  );
  const isOverlay = width >= OVERLAY_MIN_WIDTH;
  // A selection can vanish when deprecated nodes are hidden
  const selected = (selectedId && model.byId.get(selectedId)) || null;
  const highlight = useMemo(() => (selected ? connectedTo(model, selected.id) : null), [model, selected]);
  const tabStopId = (rovingId && model.byId.has(rovingId) ? rovingId : null) ?? selected?.id ?? firstNodeId(model);

  const clearSelection = useCallback(() => setSelectedId(null), []);
  const zoom = useZoomPan(width, height, clearSelection);
  const { view, panBy } = zoom;

  // Undo the automatic pan once nothing is selected
  useEffect(() => {
    if (selected || !autoPan.current) return;
    panBy(-autoPan.current);
    autoPan.current = 0;
  }, [selected, panBy]);

  // Keep the selected node clear of the overlay panel (and of the left edge)
  const keepInView = useCallback(
    (id: string) => {
      const place = layout?.nodes.get(id);
      if (!place || !isOverlay) return;
      const reach = Math.max(place.r, (layout?.labels.get(id)?.width ?? 0) / 2);
      const sx = view.k * (place.x + reach) + view.x;
      const limit = width - PANEL_SPACE;
      const dx = sx > limit ? limit - sx : sx < EDGE_SPACE ? EDGE_SPACE - sx : 0;
      if (!dx) return;
      autoPan.current += dx;
      panBy(dx);
    },
    [layout, isOverlay, view, panBy, width]
  );

  const toggleSelect = useCallback(
    (id: string) => {
      setRovingId(id);
      if (id === selectedId) return clearSelection();
      setSelectedId(id);
      keepInView(id);
    },
    [selectedId, clearSelection, keepInView]
  );

  const registerRef = useCallback((id: string, el: SVGGElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  const onNodeKeyDown = useCallback(
    (e: KeyboardEvent<SVGGElement>, id: string) => {
      if (!layout) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        return toggleSelect(id);
      }
      if (e.key === "Escape") return clearSelection();
      if (e.key === "+" || e.key === "=") return zoom.zoomBy(ZOOM_STEP);
      if (e.key === "-") return zoom.zoomBy(1 / ZOOM_STEP);
      if (e.key === "0") return zoom.reset();
      if (!NAV_KEYS.has(e.key)) return;
      e.preventDefault();
      const next = nextNodeId(model, layout, id, e.key);
      if (!next) return;
      setRovingId(next);
      nodeRefs.current.get(next)?.focus();
    },
    [layout, model, toggleSelect, clearSelection, zoom]
  );

  // Closing from the panel button hands focus back to the node it described
  const closePanel = useCallback(() => {
    if (selectedId) nodeRefs.current.get(selectedId)?.focus();
    clearSelection();
  }, [selectedId, clearSelection]);

  const resetView = useCallback(() => {
    autoPan.current = 0;
    zoom.reset();
  }, [zoom]);

  if (data.nodes.length === 0) {
    return <GraphEmptyState />;
  }

  const announcement = selected
    ? `Selected ${selected.kind.toLowerCase()}: ${truncate(selected.name, TOOLTIP_CHARS)}. ${
        selected.kind === "Feedback" ? "" : `${selected.count} feedback ${selected.count === 1 ? "item" : "items"}. `
      }Details shown.`
    : "";
  const hovered = hoverId ? model.byId.get(hoverId) : null;
  const hoverPlace = hovered && layout?.nodes.get(hovered.id);
  const isEmptyView = model.byId.size === 0;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 md:p-8">
      <div className="mb-3 md:mb-4">
        <h3 className="text-base md:text-lg text-slate-900 mb-1">Feedback Graph</h3>
        <p className="text-slate-600 text-xs md:text-sm">
          Circular visualization with Categories (outer), Subcategories (middle), and Feedback (center)
        </p>
        <p className="text-slate-600 text-xs mt-1" aria-hidden="true">
          Node size shows feedback volume. Click a node, or use the arrow keys and Enter, to see its
          connections. Esc clears. Drag to pan, scroll to zoom.
        </p>
        <p id={`${ids}-help`} className="sr-only">
          Use the arrow keys to move between nodes: left and right along a ring, up toward categories, down
          toward feedback. Press Enter or Space to select a node and show its details, and Escape to clear.
          Plus and minus zoom, zero resets the view. A table version is available from the View as table button.
        </p>
      </div>

      <GraphLegend
        zoomLevel={zoom.view.k}
        showDeprecated={showDeprecated}
        onToggleDeprecated={() => setShowDeprecated((v) => !v)}
        showTable={showTable}
        onToggleTable={() => setShowTable((v) => !v)}
        tableId={`${ids}-table`}
      />

      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
        style={{ height }}
      >
        <ZoomControls
          onZoomIn={() => zoom.zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoom.zoomBy(1 / ZOOM_STEP)}
          onReset={resetView}
        />
        {isEmptyView && (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-slate-600">
            Nothing to show. Turn on Deprecated to see retired categories.
          </p>
        )}
        {layout && !isEmptyView && (
          <GraphCanvas
            model={model}
            layout={layout}
            view={zoom.view}
            highlight={highlight}
            selectedId={selected?.id ?? null}
            tabStopId={tabStopId}
            reducedMotion={reducedMotion}
            describedBy={`${ids}-help`}
            bindSvg={zoom.bindSvg}
            pointerHandlers={zoom.handlers}
            registerRef={registerRef}
            onSelect={toggleSelect}
            onKeyDown={onNodeKeyDown}
            onHover={setHoverId}
          />
        )}
        {hovered && hoverPlace && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-30 max-w-[260px] -translate-x-1/2 -translate-y-full rounded-lg bg-[#091F2F] px-3 py-2 text-white shadow-lg"
            style={{
              left: Math.min(width - 134, Math.max(134, zoom.view.k * hoverPlace.x + zoom.view.x)),
              top: zoom.view.k * (hoverPlace.y - hoverPlace.r) + zoom.view.y - 10,
            }}
          >
            <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#51ACFF]" style={{ fontFamily: MONTSERRAT }}>
              {hovered.kind}
              {hovered.kind === "Feedback" ? "" : ` · ${hovered.count} feedback`}
            </span>
            <span className="block text-sm leading-snug">{truncate(hovered.name, TOOLTIP_CHARS)}</span>
          </div>
        )}
        {selected && isOverlay && (
          <GraphDetailsPanel node={selected} model={model} variant="overlay" onClose={closePanel} />
        )}
      </div>

      {selected && !isOverlay && (
        <GraphDetailsPanel node={selected} model={model} variant="stacked" onClose={closePanel} />
      )}
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {showTable && <GraphHierarchyTable id={`${ids}-table`} model={model} />}
    </div>
  );
}
