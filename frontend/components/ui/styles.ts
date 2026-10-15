// Shared class strings so cards, inputs and labels match the feedback graph:
// rounded-xl cards with a slate-200 border and a light shadow.

export const CARD = "rounded-xl border border-slate-200 bg-white shadow-sm";

// Small uppercase label above a value, as in the graph details panel
export const EYEBROW =
  "font-montserrat text-xs font-semibold uppercase tracking-[0.08em] text-gray-600";

export const INPUT =
  "w-full rounded-lg border border-slate-500 bg-white px-3.5 py-2.5 text-sm text-slate-900 " +
  "placeholder:text-slate-500 transition-colors " +
  "hover:border-slate-600 focus:border-[#1871bd] focus:outline-2 focus:outline-offset-0 focus:outline-[#1871bd] " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 " +
  "aria-[invalid=true]:border-[#b42318]";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors " +
  "disabled:cursor-not-allowed whitespace-nowrap";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1871bd] text-white shadow-sm hover:bg-[#091F2F] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none",
  secondary:
    "border border-slate-500 bg-white text-[#091F2F] hover:border-[#1871bd] hover:bg-[#1871bd]/5 disabled:opacity-50 disabled:hover:border-slate-500 disabled:hover:bg-white",
  ghost: "text-[#1871bd] hover:bg-[#1871bd]/10 disabled:opacity-50",
  danger: "bg-[#b42318] text-white shadow-sm hover:bg-[#8f1c13] disabled:opacity-50",
  dangerGhost: "text-[#b42318] hover:bg-red-50 disabled:opacity-50",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}

// Square icon-only button. Always pair it with an aria-label.
export const ICON_BUTTON =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors " +
  "hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50";
