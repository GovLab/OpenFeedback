import { topic } from "@/lib/topic";

// This view's browser tab title (WCAG 2.4.2). React 19 hoists a <title> rendered by a
// component into the document head, so it replaces the app-wide default and follows
// the view. Renders nothing when page is null, leaving the current title alone.
export function DocumentTitle({ page }: { page: string | null }) {
  if (!page) return null;
  return <title>{`${page} | ${topic.appTitle}`}</title>;
}
