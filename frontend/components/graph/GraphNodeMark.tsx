"use client";
import { KeyboardEvent, memo } from "react";
import { NodePlacement, textWidth } from "@/lib/graphLayout";
import { ModelNode } from "@/lib/graphModel";
import { BADGE_FILL, DIM_OPACITY, FOCUS_COLOR, LINK_ACTIVE, MONTSERRAT, NODE_COLOR } from "./graphTheme";

// One focusable node: gradient circle, count badge, selection halo and focus ring.
// Type is shown by size and shape as well as colour: categories are the largest
// and carry an outer ring, feedback dots have no badge, deprecated nodes are dashed.

interface GraphNodeMarkProps {
  node: ModelNode;
  place: NodePlacement;
  gradientId: string;
  label: string;
  isSelected: boolean;
  isDimmed: boolean;
  isTabStop: boolean;
  delayMs: number;
  registerRef: (id: string, el: SVGGElement | null) => void;
  onSelect: (id: string) => void;
  onKeyDown: (e: KeyboardEvent<SVGGElement>, id: string) => void;
  onHover: (id: string | null) => void;
}

const MIN_HIT_RADIUS = 11; // Bigger click target for small feedback dots

function CountBadge({ count, r, isCategory }: { count: number; r: number; isCategory: boolean }) {
  const fontSize = isCategory ? 12 : 11;
  const radius = isCategory ? 11.5 : 10;
  const width = Math.max(radius * 2, textWidth(String(count), fontSize, 700) + 10);
  const offset = r * 0.72;
  return (
    <g transform={`translate(${offset} ${-offset})`} aria-hidden="true">
      <rect
        x={-width / 2}
        y={-radius}
        width={width}
        height={radius * 2}
        rx={radius}
        fill={BADGE_FILL}
        stroke="#fff"
        strokeWidth={2}
      />
      <text
        textAnchor="middle"
        dy="0.36em"
        fill="#fff"
        style={{ font: `700 ${fontSize}px ${MONTSERRAT}` }}
      >
        {count}
      </text>
    </g>
  );
}

function GraphNodeMarkInner({
  node, place, gradientId, label, isSelected, isDimmed, isTabStop, delayMs,
  registerRef, onSelect, onKeyDown, onHover,
}: GraphNodeMarkProps) {
  const { r } = place;
  const isCategory = node.kind === "Category";
  const color = node.deprecated ? NODE_COLOR.Deprecated : NODE_COLOR[node.kind];
  return (
    <g
      ref={(el) => registerRef(node.id, el)}
      className="og-node"
      transform={`translate(${place.x} ${place.y})`}
      style={{ opacity: isDimmed ? DIM_OPACITY : 1 }}
      role="button"
      tabIndex={isTabStop ? 0 : -1}
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => onSelect(node.id)}
      onKeyDown={(e) => onKeyDown(e, node.id)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(null)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <g className="og-pop" style={{ animationDelay: `${delayMs}ms` }}>
        <circle r={Math.max(r + 4, MIN_HIT_RADIUS)} fill="transparent" />
        {isSelected && (
          <>
            <circle r={r + 9} fill={LINK_ACTIVE} opacity={0.16} />
            <circle r={r + 4} fill="none" stroke={LINK_ACTIVE} strokeWidth={2.5} />
          </>
        )}
        {isCategory && (
          <circle r={r + 4.5} fill="none" stroke={color} strokeOpacity={0.5} strokeWidth={1.5} />
        )}
        <circle
          r={r}
          fill={`url(#${gradientId})`}
          stroke="#fff"
          strokeWidth={2}
          strokeDasharray={node.deprecated ? "4 3" : undefined}
        />
        {node.deprecated && <circle r={r} fill="none" stroke="#6b7280" strokeWidth={1.25} strokeDasharray="4 3" />}
        {node.kind !== "Feedback" && node.count > 0 && (
          <CountBadge count={node.count} r={r} isCategory={isCategory} />
        )}
        <circle className="og-focus" r={r + 8} fill="none" stroke={FOCUS_COLOR} strokeWidth={3} />
      </g>
    </g>
  );
}

export const GraphNodeMark = memo(GraphNodeMarkInner);
