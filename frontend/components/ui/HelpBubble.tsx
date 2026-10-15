"use client";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

// "?" button that shows a short guide. Opens on hover, or on click / Enter /
// Space for keyboard and touch users; Escape, an outside click or tabbing away
// closes it. The guide stays open while the pointer is over it.

const CLOSE_DELAY_MS = 150;

interface HelpBubbleProps {
  title: string;
  width?: "md" | "lg";
  children: ReactNode;
}

export function HelpBubble({ title, width = "md", children }: HelpBubbleProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => cancelClose, []);

  const widthClass = width === "lg" ? "sm:w-[28rem]" : "sm:w-96";
  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#1871bd] transition-colors hover:bg-[#1871bd]/10 hover:text-[#091F2F]"
      >
        <CircleHelp className="h-5 w-5" aria-hidden="true" />
      </button>
      <div
        id={id}
        role="region"
        aria-label={title}
        hidden={!open}
        className={`animate-fadeIn absolute left-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] ${widthClass} rounded-xl border border-slate-200 bg-white p-5 text-left shadow-lg sm:left-full sm:top-[-0.5rem] sm:mt-0 sm:ml-3`}
      >
        <h3 className="mb-3 text-sm text-[#091F2F]">{title}</h3>
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
      </div>
    </div>
  );
}
