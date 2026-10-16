"use client";
import { Plus, X } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { INLINE_INPUT, REMOVE_BUTTON } from "./fields";

// Flat list of names (item types, departments, impact types, urgency levels)
interface ListEditorProps {
  title: string;
  items: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onDelete: (index: number) => void;
}

export function ListEditor({ title, items, onAdd, onUpdate, onDelete }: ListEditorProps) {
  const singular = title.slice(0, -1);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base text-[#091F2F]">{title}</h3>
        <button type="button" onClick={onAdd} className={buttonClass("secondary", "sm")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add {singular}
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
              placeholder={`${singular} name`}
              aria-label={`${singular} ${index + 1}`}
              className={`${INLINE_INPUT} border-dashed border-slate-500`}
            />
            <button
              type="button"
              onClick={() => onDelete(index)}
              className={REMOVE_BUTTON}
              aria-label={`Delete ${singular.toLowerCase()}: ${item || "empty"}`}
              title={`Delete ${singular.toLowerCase()}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
