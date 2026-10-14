import { LabelPlacement, placeLabels, textWidth } from "@/lib/graphLabels";
import { GraphModel, ModelNode, NodeKind } from "@/lib/graphModel";

export { textWidth };
export type { LabelPlacement };

// Deterministic radial layout on an ellipse sized to the container:
// categories on the outer ring (largest first, from 12 o'clock), subcategories
// fanned around their parent on a middle ring, feedback in the centre near its
// subcategories. Same data + same size always gives the same picture.

export interface NodePlacement {
  x: number;
  y: number;
  r: number;
  angle: number; // Around the centre, used for keyboard order
  order: number; // Entrance order within its ring
}


export interface GraphLayout {
  width: number;
  height: number;
  cx: number;
  cy: number;
  nodes: Map<string, NodePlacement>;
  labels: Map<string, LabelPlacement>;
}

const DEG = Math.PI / 180;
const MAX_FAN_GAP = 25 * DEG;
const MID_RING = { x: 0.66, y: 0.62 };
const FEEDBACK_PULL = 0.42;
const LABEL_GAP = 7;
const FEEDBACK_RELAX_PASSES = 24;
const SUB_RELAX_PASSES = 20;
const CROWDED_RING = 8; // More categories than this get smaller type and a taller card
const SUB_SPACING = 16; // Room between neighbouring subcategories for their badges

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));


// Graph height for a given card width: wide screens get a landscape ellipse,
// narrow ones taller, and very busy configs a little extra room
export function graphHeightFor(width: number, categoryCount = 0): number {
  const base = width >= 900 ? clamp(width * 0.5, 480, 640) : clamp(width * 0.82, 420, 600);
  return base + (categoryCount > CROWDED_RING ? 80 : 0);
}

// Small seeded PRNG so feedback jitter is stable across renders
function seeded(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}


function radiusFor(kind: NodeKind, count: number, max: number, scale: number): number {
  const t = max > 0 ? Math.sqrt(count / max) : 0;
  if (kind === "Category") return (16 + 14 * t) * scale;
  if (kind === "Subcategory") return (9 + 9 * t) * scale;
  return 6 * Math.max(scale, 0.85);
}

export function computeLayout(model: GraphModel, width: number, height: number): GraphLayout {
  const scale = clamp(width / 1200, 0.72, 1);
  const crowd = model.categories.length > CROWDED_RING ? 0.9 : 1;
  const catFont = Math.max(12, 15 * scale * crowd);
  const subFont = Math.max(11, 12.5 * scale * crowd);
  // Category labels never get wider than the gap to their neighbours on the ring
  const ringGap = (Math.PI * (width + height) * 0.4) / Math.max(1, model.categories.length);
  const catLabelMax = Math.max(96, Math.min(clamp(width * 0.22, 110, 240), ringGap * 0.9));
  const subLabelMax = clamp(width * 0.16, 96, 190);
  const maxCat = Math.max(0, ...model.categories.map((c) => c.count));
  const maxSub = Math.max(0, ...model.subcategories.map((s) => s.count));

  // Fit the outer ring to the card. Categories start at 12 o'clock, so the
  // lowest one decides how far down the ellipse can reach; leave room for the
  // biggest node and its badge above, and a two-line label below.
  const step = (2 * Math.PI) / Math.max(1, model.categories.length);
  const sins = model.categories.map((_, i) => Math.sin(-Math.PI / 2 + i * step));
  const minSin = Math.min(-1, ...sins);
  const maxSin = Math.max(MID_RING.y, ...sins);
  const padX = Math.max(catLabelMax / 2, 34 * scale) + 12;
  const padTop = 34 * scale + 18;
  const padBottom = 30 * scale + LABEL_GAP + catFont * 2.4 + 10;
  const cx = width / 2;
  const rx = Math.max(60, width / 2 - padX);
  const ry = Math.max(60, (height - padTop - padBottom) / (maxSin - minSin));
  const cy = padTop - ry * minSin;
  const point = (angle: number, fx: number, fy: number) => ({
    x: cx + rx * fx * Math.cos(angle),
    y: cy + ry * fy * Math.sin(angle),
  });

  const nodes = new Map<string, NodePlacement>();
  const place = (n: ModelNode, angle: number, fx: number, fy: number, order: number, max: number) =>
    nodes.set(n.id, { ...point(angle, fx, fy), r: radiusFor(n.kind, n.count, max, scale), angle, order });

  let subOrder = 0;
  model.categories.forEach((cat, i) => {
    const angle = -Math.PI / 2 + i * step;
    place(cat, angle, 1, 1, i, maxCat);
    const subs = cat.subIds.map((id) => model.byId.get(id)).filter((s): s is ModelNode => !!s);
    const gap = subs.length > 1 ? Math.min(MAX_FAN_GAP, (step * 0.8) / (subs.length - 1)) : 0;
    subs.forEach((sub, j) => {
      place(sub, angle + (j - (subs.length - 1) / 2) * gap, MID_RING.x, MID_RING.y, subOrder++, maxSub);
    });
  });
  // Subcategories without a category spread evenly around the middle ring
  const orphans = model.subcategories.filter((s) => !nodes.has(s.id));
  orphans.forEach((sub, j) => {
    const angle = -Math.PI / 2 + ((j + 0.5) * 2 * Math.PI) / orphans.length;
    place(sub, angle, MID_RING.x, MID_RING.y, subOrder++, maxSub);
  });

  separateSubcategories(model, nodes);
  placeFeedback(model, nodes, { cx, cy, rx, ry });
  const labels = placeLabels(model, nodes, {
    width, height, catFont, subFont, catLabelMax, subLabelMax,
  });
  return { width, height, cx, cy, nodes, labels };
}

