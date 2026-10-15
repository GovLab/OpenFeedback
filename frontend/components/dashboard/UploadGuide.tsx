import { Check, Info } from "lucide-react";
import { CARD } from "@/components/ui/styles";

const FACTS = ["Supported: PDF, TXT, DOCX", "Maximum size: 10MB per file", "Automated text extraction and classification"];

export function UploadGuide() {
  return (
    <aside aria-labelledby="upload-guide-title" className={`${CARD} p-6`}>
      <h3 id="upload-guide-title" className="mb-4 flex items-center gap-2 text-base text-[#091F2F]">
        <Info className="h-5 w-5 text-[#1871bd]" aria-hidden="true" />
        File Upload Guide
      </h3>
      <ul className="space-y-3 text-sm text-slate-700">
        {FACTS.map((fact) => (
          <li key={fact} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-success)]" aria-hidden="true" />
            {fact}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-700">
        <p className="mb-2 font-medium text-slate-900">Processing Options:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-[#1871bd]">
          <li><strong>Process &amp; Store:</strong> Save results to database</li>
          <li><strong>Classify Only:</strong> Test without storing</li>
        </ul>
      </div>
    </aside>
  );
}
