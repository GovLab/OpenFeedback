"use client";
import { useEffect, useState } from "react";
import { getStaffTokenExpiry } from "@/lib/http";

// Warn staff this long before the session ends, so unsaved work can be saved (WCAG 2.2.1)
const WARN_BEFORE_MS = 10 * 60 * 1000;
const CHECK_EVERY_MS = 30 * 1000;
const MS_PER_MINUTE = 60 * 1000;

export default function SessionExpiryNotice() {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    const check = () => {
      const expiresAt = getStaffTokenExpiry();
      const msLeft = expiresAt === null ? 0 : expiresAt - Date.now();
      setMinutesLeft(msLeft > 0 && msLeft <= WARN_BEFORE_MS ? Math.ceil(msLeft / MS_PER_MINUTE) : null);
    };
    check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (minutesLeft === null) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
    >
      Your staff session ends in about {minutesLeft} {minutesLeft === 1 ? "minute" : "minutes"}. Save your
      changes before then. If it ends, you can sign in again and carry on where you left off.
    </div>
  );
}