// Crowded fans (many categories, or the squashed sides of the ellipse) can
// overlap; push subcategory nodes apart until each has a little air
function separateSubcategories(model: GraphModel, nodes: Map<string, NodePlacement>) {
  const subs = model.subcategories.filter((s) => nodes.has(s.id)).map((s) => ({ id: s.id, ...nodes.get(s.id)! }));
  for (let pass = 0; pass < SUB_RELAX_PASSES; pass++) {
    for (let i = 0; i < subs.length; i++) {
      for (let j = i + 1; j < subs.length; j++) {
        const dx = subs[j].x - subs[i].x || 0.01;
        const dy = subs[j].y - subs[i].y;
        const d = Math.hypot(dx, dy);
        const min = subs[i].r + subs[j].r + SUB_SPACING;
        if (d >= min) continue;
        const push = (min - d) / 2;
        subs[i] = { ...subs[i], x: subs[i].x - (dx / d) * push, y: subs[i].y - (dy / d) * push };
        subs[j] = { ...subs[j], x: subs[j].x + (dx / d) * push, y: subs[j].y + (dy / d) * push };
      }
    }
  }
  subs.forEach(({ id, ...place }) => nodes.set(id, place));
}

interface Ellipse { cx: number; cy: number; rx: number; ry: number }

function placeFeedback(model: GraphModel, nodes: Map<string, NodePlacement>, e: Ellipse) {
  const scaleR = radiusFor("Feedback", 1, 1, Math.min(1, e.rx / 500));
  const pts = model.feedback.map((f, k) => {
    const anchors = (f.subIds.length ? f.subIds : f.categoryIds)
      .map((id) => nodes.get(id))
      .filter((p): p is NodePlacement => !!p);
    const ax = anchors.length ? anchors.reduce((s, p) => s + p.x, 0) / anchors.length : e.cx;
    const ay = anchors.length ? anchors.reduce((s, p) => s + p.y, 0) / anchors.length : e.cy;
    const rand = seeded(f.id);
    return {
      id: f.id,
      order: k,
      x: e.cx + (ax - e.cx) * FEEDBACK_PULL + (rand() - 0.5) * e.rx * 0.18,
      y: e.cy + (ay - e.cy) * FEEDBACK_PULL + (rand() - 0.5) * e.ry * 0.22,
    };
  });

  // Push overlapping dots apart and keep them inside the inner ellipse
  const minDist = scaleR * 2 + 4;
  for (let pass = 0; pass < FEEDBACK_RELAX_PASSES; pass++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x || 0.01;
        const dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        const push = (minDist - d) / 2;
        pts[i] = { ...pts[i], x: pts[i].x - (dx / d) * push, y: pts[i].y - (dy / d) * push };
        pts[j] = { ...pts[j], x: pts[j].x + (dx / d) * push, y: pts[j].y + (dy / d) * push };
      }
    }
    pts.forEach((p, i) => {
      const nx = (p.x - e.cx) / (e.rx * 0.5);
      const ny = (p.y - e.cy) / (e.ry * 0.5);
      const dist = Math.hypot(nx, ny);
      if (dist > 1) pts[i] = { ...p, x: e.cx + (p.x - e.cx) / dist, y: e.cy + (p.y - e.cy) / dist };
    });
  }
  pts.forEach((p) => {
    nodes.set(p.id, { x: p.x, y: p.y, r: scaleR, angle: Math.atan2(p.y - e.cy, p.x - e.cx), order: p.order });
  });
}
