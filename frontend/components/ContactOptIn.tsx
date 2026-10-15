'use client';

import { Check, Info, ShieldCheck, X } from 'lucide-react';
import { INPUT } from '@/components/ui/styles';

export type ContactChoice = 'yes' | 'no' | null;

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
}

// Which contact field a validation error belongs to, so it can be flagged
export type ContactErrorField = 'choice' | 'name' | 'method' | null;

interface ContactOptInProps {
  choice: ContactChoice;
  onChoiceChange: (choice: ContactChoice) => void;
  details: ContactDetails;
  onDetailsChange: (details: ContactDetails) => void;
  disabled: boolean;
  errorField: ContactErrorField;
  errorId: string;
}

const CHOICES = [
  { value: 'yes' as const, label: 'Yes', Icon: Check },
  { value: 'no' as const, label: 'No', Icon: X },
];

export default function ContactOptIn({
  choice, onChoiceChange, details, onDetailsChange, disabled, errorField, errorId,
}: ContactOptInProps) {
  const describe = (field: ContactErrorField) => (errorField === field ? errorId : undefined);
  const invalid = (field: ContactErrorField) => (errorField === field ? true : undefined);
  const update = (key: keyof ContactDetails, value: string) => onDetailsChange({ ...details, [key]: value });

  return (
    <div className="border-t border-slate-200 pt-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p id="contact-question" className="text-sm font-medium text-slate-900">
          Can we contact you with questions about your feedback?
          <span className="ml-1 text-[var(--text-danger)]" aria-hidden="true">*</span>
          <span className="sr-only"> (required)</span>
        </p>

        <div className="flex gap-3" role="group" aria-labelledby="contact-question" aria-describedby={describe('choice')}>
          {CHOICES.map(({ value, label, Icon }) => {
            const selected = choice === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChoiceChange(selected ? null : value)}
                disabled={disabled}
                className={`flex min-w-[6.5rem] items-center justify-center gap-2 rounded-lg border-2 px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? 'border-[#1871bd] bg-[#1871bd]/10 text-[#0f4c81]'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-[#1871bd] hover:bg-[#1871bd]/5'
                }`}
              >
                <Icon className={`h-4 w-4 ${selected ? 'text-[#1871bd]' : 'text-slate-500'}`} strokeWidth={2.5} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {choice === 'yes' && (
        <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1871bd]" aria-hidden="true" />
            Please provide your name and at least one contact method (email or phone).
          </p>
          <p className="flex items-start gap-2 text-sm text-[#091F2F]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1871bd]" aria-hidden="true" />
            We respect your privacy. We will only use your contact information to respond to your feedback.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="contactName" className="mb-1.5 block text-sm font-medium text-slate-800">
                Name <span className="text-[var(--text-danger)]" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="contactName"
                autoComplete="name"
                value={details.name}
                onChange={(e) => update('name', e.target.value)}
                disabled={disabled}
                placeholder="Your name"
                required
                aria-invalid={invalid('name')}
                aria-describedby={describe('name')}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="mb-1.5 block text-sm font-medium text-slate-800">
                Email
              </label>
              <input
                type="email"
                id="contactEmail"
                autoComplete="email"
                value={details.email}
                onChange={(e) => update('email', e.target.value)}
                disabled={disabled}
                placeholder="your.email@example.com"
                aria-invalid={invalid('method')}
                aria-describedby={describe('method')}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="contactPhone" className="mb-1.5 block text-sm font-medium text-slate-800">
                Phone Number
              </label>
              <input
                type="tel"
                id="contactPhone"
                autoComplete="tel"
                value={details.phone}
                onChange={(e) => update('phone', e.target.value)}
                disabled={disabled}
                placeholder="(555) 123-4567"
                aria-invalid={invalid('method')}
                aria-describedby={describe('method')}
                className={INPUT}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
