"use client";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

// Mouse-wheel zoom around the cursor, drag-to-pan on the background, and
// button/keyboard zoom around the centre. The layout already fills the card,
// so the default view is the identity transform.

export interface View {
  k: number;
  x: number;
  y: number;
  smooth: boolean; // Animate this change (buttons, selection) rather than track the pointer
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
const IDENTITY: View = { k: 1, x: 0, y: 0, smooth: true };
const WHEEL_SPEED = 0.0015;
const DRAG_THRESHOLD = 4;

const clampK = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

function zoomAround(view: View, factor: number, px: number, py: number, smooth: boolean): View {
  const k = clampK(view.k * factor);
  const ratio = k / view.k;
  return { k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio, smooth };
}

export function useZoomPan(width: number, height: number, onBackgroundClick: () => void) {
  const [view, setView] = useState<View>(IDENTITY);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = svg.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * WHEEL_SPEED * (e.ctrlKey ? 4 : 1));
      setView((v) => zoomAround(v, factor, e.clientX - box.left, e.clientY - box.top, false));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svg]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      // Only the background pans; nodes handle their own clicks
      if (!(e.target as Element).hasAttribute("data-graph-bg")) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    },
    [view.x, view.y]
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy, smooth: false }));
  }, []);

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) onBackgroundClick();
  }, [onBackgroundClick]);

  const zoomBy = useCallback(
    (factor: number) => setView((v) => zoomAround(v, factor, width / 2, height / 2, true)),
    [width, height]
  );
  const reset = useCallback(() => setView(IDENTITY), []);
  const panBy = useCallback((dx: number) => setView((v) => ({ ...v, x: v.x + dx, smooth: true })), []);

  return {
    view,
    bindSvg: setSvg,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    zoomBy,
    reset,
    panBy,
    isDragging: () => drag.current?.moved === true,
  };
}
