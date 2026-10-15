import { GraphModel, ModelNode } from "@/lib/graphModel";

// Label placement for category and subcategory nodes. Each label tries a few
// spots around its node (below, above, right, left) and takes the first that
// doesn't cover another label or node; a short nudge pass settles the rest.

export interface LabelPlacement {
  x: number; // Centre of the text
  y: number; // Top of the first line
  lines: string[];
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
}

export interface LabelOptions {
  width: number;
  height: number;
  catFont: number;
  subFont: number;
  catLabelMax: number;
  subLabelMax: number;
}

interface Circle { x: number; y: number; r: number }
interface Box { x0: number; y0: number; x1: number; y1: number }

const GAP = 6;
const BADGE_ROOM = 12; // The count badge sits up and to the right of each node
const NUDGE_PASSES = 30;
const MAX_LINES = 3;
const FEEDBACK_WEIGHT = 0.15; // Covering a feedback dot is allowed, but avoided
const CHAR_WIDTH = { 600: 0.58, 700: 0.62 }; // Montserrat average glyph width in em

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function textWidth(text: string, fontSize: number, weight: 600 | 700): number {
  return text.length * fontSize * CHAR_WIDTH[weight];
}

function wrapLabel(text: string, fontSize: number, weight: 600 | 700, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  text.split(/\s+/).forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && textWidth(candidate, fontSize, weight) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  const kept = lines.length > MAX_LINES
    ? [...lines.slice(0, MAX_LINES - 1), lines.slice(MAX_LINES - 1).join(" ")]
    : lines;
  const maxChars = Math.floor(maxWidth / (fontSize * CHAR_WIDTH[weight]));
  return kept.map((l) => (l.length > maxChars ? `${l.slice(0, maxChars - 1).trimEnd()}…` : l));
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

function nodeBox(c: Circle): Box {
  return { x0: c.x - c.r - 2, y0: c.y - c.r - BADGE_ROOM, x1: c.x + c.r + BADGE_ROOM, y1: c.y + c.r + 2 };
}

function labelBox(x: number, y: number, w: number, h: number): Box {
  return { x0: x - w / 2 - 3, y0: y - 1, x1: x + w / 2 + 3, y1: y + h + 1 };
}

export function placeLabels(
  model: GraphModel,
  circles: Map<string, Circle>,
  o: LabelOptions
): Map<string, LabelPlacement> {
  const labelled = [...model.categories, ...[...model.subcategories].sort((a, b) => b.count - a.count)]
    .filter((n) => circles.has(n.id));
  const nodeBoxes = labelled.map((n) => ({ id: n.id, box: nodeBox(circles.get(n.id)!) }));
  const dotBoxes = model.feedback
    .map((f) => circles.get(f.id))
    .filter((c): c is Circle => !!c)
    .map(nodeBox);

  const placed: { id: string; box: Box; label: LabelPlacement; fixed: boolean }[] = [];
  labelled.forEach((n: ModelNode) => {
    const c = circles.get(n.id)!;
    const isCat = n.kind === "Category";
    const fontSize = isCat ? o.catFont : o.subFont;
    const weight = isCat ? 700 : 600;
    const lines = wrapLabel(n.name, fontSize, weight, isCat ? o.catLabelMax : o.subLabelMax);
    const lineHeight = fontSize * 1.2;
    const width = Math.max(...lines.map((l) => textWidth(l, fontSize, weight)));
    const height = lines.length * lineHeight;
    const fit = (x: number, y: number) => ({
      x: clamp(x, width / 2 + 4, o.width - width / 2 - 4),
      y: clamp(y, 2, o.height - height - 2),
    });
    const below = fit(c.x, c.y + c.r + GAP);
    const above = fit(c.x, c.y - c.r - BADGE_ROOM - GAP - height);
    const right = fit(c.x + c.r + BADGE_ROOM + GAP + width / 2, c.y - height / 2);
    const left = fit(c.x - c.r - GAP - width / 2, c.y - height / 2);
    // Category labels prefer the outside of the ring, away from the crowd
    const isRightHalf = c.x >= o.width / 2;
    const candidates = isCat
      ? [below, isRightHalf ? right : left, above, isRightHalf ? left : right]
      : [below, above, right, left];
    const score = (p: { x: number; y: number }) => {
      const box = labelBox(p.x, p.y, width, height);
      const hard =
        placed.reduce((s, q) => s + overlap(box, q.box), 0) +
        nodeBoxes.reduce((s, q) => s + overlap(box, q.box), 0);
      const soft = dotBoxes.reduce((s, d) => s + overlap(box, d), 0) * FEEDBACK_WEIGHT;
      return hard + soft;
    };
    // Below is preferred; another side only wins when it is clearly better
    const scored = candidates.map((p, i) => ({ p, s: score(p) + i * 4 }));
    const best = scored.reduce((a, b) => (b.s < a.s ? b : a)).p;
    placed.push({
      id: n.id,
      fixed: isCat,
      box: labelBox(best.x, best.y, width, height),
      label: { x: best.x, y: best.y, lines, fontSize, lineHeight, width, height },
    });
  });

  // Nudge whatever still overlaps apart vertically; category labels win against subcategory ones
  for (let pass = 0; pass < NUDGE_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        if (!overlap(a.box, b.box)) continue;
        moved = true;
        const dy = Math.min(a.box.y1, b.box.y1) - Math.max(a.box.y0, b.box.y0) + 1;
        const dir = a.label.y <= b.label.y ? 1 : -1;
        const shareA = a.fixed === b.fixed ? 0.5 : a.fixed ? 0 : 1;
        placed[i] = shift(a, -dir * dy * shareA, o.height);
        placed[j] = shift(b, dir * dy * (1 - shareA), o.height);
      }
    }
    if (!moved) break;
  }
  return new Map(placed.map((p) => [p.id, p.label]));
}

function shift<T extends { box: Box; label: LabelPlacement }>(p: T, dy: number, maxY: number): T {
  const y = clamp(p.label.y + dy, 2, maxY - p.label.height - 2);
  const d = y - p.label.y;
  return {
    ...p,
    box: { ...p.box, y0: p.box.y0 + d, y1: p.box.y1 + d },
    label: { ...p.label, y },
  };
}
