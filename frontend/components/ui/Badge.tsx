import { ReactNode } from "react";

// Soft pill: tinted background, darker text of the same hue (AA on its tint),
// and an optional dot so meaning never rests on colour alone.

export type BadgeTone =
  | "neutral" | "brand" | "green" | "amber" | "red" | "purple" | "indigo" | "orange" | "violet";

const TONES: Record<BadgeTone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500" },
  brand: { pill: "bg-[#1871bd]/10 text-[#0f4c81] border-[#1871bd]/25", dot: "bg-[#1871bd]" },
  green: { pill: "bg-green-50 text-green-800 border-green-200", dot: "bg-green-600" },
  amber: { pill: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  red: { pill: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-600" },
  purple: { pill: "bg-purple-50 text-purple-800 border-purple-200", dot: "bg-purple-600" },
  indigo: { pill: "bg-indigo-50 text-indigo-800 border-indigo-200", dot: "bg-indigo-600" },
  orange: { pill: "bg-orange-50 text-orange-800 border-orange-200", dot: "bg-orange-500" },
  violet: { pill: "bg-violet-50 text-violet-800 border-violet-200", dot: "bg-violet-600" },
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot = false, size = "sm", className = "", children }: BadgeProps) {
  const t = TONES[tone];
  const sizing = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`font-ui inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${sizing} ${t.pill} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
