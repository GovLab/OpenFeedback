"use client";
import { ReactNode, useEffect, useRef } from "react";
import { GraphModel, ModelNode, nameOf } from "@/lib/graphModel";
import { LABEL_COLOR, MONTSERRAT, NODE_COLOR, toneOf } from "./graphTheme";

// Details for the selected node. Overlays the right edge of the graph on wide
// cards and sits below it on narrow ones.

interface GraphDetailsPanelProps {
  node: ModelNode;
  model: GraphModel;
  variant: "overlay" | "stacked";
  onClose: () => void;
}

const KEY_STYLE = { fontFamily: MONTSERRAT };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt
        className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-gray-600"
        style={KEY_STYLE}
      >
        {label}
      </dt>
      <dd className="text-gray-800">{children}</dd>
    </div>
  );
}

function Box({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] leading-relaxed ${
        muted ? "italic text-gray-600" : ""
      }`}
    >
      {children}
    </div>
  );
}

function names(model: GraphModel, ids: string[]): ModelNode[] {
  return ids.map((id) => model.byId.get(id)).filter((n): n is ModelNode => !!n);
}

function withStatus(n: ModelNode) {
  if (n.deprecated) return `${n.name} (deprecated)`;
  return n.isSystem ? `${n.name} (system)` : n.name;
}

function Distribution({ subs, total }: { subs: ModelNode[]; total: number }) {
  if (subs.length === 0) return <Box muted>No subcategories</Box>;
  const sorted = [...subs].sort((a, b) => b.count - a.count);
  return (
    <ul className="rounded-lg border border-gray-200 divide-y divide-gray-100">
      {sorted.map((s) => (
        <li key={s.id} className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm ${s.deprecated ? "italic text-gray-600" : "text-gray-900"}`}>
              {withStatus(s)}
            </span>
            <span
              className="inline-flex min-w-[1.75rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: "#1871bd", fontFamily: MONTSERRAT }}
            >
              {s.count}
            </span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-gray-100" aria-hidden="true">
            <div
              className="h-1 rounded-full"
              style={{ width: `${total ? (s.count / total) * 100 : 0}%`, backgroundColor: NODE_COLOR.Subcategory }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DetailsBody({ node, model }: { node: ModelNode; model: GraphModel }) {
  if (node.kind === "Feedback") {
    const cats = names(model, node.categoryIds);
    const subs = names(model, node.subIds);
    return (
      <dl>
        <Field label="Content">
          <Box>
            <span className="whitespace-pre-wrap">{node.name}</span>
          </Box>
        </Field>
        <Field label={cats.length > 1 ? "Categories" : "Category"}>
          <div className="space-y-2">
            {cats.length ? cats.map((c) => <Box key={c.id}>{withStatus(c)}</Box>) : <Box muted>None</Box>}
          </div>
        </Field>
        <Field label={subs.length > 1 ? "Subcategories" : "Subcategory"}>
          <div className="space-y-2">
            {subs.length ? subs.map((s) => <Box key={s.id}>{withStatus(s)}</Box>) : <Box muted>None</Box>}
          </div>
        </Field>
      </dl>
    );
  }
  const valueClass = "text-lg leading-snug";
  if (node.kind === "Subcategory") {
    return (
      <dl>
        <Field label="Name"><p className={valueClass}>{withStatus(node)}</p></Field>
        <Field label="Parent Category">
          <p className={valueClass}>{nameOf(model, node.parentId) || "None"}</p>
        </Field>
        <Field label="Total Feedback">
          <p className={valueClass}>{plural(node.count, "item", "items")}</p>
        </Field>
      </dl>
    );
  }
  const subs = names(model, node.subIds);
  return (
    <dl>
      <Field label="Name"><p className={valueClass}>{withStatus(node)}</p></Field>
      <Field label="Total Subcategories">
        <p className={valueClass}>{plural(subs.length, "group", "groups")}</p>
      </Field>
      <Field label="Total Feedback">
        <p className={valueClass}>{plural(node.count, "item", "items")}</p>
      </Field>
      <Field label="Distribution">
        <Distribution subs={subs} total={node.count} />
      </Field>
    </dl>
  );
}

export function GraphDetailsPanel({ node, model, variant, onClose }: GraphDetailsPanelProps) {
  const ref = useRef<HTMLElement>(null);
  const tone = toneOf(node);

  // Below the graph the panel can start off-screen; bring it just into view
  useEffect(() => {
    if (variant !== "stacked") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [variant, node.id]);

  const placement =
    variant === "overlay"
      ? "absolute right-3 top-3 max-h-[calc(100%-1.5rem)] w-80 shadow-[-10px_20px_50px_-20px_rgba(9,31,47,0.4)] og-panel-in"
      : "mt-4 w-full";
  return (
    <section
      ref={ref}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      aria-labelledby="graph-details-title"
      className={`${placement} z-20 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white`}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 id="graph-details-title" className="text-lg text-gray-900">Details</h3>
          <p className="text-sm text-gray-600">Explore information</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1871bd]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <p
          className="mt-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={{ fontFamily: MONTSERRAT, color: LABEL_COLOR[tone], borderColor: `${NODE_COLOR[tone]}66` }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NODE_COLOR[tone] }} aria-hidden="true" />
          {node.kind}
          {node.deprecated ? " (deprecated)" : node.isSystem ? " (system category)" : ""}
        </p>
        {node.isSystem && (
          <p className="mt-2 text-sm text-gray-700">
            Filed automatically. Not Relevant is spam, abuse or off-topic input; Unclassified means the
            AI was unavailable. Every submission is still kept.
          </p>
        )}
        <DetailsBody node={node} model={model} />
      </div>
    </section>
  );
}
