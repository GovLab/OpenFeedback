"use client";
import { KeyboardEvent, PointerEvent, useId } from "react";
import { GraphLayout } from "@/lib/graphLayout";
import { GraphModel, ModelNode, accessibleName } from "@/lib/graphModel";
import { GraphNodeMark } from "./GraphNodeMark";
import {
  DIM_OPACITY, ENTRANCE, LABEL_COLOR, LINK_ACTIVE, LINK_COLOR, MONTSERRAT, NODE_COLOR,
} from "./graphTheme";
import { View } from "./useZoomPan";

// The SVG drawing: calm links, flowing particles on the selection, nodes and
// always-visible labels. Nodes are real focusable elements (see GraphNodeMark).

export interface Highlight {
  nodes: Set<string>;
  links: Set<string>;
}

interface GraphCanvasProps {
  model: GraphModel;
  layout: GraphLayout;
  view: View;
  highlight: Highlight | null;
  selectedId: string | null;
  tabStopId: string | null;
  reducedMotion: boolean;
  describedBy: string;
  bindSvg: (el: SVGSVGElement | null) => void;
  pointerHandlers: {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  registerRef: (id: string, el: SVGGElement | null) => void;
  onSelect: (id: string) => void;
  onKeyDown: (e: KeyboardEvent<SVGGElement>, id: string) => void;
  onHover: (id: string | null) => void;
}

const PARTICLES_PER_LINK = 2;
const PARTICLE_SECONDS = 1.6;
const MAX_PARTICLE_LINKS = 60;

function entranceDelay(model: GraphModel, node: ModelNode, order: number): number {
  if (node.kind === "Category") return order * ENTRANCE.categoryStep;
  if (node.kind === "Subcategory") return ENTRANCE.subcategoryStart + order * ENTRANCE.subcategoryStep;
  const step = Math.min(20, ENTRANCE.feedbackSpan / Math.max(1, model.feedback.length));
  return ENTRANCE.feedbackStart + order * step;
}

function GradientDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      {Object.entries(NODE_COLOR).map(([kind, color]) => (
        <radialGradient key={kind} id={`${prefix}-${kind}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity={0.92} />
        </radialGradient>
      ))}
    </defs>
  );
}

export function GraphCanvas({
  model, layout, view, highlight, selectedId, tabStopId, reducedMotion, describedBy,
  bindSvg, pointerHandlers, registerRef, onSelect, onKeyDown, onHover,
}: GraphCanvasProps) {
  const prefix = useId().replace(/:/g, "");
  const nodes = [...model.categories, ...model.subcategories, ...model.feedback];
  const delays = new Map(
    nodes.map((n) => [n.id, entranceDelay(model, n, layout.nodes.get(n.id)?.order ?? 0)])
  );
  const isLit = (id: string) => !highlight || highlight.nodes.has(id);
  const activeLinks = highlight ? model.links.filter((l) => highlight.links.has(l.id)) : [];
  const camera = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;

  return (
    <svg
      ref={bindSvg}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="og-graph block touch-none select-none"
      role="group"
      aria-label="Feedback network graph"
      aria-describedby={describedBy}
      {...pointerHandlers}
    >
      <GradientDefs prefix={prefix} />
      <rect data-graph-bg="" width={layout.width} height={layout.height} fill="transparent" />
      <g
        className={`og-camera ${view.smooth && !reducedMotion ? "og-camera-smooth" : ""}`}
        style={{ transform: camera, transformOrigin: "0 0" }}
      >
        <g aria-hidden="true">
          {model.links.map((link) => {
            const a = layout.nodes.get(link.source);
            const b = layout.nodes.get(link.target);
            if (!a || !b) return null;
            const isActive = highlight?.links.has(link.id) ?? false;
            const delay = Math.max(delays.get(link.source) ?? 0, delays.get(link.target) ?? 0) + 100;
            return (
              <line
                key={link.id}
                className="og-link"
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                pathLength={1}
                stroke={isActive ? LINK_ACTIVE : LINK_COLOR}
                strokeWidth={isActive ? 2.4 : 1.2}
                strokeLinecap="round"
                style={{
                  opacity: highlight ? (isActive ? 0.9 : 0.06) : 0.4,
                  animationDelay: `${delay}ms`,
                }}
              />
            );
          })}
        </g>

        {!reducedMotion && (
          <g aria-hidden="true">
            {activeLinks.slice(0, MAX_PARTICLE_LINKS).flatMap((link) => {
              const a = layout.nodes.get(link.source);
              const b = layout.nodes.get(link.target);
              if (!a || !b) return [];
              return Array.from({ length: PARTICLES_PER_LINK }, (_, i) => {
                const begin = `${(-i * PARTICLE_SECONDS) / PARTICLES_PER_LINK}s`;
                const dur = `${PARTICLE_SECONDS}s`;
                return (
                  <circle key={`${link.id}-${i}`} r={2.6} fill={LINK_ACTIVE} cx={a.x} cy={a.y} opacity={0}>
                    <animate attributeName="cx" from={a.x} to={b.x} dur={dur} begin={begin} repeatCount="indefinite" />
                    <animate attributeName="cy" from={a.y} to={b.y} dur={dur} begin={begin} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur={dur} begin={begin} repeatCount="indefinite" />
                  </circle>
                );
              });
            })}
          </g>
        )}

        <g>
          {nodes.map((node) => {
            const place = layout.nodes.get(node.id);
            if (!place) return null;
            return (
              <GraphNodeMark
                key={node.id}
                node={node}
                place={place}
                gradientId={`${prefix}-${node.deprecated ? "Deprecated" : node.kind}`}
                label={accessibleName(model, node)}
                isSelected={node.id === selectedId}
                isDimmed={!isLit(node.id)}
                isTabStop={node.id === tabStopId}
                delayMs={delays.get(node.id) ?? 0}
                registerRef={registerRef}
                onSelect={onSelect}
                onKeyDown={onKeyDown}
                onHover={onHover}
              />
            );
          })}
        </g>

        <g aria-hidden="true" className="pointer-events-none">
          {nodes.map((node) => {
            const label = layout.labels.get(node.id);
            if (!label) return null;
            const isCategory = node.kind === "Category";
            const tone = node.deprecated ? "Deprecated" : node.kind;
            return (
              <text
                key={node.id}
                className="og-label"
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="hanging"
                fill={LABEL_COLOR[tone]}
                style={{
                  font: `${node.deprecated ? "italic " : ""}${isCategory ? 700 : 600} ${label.fontSize}px ${MONTSERRAT}`,
                  opacity: isLit(node.id) ? 1 : DIM_OPACITY + 0.05,
                  animationDelay: `${(delays.get(node.id) ?? 0) + 250}ms`,
                }}
              >
                {label.lines.map((line, i) => (
                  <tspan key={i} x={label.x} dy={i === 0 ? 0 : label.lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
