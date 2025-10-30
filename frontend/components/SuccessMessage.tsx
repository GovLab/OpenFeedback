'use client';

interface SuccessMessageProps {
  onClose?: () => void;
}

export default function SuccessMessage({ onClose }: SuccessMessageProps) {
  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg 
              className="w-7 h-7 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-green-900 mb-2">
            Thank you for your feedback!
          </h3>
          <p className="text-green-800 mb-3">
            Your feedback has been successfully received and will be reviewed by our team. 
            We appreciate you taking the time to help us improve our services.
          </p>
          <p className="text-sm text-green-700">
            Your input helps us better understand and address community needs.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
            aria-label="Close message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

