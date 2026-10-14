import { GraphLayout } from "@/lib/graphLayout";
import { GraphModel, ModelNode } from "@/lib/graphModel";

// Arrow-key movement through the graph:
//   Left / Right  previous / next node on the same ring, clockwise from 12 o'clock
//   Up            outward (feedback -> subcategory -> category)
//   Down          inward (category -> subcategory -> feedback)
//   Home / End    first / last node on the ring

const TURN = 2 * Math.PI;

function clockwise(layout: GraphLayout, nodes: ModelNode[]): ModelNode[] {
  const pos = (n: ModelNode) => {
    const a = layout.nodes.get(n.id)?.angle ?? 0;
    return (((a + Math.PI / 2) % TURN) + TURN) % TURN;
  };
  return [...nodes].sort((a, b) => pos(a) - pos(b));
}

function ringOf(model: GraphModel, node: ModelNode): ModelNode[] {
  if (node.kind === "Category") return model.categories;
  if (node.kind === "Subcategory") return model.subcategories;
  return model.feedback;
}

export function firstNodeId(model: GraphModel): string | null {
  return (model.categories[0] || model.subcategories[0] || model.feedback[0])?.id ?? null;
}

export function nextNodeId(
  model: GraphModel,
  layout: GraphLayout,
  currentId: string,
  key: string
): string | null {
  const node = model.byId.get(currentId);
  if (!node) return firstNodeId(model);
  const ring = clockwise(layout, ringOf(model, node));
  const index = ring.findIndex((n) => n.id === node.id);
  const step = (delta: number) => ring[(index + delta + ring.length) % ring.length]?.id ?? null;

  switch (key) {
    case "ArrowRight":
      return step(1);
    case "ArrowLeft":
      return step(-1);
    case "Home":
      return ring[0]?.id ?? null;
    case "End":
      return ring[ring.length - 1]?.id ?? null;
    case "ArrowUp":
      if (node.kind === "Feedback") return node.subIds[0] ?? node.categoryIds[0] ?? null;
      return node.kind === "Subcategory" ? node.parentId : null;
    case "ArrowDown": {
      const children = node.kind === "Category" ? node.subIds : node.feedbackIds;
      if (node.kind === "Feedback") return null;
      const inner = clockwise(
        layout,
        children.map((id) => model.byId.get(id)).filter((n): n is ModelNode => !!n)
      );
      return inner[0]?.id ?? null;
    }
    default:
      return null;
  }
}
