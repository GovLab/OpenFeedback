"use client";
import { ConfigVersion } from "@/lib/config-api";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/styles";

interface VersionHistoryDialogProps {
  versions: ConfigVersion[];
  onClose: () => void;
  onLoad: (version: number) => void;
  onActivate: (version: number) => void;
  onDelete: (version: number) => void;
}

export function VersionHistoryDialog({ versions, onClose, onLoad, onActivate, onDelete }: VersionHistoryDialogProps) {
  return (
    <Modal title="Version History" onClose={onClose} size="lg">
      {versions.length === 0 ? (
        <p className="text-slate-600">No version history available.</p>
      ) : (
        <ul className="space-y-3">
          {versions.map((version) => (
            <li
              key={version.version}
              className={`rounded-xl border p-4 ${
                version.is_active ? "border-green-300 bg-green-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-base text-[#091F2F]">Version {version.version}</h3>
                    {version.is_active && <Badge tone="green" dot>Active</Badge>}
                  </div>
                  {version.created_at && (
                    <p className="mb-1 text-sm text-slate-600">Created: {new Date(version.created_at).toLocaleString()}</p>
                  )}
                  {version.created_by && <p className="mb-1 text-sm text-slate-600">By: {version.created_by}</p>}
                  {version.change_notes && (
                    <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{version.change_notes}</p>
                  )}
                </div>
                {!version.is_active && (
                  <div className="flex gap-2 sm:flex-col">
                    <button type="button" onClick={() => onLoad(version.version)} className={buttonClass("secondary", "sm")}
                      aria-label={`Load version ${version.version}`}>
                      Load
                    </button>
                    <button type="button" onClick={() => onActivate(version.version)} className={buttonClass("primary", "sm")}
                      aria-label={`Activate version ${version.version}`}>
                      Activate
                    </button>
                    <button type="button" onClick={() => onDelete(version.version)} className={buttonClass("dangerGhost", "sm")}
                      aria-label={`Delete version ${version.version}`}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
