"use client";
import { LoaderCircle } from "lucide-react";
import { topic } from "@/lib/topic";
import { Modal } from "@/components/ui/Modal";
import { buttonClass, INPUT } from "@/components/ui/styles";

interface SaveDialogProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function SaveDialog({ notes, onNotesChange, saving, onSave, onCancel }: SaveDialogProps) {
  return (
    <Modal
      title="Save Configuration Changes"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={buttonClass("secondary")}>Cancel</button>
          <button type="button" onClick={onSave} disabled={saving} className={buttonClass("primary")}>
            {saving && <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <label htmlFor="change-notes" className="mb-3 block text-sm text-slate-700">
        This will create a new version of the configuration. Please add notes about what changed:
      </label>
      <textarea
        id="change-notes"
        data-autofocus
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={`E.g., Added new category for technology issues, updated ${topic.itemLabelPlural.toLowerCase()}...`}
        className={INPUT}
        rows={4}
      />
    </Modal>
  );
}
