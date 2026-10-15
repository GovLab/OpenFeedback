import { CARD } from '@/components/ui/styles';

// Shown under the public form. Every claim here must stay true of the backend:
// classifier.py (OpenAI, US), feedback_pipeline.py (nothing is ever rejected),
// ContactOptIn (contact details optional) and terraform/demo (AWS us-east-1).
const NOTICE_ITEMS = [
  'An AI service (OpenAI, based in the United States) reads your feedback to sort it into topics, suggest how urgent it is and write a short summary. It may ask you one or two follow-up questions.',
  'AI never deletes or rejects feedback. Every item is kept, and a person reviews it and can change anything the AI suggested.',
  'Your feedback is not used to train AI models.',
  'Contact details are optional. If you share them, they are only used to reply to you about your feedback.',
  'Your feedback is stored on secure servers in the United States.',
];

export default function PrivacyNotice() {
  return (
    <section aria-labelledby="privacy-notice-heading" className={`${CARD} mt-6 p-6`}>
      <h2 id="privacy-notice-heading" className="mb-3 text-lg text-[#091F2F]">
        How we use your feedback
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
        {NOTICE_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-medium text-slate-800">
        This is a demonstration site with sample data. Please do not include real personal information.
      </p>
    </section>
  );
}
