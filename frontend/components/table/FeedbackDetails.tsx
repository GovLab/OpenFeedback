import { ReactNode } from "react";
import { Building2, FileText, Info, Mail, Phone, Sparkles, Tag, TriangleAlert, User } from "lucide-react";
import { FeedbackRecord } from "@/lib/api";
import { topic } from "@/lib/topic";
import { Badge } from "@/components/ui/Badge";
import { EYEBROW } from "@/components/ui/styles";
import { shortDate } from "./tableUtils";

// Expanded view of one feedback row: the original text, its classification,
// the AI summary, system details and (when the resident opted in) contact info.

const PANEL = "rounded-xl border border-slate-200 bg-white p-4";

function PanelTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h4 className={`${EYEBROW} mb-3 flex items-center gap-1.5`}>
      <span className="text-[#1871bd]" aria-hidden="true">{icon}</span>
      {children}
    </h4>
  );
}

function Tile({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1871bd]/10 text-[#1871bd]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-ui text-[11px] font-semibold text-[#0f4c81]">{label}</p>
        <div className="text-sm font-semibold break-words text-slate-900">{children}</div>
      </div>
    </div>
  );
}

function Classification({ feedback }: { feedback: FeedbackRecord }) {
  const impacts = feedback.impact_type ?? [];
  return (
    <section className={`${PANEL} lg:col-span-6`} aria-label="Classification">
      <PanelTitle icon={<Tag className="h-4 w-4" />}>Classification</PanelTitle>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Tile icon={<FileText className="h-3.5 w-3.5" />} label={topic.itemLabel}>{feedback.permit_type || "N/A"}</Tile>
        </div>
        <Tile icon={<Tag className="h-3.5 w-3.5" />} label="Category">
          {feedback.category || "N/A"}
          {feedback.subcategory && (
            <span className="block text-xs font-medium text-slate-600">
              <span aria-hidden="true">→ </span>
              <span className="sr-only">Subcategory: </span>
              {feedback.subcategory}
            </span>
          )}
        </Tile>
        <Tile icon={<Building2 className="h-3.5 w-3.5" />} label="Department">{feedback.department_predicted || "Unassigned"}</Tile>
        {impacts.length > 0 && (
          <div className="sm:col-span-2">
            <Tile icon={<TriangleAlert className="h-3.5 w-3.5" />} label="Impact">
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {impacts.map((impact) => (
                  <li key={impact}><Badge tone="brand">{impact}</Badge></li>
                ))}
              </ul>
            </Tile>
          </div>
        )}
      </div>
    </section>
  );
}

function Contact({ info }: { info: NonNullable<FeedbackRecord["user_contact_info"]> }) {
  const link = "block truncate text-sm font-medium text-[#0f4c81] underline-offset-2 hover:underline";
  return (
    <section className={`${PANEL} lg:col-span-4`} aria-label="Contact">
      <PanelTitle icon={<Mail className="h-4 w-4" />}>Contact</PanelTitle>
      <dl className="space-y-2 text-sm">
        {info.name && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <dt className="sr-only">Name</dt>
            <dd className="truncate font-semibold text-slate-900">{info.name}</dd>
          </div>
        )}
        {info.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <dt className="sr-only">Email</dt>
            <dd className="min-w-0"><a href={`mailto:${info.email}`} className={link}>{info.email}</a></dd>
          </div>
        )}
        {info.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <dt className="sr-only">Phone</dt>
            <dd className="min-w-0"><a href={`tel:${info.phone}`} className={link}>{info.phone}</a></dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function SystemInfo({ feedback, span }: { feedback: FeedbackRecord; span: string }) {
  return (
    <section className={`${PANEL} ${span}`} aria-label="System">
      <PanelTitle icon={<Info className="h-4 w-4" />}>System</PanelTitle>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 text-sm">
        <dt className="text-slate-600">Source:</dt>
        <dd className="font-medium break-words text-slate-900">{feedback.feedback_source}</dd>
        {feedback.language && (
          <>
            <dt className="text-slate-600">Lang:</dt>
            <dd className="font-medium text-slate-900">{feedback.language.toUpperCase()}</dd>
          </>
        )}
        <dt className="text-slate-600">Time:</dt>
        <dd className="font-medium text-slate-900">{shortDate(feedback.timestamp_submitted) || "N/A"}</dd>
      </dl>
    </section>
  );
}

export function FeedbackDetails({ feedback }: { feedback: FeedbackRecord }) {
  const contact = feedback.followup_opt_in && feedback.user_contact_info ? feedback.user_contact_info : null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <section className={`${PANEL} lg:col-span-6`} aria-label="Original Feedback">
          <PanelTitle icon={<FileText className="h-4 w-4" />}>Original Feedback</PanelTitle>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-900">{feedback.issue_description}</p>
        </section>
        <Classification feedback={feedback} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {feedback.ai_summary && (
          <section className={`${PANEL} border-[#1871bd]/20 bg-[#1871bd]/[0.03] ${contact ? "lg:col-span-6" : "lg:col-span-9"}`} aria-label="AI Summary">
            <PanelTitle icon={<Sparkles className="h-4 w-4" />}>AI Summary</PanelTitle>
            <p className="text-sm leading-relaxed text-slate-900 italic">{feedback.ai_summary}</p>
          </section>
        )}
        <SystemInfo
          feedback={feedback}
          span={feedback.ai_summary && contact ? "lg:col-span-2" : "lg:col-span-3"}
        />
        {contact && <Contact info={contact} />}
      </div>
    </div>
  );
}
