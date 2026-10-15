"use client";
import { useEffect } from "react";
import { topic } from "@/lib/topic";

// Gives each view its own browser tab title, so people can tell pages apart
// in history and in screen reader page lists (WCAG 2.4.2). Pass null to leave
// the title alone.
export function useDocumentTitle(pageName: string | null): void {
  useEffect(() => {
    if (pageName) document.title = `${pageName} | ${topic.appTitle}`;
  }, [pageName]);
}
