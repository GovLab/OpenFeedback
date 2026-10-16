"use client";
import { GraphModel, ModelNode } from "@/lib/graphModel";
import { MONTSERRAT } from "./graphTheme";

// Table alternative to the graph: category -> subcategory -> feedback count.

interface GraphHierarchyTableProps {
  id: string;
  model: GraphModel;
}

const status = (n: ModelNode) => (n.deprecated ? " (deprecated)" : n.isSystem ? " (system)" : "");
const HEAD = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-600";

export function GraphHierarchyTable({ id, model }: GraphHierarchyTableProps) {
  const orphans = model.subcategories.filter((s) => !s.parentId);
  return (
    <div id={id} className="relative mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <caption className="sr-only">Feedback by category and subcategory</caption>
        <thead className="bg-gray-50" style={{ fontFamily: MONTSERRAT }}>
          <tr>
            <th scope="col" className={HEAD}>Category</th>
            <th scope="col" className={HEAD}>Subcategory</th>
            <th scope="col" className={`${HEAD} text-right`}>Feedback items</th>
          </tr>
        </thead>
        {model.categories.map((cat) => {
          const subs = cat.subIds
            .map((s) => model.byId.get(s))
            .filter((s): s is ModelNode => !!s)
            .sort((a, b) => b.count - a.count);
          return (
            <tbody key={cat.id} className="border-t border-gray-200">
              <tr>
                <th
                  scope="rowgroup"
                  rowSpan={subs.length + 1}
                  className="px-3 py-2 text-left align-top font-semibold text-[#065f46]"
                >
                  {cat.name}{status(cat)}
                </th>
                <td className="px-3 py-2 italic text-gray-600">All subcategories</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{cat.count}</td>
              </tr>
              {subs.map((sub) => (
                <tr key={sub.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-[#92400e]">{sub.name}{status(sub)}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{sub.count}</td>
                </tr>
              ))}
            </tbody>
          );
        })}
        {orphans.length > 0 && (
          <tbody className="border-t border-gray-200">
            {orphans.map((sub, i) => (
              <tr key={sub.id} className="border-t border-gray-100">
                {i === 0 && (
                  <th scope="rowgroup" rowSpan={orphans.length} className="px-3 py-2 text-left align-top italic text-gray-600">
                    No category
                  </th>
                )}
                <td className="px-3 py-2 text-[#92400e]">{sub.name}{status(sub)}</td>
                <td className="px-3 py-2 text-right text-gray-900">{sub.count}</td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
