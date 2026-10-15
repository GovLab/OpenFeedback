import { ReactNode } from "react";

// Heading for a dashboard section, with an optional help bubble and actions
interface SectionHeaderProps {
  title: string;
  id?: string;
  help?: ReactNode;
  actions?: ReactNode;
}

export function SectionHeader({ title, id, help, actions }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <h2 id={id} className="text-xl text-[#091F2F]">{title}</h2>
        {help}
      </div>
      {actions}
    </div>
  );
}
