import { ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { CARD } from "./styles";

// Loading, empty and error placeholders, so every list looks the same
// while it has nothing to show.

interface StateMessageProps {
  kind: "loading" | "empty" | "error";
  title: string;
  detail?: string;
  icon?: ReactNode;
  action?: ReactNode;
  bare?: boolean; // Inside an existing card: no border or shadow
}

export function StateMessage({ kind, title, detail, icon, action, bare = false }: StateMessageProps) {
  const role = kind === "error" ? "alert" : kind === "loading" ? "status" : undefined;
  const glyph =
    kind === "loading" ? (
      <LoaderCircle className="h-8 w-8 text-[#1871bd] motion-safe:animate-spin" aria-hidden="true" />
    ) : kind === "error" ? (
      <CircleAlert className="h-8 w-8 text-[#b42318]" aria-hidden="true" />
    ) : (
      icon
    );
  return (
    <div role={role} className={`${bare ? "" : CARD} px-6 py-12 text-center`}>
      {glyph && <div className="mb-3 flex justify-center text-slate-400">{glyph}</div>}
      <p className="font-medium text-slate-800">{title}</p>
      {detail && <p className="mt-1 text-sm text-slate-600">{detail}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
