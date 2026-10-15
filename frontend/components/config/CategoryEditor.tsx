"use client";
import { Plus, Rows3, X } from "lucide-react";
import { Category } from "@/lib/config-api";
import { buttonClass } from "@/components/ui/styles";
import { INLINE_INPUT, REMOVE_BUTTON } from "./fields";

interface CategoryEditorProps {
  categories: Category[];
  onAdd: () => void;
  onRename: (index: number, name: string) => void;
  onDelete: (index: number) => void;
  onAddSub: (index: number) => void;
  onUpdateSub: (index: number, subIndex: number, value: string) => void;
  onDeleteSub: (index: number, subIndex: number) => void;
}

export function CategoryEditor({
  categories, onAdd, onRename, onDelete, onAddSub, onUpdateSub, onDeleteSub,
}: CategoryEditorProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base text-[#091F2F]">Categories &amp; Subcategories</h3>
        <button type="button" onClick={onAdd} className={buttonClass("secondary", "sm")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Category
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {categories.map((category, catIndex) => {
          const name = category.name || "new category";
          return (
            <li key={catIndex} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Rows3 className="h-4 w-4 shrink-0 text-[#1871bd]" aria-hidden="true" />
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => onRename(catIndex, e.target.value)}
                  placeholder="Category name"
                  aria-label={`Category ${catIndex + 1} name`}
                  className={`${INLINE_INPUT} border-b-2 border-slate-500 font-semibold`}
                />
                <button
                  type="button"
                  onClick={() => onDelete(catIndex)}
                  className={REMOVE_BUTTON}
                  aria-label={`Delete category: ${name}`}
                  title="Delete category"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="ml-6">
                <ul className="mb-2 grid grid-cols-1 gap-1">
                  {category.subcategories.map((subcat, subIndex) => (
                    <li key={subIndex} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                      <input
                        type="text"
                        value={subcat}
                        onChange={(e) => onUpdateSub(catIndex, subIndex, e.target.value)}
                        placeholder="Subcategory"
                        aria-label={`Subcategory ${subIndex + 1} of ${name}`}
                        className={`${INLINE_INPUT} border-dashed border-slate-500`}
                      />
                      <button
                        type="button"
                        onClick={() => onDeleteSub(catIndex, subIndex)}
                        className={REMOVE_BUTTON}
                        aria-label={`Remove subcategory: ${subcat || "empty"}`}
                        title="Remove subcategory"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onAddSub(catIndex)}
                  className={buttonClass("ghost", "sm", "ml-2 px-2 py-1 text-xs")}
                  aria-label={`Add subcategory to ${name}`}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add subcategory
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
