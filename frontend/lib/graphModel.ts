import { GraphData } from "@/lib/api";

// Turns the raw /api/graph payload into a hierarchy the graph can draw:
// Category <- Subcategory <- Feedback. Relationship names are ignored;
// direction is worked out from the node types so any topic config works.

export type NodeKind = "Category" | "Subcategory" | "Feedback";

export interface ModelNode {
  id: string;
  kind: NodeKind;
  name: string; // Category/Subcategory name, or the full feedback text
  count: number; // Feedback volume (1 for a feedback node)
  deprecated: boolean;
  parentId: string | null; // Subcategory -> its category
  subIds: string[]; // Category -> its subcategories; Feedback -> its subcategories
  categoryIds: string[]; // Feedback -> its categories
  feedbackIds: string[]; // Category/Subcategory -> the feedback under it
}

export interface ModelLink {
  id: string;
  source: string; // Always the child (feedback or subcategory)
  target: string; // Always the parent (subcategory or category)
}

export interface GraphModel {
  byId: Map<string, ModelNode>;
  categories: ModelNode[]; // Sorted by volume, largest first
  subcategories: ModelNode[];
  feedback: ModelNode[];
  links: ModelLink[];
}

const RANK: Record<NodeKind, number> = { Feedback: 0, Subcategory: 1, Category: 2 };
const FEEDBACK_NAME_LIMIT = 120;

function isKind(type: string): type is NodeKind {
  return type in RANK;
}

const unique = (ids: string[]) => Array.from(new Set(ids));
const byName = (a: ModelNode, b: ModelNode) => a.name.localeCompare(b.name);

export function buildGraphModel(data: GraphData, showDeprecated: boolean): GraphModel {
  const raw = data.nodes.filter(
    (n) => isKind(n.type) && (showDeprecated || !n.deprecated)
  );
  const kinds = new Map(raw.map((n) => [n.id, n.type as NodeKind]));

  // Edges collected per node before the final objects are built
  const parentOf = new Map<string, string>();
  const subsOf = new Map<string, string[]>();
  const feedbackOf = new Map<string, string[]>();
  const directCats = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, value: string) =>
    map.set(key, [...(map.get(key) || []), value]);

  data.relationships.forEach((rel) => {
    const a = kinds.get(rel.source);
    const b = kinds.get(rel.target);
    if (!a || !b || RANK[a] === RANK[b]) return;
    const [child, parent] = RANK[a] < RANK[b] ? [rel.source, rel.target] : [rel.target, rel.source];
    const childKind = kinds.get(child);
    const parentKind = kinds.get(parent);
    if (childKind === "Subcategory") {
      if (parentOf.has(child)) return; // First parent wins
      parentOf.set(child, parent);
      push(subsOf, parent, child);
    } else if (parentKind === "Subcategory") {
      push(subsOf, child, parent);
      push(feedbackOf, parent, child);
    } else {
      push(directCats, child, parent);
    }
  });

  const links: ModelLink[] = [];
  const addLink = (source: string, target: string) => {
    const id = `${source}->${target}`;
    if (!links.some((l) => l.id === id)) links.push({ id, source, target });
  };
  parentOf.forEach((cat, sub) => addLink(sub, cat));
  subsOf.forEach((subs, id) => {
    if (kinds.get(id) === "Feedback") unique(subs).forEach((s) => addLink(id, s));
  });

  const byId = new Map<string, ModelNode>();
  raw.forEach((n) => {
    const kind = n.type as NodeKind;
    const subIds = unique(subsOf.get(n.id) || []);
    const viaSubs = subIds.map((s) => parentOf.get(s)).filter((c): c is string => Boolean(c));
    const direct = directCats.get(n.id) || [];
    // Feedback with no subcategory still needs a visible link to its category
    if (kind === "Feedback" && subIds.length === 0) direct.forEach((c) => addLink(n.id, c));
    byId.set(n.id, {
      id: n.id,
      kind,
      name: (kind === "Feedback" ? n.text : n.name) || "Untitled",
      count: 0,
      deprecated: n.deprecated === true,
      parentId: parentOf.get(n.id) || null,
      subIds,
      categoryIds: kind === "Feedback" ? unique([...viaSubs, ...direct]) : [],
      feedbackIds: unique(feedbackOf.get(n.id) || []),
    });
  });

  // Category volume = unique feedback under any of its subcategories, or tagged directly
  const withCounts = new Map<string, ModelNode>();
  byId.forEach((node) => {
    if (node.kind === "Feedback") return withCounts.set(node.id, { ...node, count: 1 });
    if (node.kind === "Subcategory") {
      return withCounts.set(node.id, { ...node, count: node.feedbackIds.length });
    }
    const fromSubs = node.subIds.flatMap((s) => byId.get(s)?.feedbackIds || []);
    const direct = Array.from(directCats.entries())
      .filter(([, cats]) => cats.includes(node.id))
      .map(([fb]) => fb);
    const feedbackIds = unique([...fromSubs, ...direct]);
    withCounts.set(node.id, { ...node, feedbackIds, count: feedbackIds.length });
  });

  const all = Array.from(withCounts.values());
  return {
    byId: withCounts,
    categories: all
      .filter((n) => n.kind === "Category")
      .sort((a, b) => b.count - a.count || byName(a, b)),
    subcategories: all.filter((n) => n.kind === "Subcategory").sort(byName),
    feedback: all.filter((n) => n.kind === "Feedback"),
    links,
  };
}

// Everything that lights up when a node is selected; links are kept when both ends are lit
export function connectedTo(model: GraphModel, id: string) {
  const node = model.byId.get(id);
  const nodes = new Set<string>(node ? [id] : []);
  if (node?.kind === "Category") {
    node.subIds.forEach((s) => nodes.add(s));
    node.feedbackIds.forEach((f) => nodes.add(f));
  } else if (node?.kind === "Subcategory") {
    if (node.parentId) nodes.add(node.parentId);
    node.feedbackIds.forEach((f) => nodes.add(f));
  } else if (node) {
    node.subIds.forEach((s) => nodes.add(s));
    node.categoryIds.forEach((c) => nodes.add(c));
  }
  const links = new Set(
    model.links.filter((l) => nodes.has(l.source) && nodes.has(l.target)).map((l) => l.id)
  );
  return { nodes, links };
}

export function nameOf(model: GraphModel, id: string | null): string {
  return (id && model.byId.get(id)?.name) || "";
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6))}…`;
}

const items = (n: number) => `${n} feedback ${n === 1 ? "item" : "items"}`;

// Spoken name for each node, e.g. "Subcategory: Broken Equipment, 6 feedback items, in Maintenance"
export function accessibleName(model: GraphModel, node: ModelNode): string {
  const retired = node.deprecated ? ", deprecated" : "";
  if (node.kind === "Category") {
    const subs = node.subIds.length;
    return `Category: ${node.name}, ${items(node.count)}, ${subs} ${subs === 1 ? "subcategory" : "subcategories"}${retired}`;
  }
  if (node.kind === "Subcategory") {
    const parent = nameOf(model, node.parentId);
    return `Subcategory: ${node.name}, ${items(node.count)}${parent ? `, in ${parent}` : ""}${retired}`;
  }
  const where = node.subIds.map((s) => nameOf(model, s)).join(" and ");
  return `Feedback: ${truncate(node.name, FEEDBACK_NAME_LIMIT)}${where ? `, in ${where}` : ""}`;
}
