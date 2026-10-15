'use client';

import { CircleCheck, X } from 'lucide-react';
import { CARD, ICON_BUTTON } from '@/components/ui/styles';

interface SuccessMessageProps {
  onClose?: () => void;
}

export default function SuccessMessage({ onClose }: SuccessMessageProps) {
  return (
    <div role="status" className={`${CARD} animate-fadeIn mt-6 border-l-4 border-l-[var(--text-success)] p-6`}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-[var(--text-success)]">
          <CircleCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="mb-2 text-lg text-[#091F2F]">Thank you for your feedback!</h2>
          <p className="mb-2 text-slate-700">
            Your feedback has been successfully received and will be reviewed by our team.
            We appreciate you taking the time to help us improve our services.
          </p>
          <p className="text-sm text-slate-600">
            Your input helps us better understand and address community needs.
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className={`${ICON_BUTTON} -mt-1 -mr-2`} aria-label="Close message">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
