"use client";
import { useEffect } from "react";
import { topic } from "@/lib/topic";

// Gives each view its own browser tab title, so people can tell pages apart
// in history and in screen reader page lists (WCAG 2.4.2)
export function useDocumentTitle(pageName: string): void {
  useEffect(() => {
    document.title = `${pageName} | ${topic.appTitle}`;
  }, [pageName]);
}
