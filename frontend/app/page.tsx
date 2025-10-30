"use client";

import { useState } from "react";
import FeedbackForm from "@/components/FeedbackForm";
import SuccessMessage from "@/components/SuccessMessage";
import Navigation from "@/components/Navigation";

export default function Home() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFeedbackSubmitted = () => {
    setShowSuccess(true);
    // Auto-hide success message after 10 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 10000);
  };

  return (
    <div className="min-h-screen min-w-[320px] bg-slate-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-10 min-w-[320px]">
        {/* Minimal Header - centered and clean */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-2 tracking-tight">
            Share Your Thoughts
          </h1>
          <p className="text-base text-slate-600">
            Help us improve our services
          </p>
        </div>

        {/* Form - The Hero */}
        <FeedbackForm 
          onFeedbackSubmitted={handleFeedbackSubmitted} 
          showClassificationResult={false}
        />

        {/* Success Message */}
        {showSuccess && <SuccessMessage onClose={() => setShowSuccess(false)} />}

      </main>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
