"use client";
import { KeyboardEvent, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Column filter: a button that opens a single-select listbox. Arrow keys,
// Home and End move, Enter or Space picks, Escape or Tab closes. The list is
// fixed-positioned so the table's scroll box can't clip it.

const MENU_GAP = 4;
const MENU_MIN_WIDTH = 176;
const MENU_MAX_HEIGHT = 288; // max-h-72

interface FilterMenuProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  align?: "left" | "center";
  icon?: ReactNode;
  formatOption?: (option: string) => string;
}

export function FilterMenu({ label, options, value, onChange, align = "left", icon, formatOption = (o) => o }: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const choices = ["", ...options]; // "" means no filter
  const isFiltered = value !== "";

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const openMenu = () => {
    setActive(Math.max(0, choices.indexOf(value)));
    setOpen(true);
  };

  // Fixed position under (or above) the button, kept in place while the page scrolls
  const place = useCallback(() => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const rawLeft = align === "center" ? r.left + r.width / 2 - MENU_MIN_WIDTH / 2 : r.left;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - MENU_MIN_WIDTH - 8));
    const below = window.innerHeight - r.bottom;
    const flip = below < MENU_MAX_HEIGHT && r.top > below;
    setPos(flip ? { bottom: window.innerHeight - r.top + MENU_GAP, left } : { top: r.bottom + MENU_GAP, left });
  }, [align]);

  const isPlaced = pos !== null;
  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  // Focus the list once it is on screen
  useLayoutEffect(() => {
    if (open && isPlaced) listRef.current?.focus({ preventScroll: true });
  }, [open, isPlaced]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!listRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Keep the active option visible by scrolling the list only, never the page
  useEffect(() => {
    const list = listRef.current;
    const option = open ? document.getElementById(`${id}-opt-${active}`) : null;
    if (!list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [active, open, id, pos]);

  const pick = (choice: string) => {
    onChange(choice);
    close(true);
  };

  const onListKeyDown = (e: KeyboardEvent) => {
    const last = choices.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      return setActive(moves[e.key]);
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      return pick(choices[active]);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      return close(true);
    }
    if (e.key === "Tab") close(false);
  };

  const onButtonKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`Filter by ${label}${isFiltered ? `, currently ${formatOption(value)}` : ""}`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={`font-ui inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold whitespace-nowrap transition-colors ${
          align === "center" ? "mx-auto" : "-mx-2"
        } ${isFiltered ? "bg-[#1871bd] text-white hover:bg-[#091F2F]" : "text-slate-700 hover:bg-slate-200/70 hover:text-[#091F2F]"}`}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && pos && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={`${label} filter`}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKeyDown}
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, minWidth: MENU_MIN_WIDTH }}
          className="animate-fadeIn fixed z-[55] max-h-72 max-w-xs overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg focus:outline-none"
        >
          {choices.map((choice, i) => {
            const selected = choice === value;
            return (
              <li
                key={choice || "__all"}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                onClick={() => pick(choice)}
                onMouseMove={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                  i === active ? "bg-[#1871bd]/10 shadow-[inset_3px_0_0_#1871bd]" : ""
                } ${selected ? "font-semibold text-[#0f4c81]" : "text-slate-700"} ${i === 0 ? "border-b border-slate-200" : ""}`}
              >
                <span>{choice ? formatOption(choice) : "Show all"}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
