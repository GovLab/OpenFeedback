"use client";

import { useState } from "react";
import FeedbackForm from "@/components/FeedbackForm";
import SuccessMessage from "@/components/SuccessMessage";
import Navigation from "@/components/Navigation";

export default function Home() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const handleFeedbackSubmitted = () => {
    setShowSuccess(true);
    // Auto-hide success message after 10 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 10000);
  };

  return (
    <div className="min-h-screen min-w-[320px] bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-20 min-w-[320px]">
        {/* Minimal Header - centered and clean */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Share Your Feedback
          </h1>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Help us improve by sharing your thoughts
          </p>
        </div>

        {/* Quick Instructions - Subtle and expandable */}
        <div className="mb-6">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>{showInstructions ? 'Hide' : 'How it works'}</span>
          </button>
          
          {showInstructions && (
            <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-gray-200/50 shadow-sm">
              <div className="grid gap-4 text-sm text-gray-600">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    1
                  </span>
                  <p>Share your thoughts, suggestions, or concerns about our services</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    2
                  </span>
                  <p>Answer any follow-up questions to help us understand better</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    3
                  </span>
                  <p>Submit and our team will review your feedback</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Form - The Hero */}
        <FeedbackForm 
          onFeedbackSubmitted={handleFeedbackSubmitted} 
          showClassificationResult={false}
        />

        {/* Success Message */}
        {showSuccess && <SuccessMessage onClose={() => setShowSuccess(false)} />}

        {/* Privacy Notice - Minimal footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Your feedback is confidential and helps inform our improvements. Thank you for sharing.
          </p>
        </div>
      </main>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
