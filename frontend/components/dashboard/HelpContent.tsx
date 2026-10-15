import { ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { NODE_COLOR } from "@/components/graph/graphTheme";

// Guides shown in the "?" bubbles beside each dashboard section heading

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-[#1871bd]">{children}</ul>;
}

function Swatch({ color }: { color: string }) {
  return <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: color }} aria-hidden="true" />;
}

export function OverviewHelp() {
  return (
    <Bullets>
      <li>View the total number of feedback submissions received.</li>
      <li>Check how many items fall under each category (e.g., Process Issues, Communication Problems, Equity Concerns).</li>
      <li>Use this section to understand high-level trends and where most feedback is coming from.</li>
    </Bullets>
  );
}

export function BatchUploadHelp() {
  return (
    <>
      <p className="text-slate-600">Use this tool when you need to import feedback in bulk from reports, emails, or other sources.</p>
      <div>
        <p className="mb-2 font-semibold text-slate-900">Steps:</p>
        <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-[#1871bd]">
          <li>Choose a file (PDF, TXT, or DOCX, up to 10 MB).</li>
          <li>
            Select a processing option:
            <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-slate-400">
              <li><strong>Process &amp; Store</strong>: uploads and saves data to the system.</li>
              <li><strong>Classify Only</strong>: tests the file without storing results.</li>
            </ul>
          </li>
          <li>Wait for confirmation that classification is complete.</li>
          <li>The data will appear automatically in your statistics and graphs.</li>
        </ol>
      </div>
      <div className="rounded-lg border border-[#1871bd]/20 bg-[#1871bd]/5 p-3">
        <p className="flex items-center gap-1.5 font-semibold text-[#091F2F]">
          <Lightbulb className="h-4 w-4 text-[#1871bd]" aria-hidden="true" />
          Tip:
        </p>
        <p className="mt-1">Files are automatically analyzed by AI to identify feedback categories and themes.</p>
      </div>
    </>
  );
}

export function GraphHelp() {
  return (
    <>
      <p className="text-slate-600">Explore how feedback connects across categories and subtopics.</p>
      <div>
        <p className="mb-2 font-semibold text-slate-900">How to read it:</p>
        <ul className="space-y-2">
          <li><Swatch color={NODE_COLOR.Feedback} /><strong>Blue nodes</strong> = Individual feedback items</li>
          <li><Swatch color={NODE_COLOR.Category} /><strong>Green nodes</strong> = Categories</li>
          <li><Swatch color={NODE_COLOR.Subcategory} /><strong>Orange nodes</strong> = Subcategories</li>
        </ul>
      </div>
      <div>
        <p className="mb-2 font-semibold text-slate-900">You can:</p>
        <Bullets>
          <li>Click a node to highlight its connections.</li>
          <li>Drag to pan across the visualization.</li>
          <li>Use the zoom control to see more or less detail.</li>
        </Bullets>
      </div>
    </>
  );
}
